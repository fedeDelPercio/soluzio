// Handlers P4 (+7) y P5 (+15) — alquileres no pagados N días después del vto.
// Destinatarios: Inquilino + Admin + Propietario.

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildPagoAtrasadoEmail } from '../templates/pago-atrasado.ts'
import { describirPropiedad, haceDias } from '../lib/fechas.ts'
import type { ResultadoEvento, EventoCritico } from '../lib/types.ts'

interface PagoRow {
  id:                 string
  organizacion_id:    string
  contrato_id:        string
  monto_esperado:     number
  fecha_vencimiento:  string
  contratos: {
    inquilino_id:    string | null
    coinquilino_id:  string | null
    propiedades: { propietario_id: string | null; calle: string; numero: string; piso: string | null; depto: string | null } | null
    inquilino:   { id: string; nombre: string; apellido: string } | null
    coinquilino: { id: string; nombre: string; apellido: string } | null
  } | null
}

async function correrPagoAtrasado(
  evento: Extract<EventoCritico, 'pago_atrasado_7' | 'pago_atrasado_15'>,
  diasAtraso: 7 | 15,
): Promise<ResultadoEvento> {
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()
  const orgsHab  = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const fechaVto = haceDias(diasAtraso)

  const { data: pagosRaw, error } = await supabase
    .from('pagos')
    .select(`
      id, organizacion_id, contrato_id, monto_esperado, fecha_vencimiento,
      contratos (
        inquilino_id, coinquilino_id,
        propiedades ( propietario_id, calle, numero, piso, depto ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
        coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
      )
    `)
    .eq('concepto', 'alquiler')
    .eq('fecha_vencimiento', fechaVto)
    .in('estado', ['pendiente', 'atrasado'])

  if (error) {
    resultado.errores.push(`query pagos: ${error.message}`)
    return resultado
  }
  const pagos = (pagosRaw ?? []) as unknown as PagoRow[]
  if (pagos.length === 0) return resultado

  // Recolectar IDs de partes (inquilinos/coinquilinos/propietarios)
  const partesIds: string[] = []
  for (const p of pagos) {
    const c = p.contratos
    if (c?.inquilino?.id)               partesIds.push(c.inquilino.id)
    if (c?.coinquilino?.id)             partesIds.push(c.coinquilino.id)
    if (c?.propiedades?.propietario_id) partesIds.push(c.propiedades.propietario_id)
  }
  const emails = await resolverEmails(partesIds)

  // Cargar nombres de propietarios
  const propIds = [...new Set(pagos.map((p) => p.contratos?.propiedades?.propietario_id).filter(Boolean) as string[])]
  const propietariosMap = new Map<string, { nombre: string; apellido: string }>()
  if (propIds.length > 0) {
    const { data: props } = await supabase.from('perfiles').select('id, nombre, apellido').in('id', propIds)
    for (const p of (props ?? []) as { id: string; nombre: string; apellido: string }[]) {
      propietariosMap.set(p.id, { nombre: p.nombre, apellido: p.apellido })
    }
  }

  for (const pago of pagos) {
    if (!orgsHab.has(pago.organizacion_id)) continue
    const contrato = pago.contratos
    if (!contrato) continue
    const propiedadStr = describirPropiedad(contrato.propiedades)
    const inquilinoNombre = contrato.inquilino
      ? `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`.trim()
      : 'el inquilino'

    const targets: { id: string; nombre: string; email: string; rol: 'inquilino' | 'admin' | 'propietario' }[] = []

    if (contrato.inquilino?.id && emails.get(contrato.inquilino.id)) {
      targets.push({ id: contrato.inquilino.id, nombre: contrato.inquilino.nombre, email: emails.get(contrato.inquilino.id)!, rol: 'inquilino' })
    }
    if (contrato.coinquilino?.id && emails.get(contrato.coinquilino.id)) {
      targets.push({ id: contrato.coinquilino.id, nombre: contrato.coinquilino.nombre, email: emails.get(contrato.coinquilino.id)!, rol: 'inquilino' })
    }
    const propId = contrato.propiedades?.propietario_id
    if (propId && emails.get(propId)) {
      const prop = propietariosMap.get(propId)
      targets.push({ id: propId, nombre: prop?.nombre ?? 'Propietario', email: emails.get(propId)!, rol: 'propietario' })
    }
    for (const admin of await adminsDeOrg(pago.organizacion_id)) {
      targets.push({ id: admin.id, nombre: admin.nombre, email: admin.email, rol: 'admin' })
    }

    for (const t of targets) {
      const { asunto, html } = buildPagoAtrasadoEmail({
        destinatarioNombre: t.nombre,
        rol:                t.rol,
        inquilinoNombre:    t.rol !== 'inquilino' ? inquilinoNombre : undefined,
        propiedad:          propiedadStr,
        monto:              pago.monto_esperado,
        fechaVencimiento:   pago.fecha_vencimiento,
        diasAtraso,
        contratoId:         pago.contrato_id,
      })
      await reservarYEnviar({
        evento,
        organizacion_id:   pago.organizacion_id,
        destinatario_id:   t.id,
        destinatarioEmail: t.email,
        contexto_unico:    `pago:${pago.id}:${diasAtraso}d`,
        asunto, html,
        metadata:          { pago_id: pago.id, contrato_id: pago.contrato_id, dias_atraso: diasAtraso },
      }, resultado)
    }
  }

  return resultado
}

export const handlePagoAtrasado7  = (): Promise<ResultadoEvento> => correrPagoAtrasado('pago_atrasado_7', 7)
export const handlePagoAtrasado15 = (): Promise<ResultadoEvento> => correrPagoAtrasado('pago_atrasado_15', 15)
