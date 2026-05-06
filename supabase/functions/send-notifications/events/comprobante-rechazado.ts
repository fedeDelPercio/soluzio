// Handler P8: Comprobante rechazado (event-driven).
// Lo dispara una Server Action cuando el admin marca un comprobante como rechazado.

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildComprobanteRechazadoEmail } from '../templates/rechazos.ts'
import { describirPropiedad } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

export async function handleComprobanteRechazado(
  comprobanteId: string,
  motivo?: string,
): Promise<ResultadoEvento> {
  const evento = 'comprobante_rechazado' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()
  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: compRaw, error } = await supabase
    .from('comprobantes_pago')
    .select(`
      id, organizacion_id,
      pagos:pago_id (
        id, monto_esperado, contrato_id,
        contratos (
          inquilino_id, coinquilino_id,
          propiedades ( calle, numero, piso, depto ),
          inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
          coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
        )
      )
    `)
    .eq('id', comprobanteId)
    .single()

  if (error) { resultado.errores.push(`comprobante: ${error.message}`); return resultado }
  if (!compRaw) { resultado.errores.push(`comprobante ${comprobanteId} no encontrado`); return resultado }
  const comp = compRaw as any
  if (!orgsHab.has(comp.organizacion_id)) return resultado

  const pago     = comp.pagos
  const contrato = pago?.contratos
  if (!pago || !contrato) { resultado.errores.push(`pago/contrato no resoluble`); return resultado }

  const propiedadStr = describirPropiedad(contrato.propiedades)
  const inqNombre = contrato.inquilino ? `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`.trim() : 'el inquilino'

  const ids: string[] = []
  if (contrato.inquilino?.id)   ids.push(contrato.inquilino.id)
  if (contrato.coinquilino?.id) ids.push(contrato.coinquilino.id)
  const emails = await resolverEmails(ids)

  const targets: { id: string; nombre: string; email: string; esAdmin: boolean }[] = []
  if (contrato.inquilino?.id   && emails.get(contrato.inquilino.id))   targets.push({ id: contrato.inquilino.id,   nombre: contrato.inquilino.nombre,   email: emails.get(contrato.inquilino.id)!,   esAdmin: false })
  if (contrato.coinquilino?.id && emails.get(contrato.coinquilino.id)) targets.push({ id: contrato.coinquilino.id, nombre: contrato.coinquilino.nombre, email: emails.get(contrato.coinquilino.id)!, esAdmin: false })
  for (const a of await adminsDeOrg(comp.organizacion_id)) targets.push({ id: a.id, nombre: a.nombre, email: a.email, esAdmin: true })

  for (const t of targets) {
    const { asunto, html } = buildComprobanteRechazadoEmail({
      esAdmin:         t.esAdmin,
      inquilinoNombre: t.esAdmin ? inqNombre : undefined,
      propiedad:       propiedadStr,
      monto:           pago.monto_esperado,
      motivo,
      contratoId:      pago.contrato_id,
    })
    await reservarYEnviar({
      evento,
      organizacion_id:   comp.organizacion_id,
      destinatario_id:   t.id,
      destinatarioEmail: t.email,
      contexto_unico:    `comprobante:${comp.id}`,
      asunto, html,
      metadata:          { comprobante_id: comp.id, pago_id: pago.id, contrato_id: pago.contrato_id, motivo },
    }, resultado)
  }
  return resultado
}
