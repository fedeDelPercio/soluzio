// Handler D2: Documento rechazado (event-driven).

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { resolverEmails } from '../lib/perfiles.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildDocumentoRechazadoEmail } from '../templates/rechazos.ts'
import { describirPropiedad } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

const TIPO_DOC_LABEL: Record<string, string> = {
  contrato:           'Contrato',
  dni_inquilino:      'DNI del inquilino',
  dni_garante:        'DNI del garante',
  escritura_garantia: 'Escritura de garantía',
  informe_garantia:   'Informe de garantía',
  seguro_incendio:    'Seguro de incendio',
  poliza_alternativa: 'Póliza alternativa',
  ficha_garante:      'Ficha del garante',
  recibo_deposito:    'Recibo de depósito',
  otro:               'Documento',
}

export async function handleDocumentoRechazado(
  documentoId: string,
  motivo?: string,
): Promise<ResultadoEvento> {
  const evento = 'documento_rechazado' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()
  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: docRaw, error } = await supabase
    .from('documentos')
    .select(`
      id, organizacion_id, contrato_id, tipo_documento,
      contratos (
        propiedades ( calle, numero, piso, depto ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( id, nombre, apellido ),
        coinquilino:perfiles!contratos_coinquilino_id_fkey ( id, nombre, apellido )
      )
    `)
    .eq('id', documentoId)
    .single()

  if (error) { resultado.errores.push(`documento: ${error.message}`); return resultado }
  if (!docRaw) { resultado.errores.push(`documento ${documentoId} no encontrado`); return resultado }
  const doc = docRaw as any
  if (!orgsHab.has(doc.organizacion_id)) return resultado

  const contrato = doc.contratos
  if (!contrato) { resultado.errores.push(`contrato no resoluble`); return resultado }

  const propiedadStr = describirPropiedad(contrato.propiedades)
  const inqNombre = contrato.inquilino ? `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`.trim() : 'el inquilino'
  const tipoLabel = TIPO_DOC_LABEL[doc.tipo_documento] ?? 'Documento'

  const ids: string[] = []
  if (contrato.inquilino?.id)   ids.push(contrato.inquilino.id)
  if (contrato.coinquilino?.id) ids.push(contrato.coinquilino.id)
  const emails = await resolverEmails(ids)

  const targets: { id: string; nombre: string; email: string; esAdmin: boolean }[] = []
  if (contrato.inquilino?.id   && emails.get(contrato.inquilino.id))   targets.push({ id: contrato.inquilino.id,   nombre: contrato.inquilino.nombre,   email: emails.get(contrato.inquilino.id)!,   esAdmin: false })
  if (contrato.coinquilino?.id && emails.get(contrato.coinquilino.id)) targets.push({ id: contrato.coinquilino.id, nombre: contrato.coinquilino.nombre, email: emails.get(contrato.coinquilino.id)!, esAdmin: false })
  for (const a of await adminsDeOrg(doc.organizacion_id)) targets.push({ id: a.id, nombre: a.nombre, email: a.email, esAdmin: true })

  for (const t of targets) {
    const { asunto, html } = buildDocumentoRechazadoEmail({
      esAdmin:         t.esAdmin,
      inquilinoNombre: t.esAdmin ? inqNombre : undefined,
      propiedad:       propiedadStr,
      tipoDocumento:   tipoLabel,
      motivo,
      contratoId:      doc.contrato_id,
    })
    await reservarYEnviar({
      evento,
      organizacion_id:   doc.organizacion_id,
      destinatario_id:   t.id,
      destinatarioEmail: t.email,
      contexto_unico:    `documento:${doc.id}`,
      asunto, html,
      metadata:          { documento_id: doc.id, contrato_id: doc.contrato_id, tipo_documento: doc.tipo_documento, motivo },
    }, resultado)
  }
  return resultado
}
