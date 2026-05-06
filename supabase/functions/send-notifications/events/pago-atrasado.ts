// Handlers P4 (default 7 días) y P5 (default 15 días) — alquileres atrasados.
// Offset configurable por org via notificaciones_config.

import { getAdminClient } from '../lib/supabase.ts'
import { offsetsPorOrg } from '../lib/offsets.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildPagoAtrasadoEmail } from '../templates/pago-atrasado.ts'
import { describirPropiedad, haceDias } from '../lib/fechas.ts'
import type { ResultadoEvento, EventoCritico } from '../lib/types.ts'

interface PagoRow {
  id: string; organizacion_id: string; contrato_id: string; monto_esperado: number; fecha_vencimiento: string;
  contratos: {
    inquilino_id: string | null; coinquilino_id: string | null;
    propiedades: { propietario_id: string | null; calle: string; numero: string; piso: string | null; depto: string | null } | null;
    inquilino: { id: string; nombre: string; apellido: string } | null;
    coinquilino: { id: string; nombre: string; apellido: string } | null;
  } | null
}

async function correrPagoAtrasado(
  evento: Extract<EventoCritico, 'pago_atrasado_7' | 'pago_atrasado_15'>,
): Promise<ResultadoEvento> {
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()

  const offsets = await offsetsPorOrg(evento)
  if (offsets.length === 0) return resultado

  const porOffset = new Map<number, string[]>()
  for (const o of offsets) {
    if (!porOffset.has(o.dias)) porOffset.set(o.dias, [])
    porOffset.get(o.dias)!.push(o.organizacion_id)
  }

  for (const [diasOffset, orgIds] of porOffset) {
    const fechaTarget = haceDias(diasOffset)

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
      .eq('fecha_vencimiento', fechaTarget)
      .in('estado', ['pendiente', 'atrasado'])
      .in('organizacion_id', orgIds)

    if (error) { resultado.errores.push(`query (offset ${diasOffset}): ${error.message}`); continue }
    const pagos = (pagosRaw ?? []) as unknown as PagoRow[]
    if (pagos.length === 0) continue

    const partesIds: string[] = []
    for (const p of pagos) { const c = p.contratos; if (c?.inquilino?.id) partesIds.push(c.inquilino.id); if (c?.coinquilino?.id) partesIds.push(c.coinquilino.id); if (c?.propiedades?.propietario_id) partesIds.push(c.propiedades.propietario_id) }
    const emails = await resolverEmails(partesIds)

    const propIds = [...new Set(pagos.map((p) => p.contratos?.propiedades?.propietario_id).filter(Boolean) as string[])]
    const propietariosMap = new Map<string, { nombre: string; apellido: string }>()
    if (propIds.length > 0) { const { data: props } = await supabase.from('perfiles').select('id, nombre, apellido').in('id', propIds); for (const p of (props ?? []) as { id: string; nombre: string; apellido: string }[]) propietariosMap.set(p.id, { nombre: p.nombre, apellido: p.apellido }) }

    for (const pago of pagos) {
      const contrato = pago.contratos; if (!contrato) continue
      const propiedadStr = describirPropiedad(contrato.propiedades)
      const inquilinoNombre = contrato.inquilino ? `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`.trim() : 'el inquilino'

      const targets: { id: string; nombre: string; email: string; rol: 'inquilino' | 'admin' | 'propietario' }[] = []
      if (contrato.inquilino?.id && emails.get(contrato.inquilino.id)) targets.push({ id: contrato.inquilino.id, nombre: contrato.inquilino.nombre, email: emails.get(contrato.inquilino.id)!, rol: 'inquilino' })
      if (contrato.coinquilino?.id && emails.get(contrato.coinquilino.id)) targets.push({ id: contrato.coinquilino.id, nombre: contrato.coinquilino.nombre, email: emails.get(contrato.coinquilino.id)!, rol: 'inquilino' })
      const propId = contrato.propiedades?.propietario_id
      if (propId && emails.get(propId)) { const prop = propietariosMap.get(propId); targets.push({ id: propId, nombre: prop?.nombre ?? 'Propietario', email: emails.get(propId)!, rol: 'propietario' }) }
      for (const admin of await adminsDeOrg(pago.organizacion_id)) targets.push({ id: admin.id, nombre: admin.nombre, email: admin.email, rol: 'admin' })

      // El template usa diasAtraso para el copy. Si offset >= 15 lo trata como crítico.
      const diasAtraso = (diasOffset >= 15 ? 15 : 7) as 7 | 15

      for (const t of targets) {
        const { asunto, html } = buildPagoAtrasadoEmail({
          destinatarioNombre: t.nombre, rol: t.rol,
          inquilinoNombre: t.rol !== 'inquilino' ? inquilinoNombre : undefined,
          propiedad: propiedadStr, monto: pago.monto_esperado,
          fechaVencimiento: pago.fecha_vencimiento, diasAtraso, contratoId: pago.contrato_id,
        })
        await reservarYEnviar({
          evento, organizacion_id: pago.organizacion_id, destinatario_id: t.id,
          destinatarioEmail: t.email, contexto_unico: `pago:${pago.id}:${diasOffset}d`,
          asunto, html, metadata: { pago_id: pago.id, contrato_id: pago.contrato_id, dias_offset: diasOffset },
        }, resultado)
      }
    }
  }

  return resultado
}

export const handlePagoAtrasado7  = (): Promise<ResultadoEvento> => correrPagoAtrasado('pago_atrasado_7')
export const handlePagoAtrasado15 = (): Promise<ResultadoEvento> => correrPagoAtrasado('pago_atrasado_15')
