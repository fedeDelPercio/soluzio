// Handler P3: Pago vencido (al día siguiente del vto sin comprobante).

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildPagoVencidoEmail } from '../templates/pago-vencido.ts'
import type { ResultadoEvento } from '../lib/types.ts'
import { describirPropiedad, ayer } from '../lib/fechas.ts'

interface PagoRow {
  id:                 string
  organizacion_id:    string
  contrato_id:        string
  monto_esperado:     number
  fecha_vencimiento:  string
  contratos: {
    inquilino_id:    string | null
    coinquilino_id:  string | null
    propiedades: { calle: string; numero: string; piso: string | null; depto: string | null } | null
    inquilino:   { id: string; nombre: string; apellido: string } | null
    coinquilino: { id: string; nombre: string; apellido: string } | null
  } | null
}

export async function handlePagoVencido(): Promise<ResultadoEvento> {
  const evento = 'pago_vencido' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }

  const supabase = getAdminClient()
  const orgsHab  = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: pagosRaw, error } = await supabase
    .from('pagos')
    .select(`
      id, organizacion_id, contrato_id, monto_esperado, fecha_vencimiento,
      contratos (
        inquilino_id, coinquilino_id,
        propiedades ( calle, numero, piso, depto ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
        coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
      )
    `)
    .eq('concepto', 'alquiler')
    .eq('fecha_vencimiento', ayer())
    .in('estado', ['pendiente', 'atrasado'])

  if (error) {
    resultado.errores.push(`query pagos: ${error.message}`)
    return resultado
  }

  const pagos = (pagosRaw ?? []) as unknown as PagoRow[]
  if (pagos.length === 0) return resultado

  const partesIds: string[] = []
  for (const p of pagos) {
    const c = p.contratos
    if (c?.inquilino?.id)   partesIds.push(c.inquilino.id)
    if (c?.coinquilino?.id) partesIds.push(c.coinquilino.id)
  }
  const emails = await resolverEmails(partesIds)

  for (const pago of pagos) {
    if (!orgsHab.has(pago.organizacion_id)) continue
    const contrato = pago.contratos
    if (!contrato) continue

    const propiedadStr   = describirPropiedad(contrato.propiedades)
    const inquilinoNombre = contrato.inquilino
      ? `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`.trim()
      : 'el inquilino'

    const targets: { id: string; nombre: string; email: string; esAdmin: boolean }[] = []

    if (contrato.inquilino?.id && emails.get(contrato.inquilino.id)) {
      targets.push({ id: contrato.inquilino.id, nombre: contrato.inquilino.nombre, email: emails.get(contrato.inquilino.id)!, esAdmin: false })
    }
    if (contrato.coinquilino?.id && emails.get(contrato.coinquilino.id)) {
      targets.push({ id: contrato.coinquilino.id, nombre: contrato.coinquilino.nombre, email: emails.get(contrato.coinquilino.id)!, esAdmin: false })
    }
    for (const admin of await adminsDeOrg(pago.organizacion_id)) {
      targets.push({ id: admin.id, nombre: admin.nombre, email: admin.email, esAdmin: true })
    }

    for (const t of targets) {
      const { asunto, html } = buildPagoVencidoEmail({
        destinatarioNombre: t.nombre,
        esAdmin:            t.esAdmin,
        inquilinoNombre:    t.esAdmin ? inquilinoNombre : undefined,
        propiedad:          propiedadStr,
        monto:              pago.monto_esperado,
        fechaVencimiento:   pago.fecha_vencimiento,
        contratoId:         pago.contrato_id,
      })
      await reservarYEnviar({
        evento,
        organizacion_id:   pago.organizacion_id,
        destinatario_id:   t.id,
        destinatarioEmail: t.email,
        contexto_unico:    `pago:${pago.id}`,
        asunto, html,
        metadata:          { pago_id: pago.id, contrato_id: pago.contrato_id },
      }, resultado)
    }
  }

  return resultado
}
