// Handler P2: Pago vence hoy (offset siempre 0).

import { getAdminClient } from '../lib/supabase.ts'
import { offsetsPorOrg } from '../lib/offsets.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildPagoVenceHoyEmail } from '../templates/pago-aviso.ts'
import { describirPropiedad, hoy } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

interface PagoRow {
  id: string; organizacion_id: string; contrato_id: string; monto_esperado: number; fecha_vencimiento: string;
  contratos: {
    inquilino_id: string | null; coinquilino_id: string | null;
    propiedades: { calle: string; numero: string; piso: string | null; depto: string | null } | null;
    inquilino: { id: string; nombre: string; apellido: string } | null;
    coinquilino: { id: string; nombre: string; apellido: string } | null;
  } | null
}

export async function handlePagoVenceHoy(): Promise<ResultadoEvento> {
  const evento = 'pago_vence_hoy' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()

  const offsets = await offsetsPorOrg(evento)
  if (offsets.length === 0) return resultado
  const orgIds = offsets.map((o) => o.organizacion_id)

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
    .eq('fecha_vencimiento', hoy())
    .eq('estado', 'pendiente')
    .in('organizacion_id', orgIds)

  if (error) { resultado.errores.push(`query: ${error.message}`); return resultado }
  const pagos = (pagosRaw ?? []) as unknown as PagoRow[]
  if (pagos.length === 0) return resultado

  const partesIds: string[] = []
  for (const p of pagos) { const c = p.contratos; if (c?.inquilino?.id) partesIds.push(c.inquilino.id); if (c?.coinquilino?.id) partesIds.push(c.coinquilino.id) }
  const emails = await resolverEmails(partesIds)

  for (const pago of pagos) {
    const contrato = pago.contratos; if (!contrato) continue
    const propiedadStr = describirPropiedad(contrato.propiedades)
    const targets: { id: string; nombre: string; email: string }[] = []
    if (contrato.inquilino?.id   && emails.get(contrato.inquilino.id))   targets.push({ id: contrato.inquilino.id,   nombre: contrato.inquilino.nombre,   email: emails.get(contrato.inquilino.id)! })
    if (contrato.coinquilino?.id && emails.get(contrato.coinquilino.id)) targets.push({ id: contrato.coinquilino.id, nombre: contrato.coinquilino.nombre, email: emails.get(contrato.coinquilino.id)! })

    for (const t of targets) {
      const { asunto, html } = buildPagoVenceHoyEmail({
        propiedad: propiedadStr, monto: pago.monto_esperado,
        fechaVencimiento: pago.fecha_vencimiento, contratoId: pago.contrato_id,
      })
      await reservarYEnviar({
        evento, organizacion_id: pago.organizacion_id, destinatario_id: t.id,
        destinatarioEmail: t.email, contexto_unico: `pago:${pago.id}:hoy`,
        asunto, html, metadata: { pago_id: pago.id, contrato_id: pago.contrato_id },
      }, resultado)
    }
  }

  return resultado
}
