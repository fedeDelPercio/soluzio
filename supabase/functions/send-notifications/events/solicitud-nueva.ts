// Handler M1: Solicitud nueva (event-driven, prioridad baja o media).
// Las prioridades alta/urgente van por solicitud_urgente (M2) y NO se solapan.

import { getAdminClient } from '../lib/supabase.ts'
import { orgsConEventoHabilitado } from '../lib/config.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildSolicitudNuevaEmail } from '../templates/solicitud-eventos.ts'
import { describirPropiedad } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

const TIPO_LABEL: Record<string, string> = {
  mantenimiento: 'Mantenimiento', consulta: 'Consulta', reclamo: 'Reclamo', rescision: 'Rescision', otro: 'Otro',
}

const PRIORIDAD_LABEL: Record<string, string> = {
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
}

export async function handleSolicitudNueva(solicitudId: string): Promise<ResultadoEvento> {
  const evento = 'solicitud_nueva' as const
  const resultado: ResultadoEvento = { evento, enviados: 0, dedup: 0, fallidos: 0, errores: [] }
  const supabase = getAdminClient()

  const orgsHab = await orgsConEventoHabilitado(evento)
  if (orgsHab.size === 0) return resultado

  const { data: sRaw, error } = await supabase
    .from('solicitudes')
    .select(`
      id, organizacion_id, titulo, tipo, prioridad,
      contratos ( propiedades ( calle, numero, piso, depto ), inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido ) )
    `)
    .eq('id', solicitudId)
    .single()

  if (error) { resultado.errores.push(`solicitud: ${error.message}`); return resultado }
  if (!sRaw) { resultado.errores.push(`solicitud ${solicitudId} no encontrada`); return resultado }
  const s = sRaw as any
  if (!orgsHab.has(s.organizacion_id)) return resultado

  // Si es alta/urgente, M2 ya se está disparando aparte; este handler es solo
  // para baja/media (evita duplicar emails al admin).
  if (['alta', 'urgente'].includes(s.prioridad)) return resultado

  const propiedadStr = describirPropiedad(s.contratos?.propiedades)
  const inq = s.contratos?.inquilino
  const inqNombre = inq ? `${inq.nombre} ${inq.apellido}`.trim() : 'el inquilino'

  for (const a of await adminsDeOrg(s.organizacion_id)) {
    const { asunto, html } = buildSolicitudNuevaEmail({
      solicitudId: s.id, titulo: s.titulo,
      tipo: TIPO_LABEL[s.tipo] ?? s.tipo, prioridad: PRIORIDAD_LABEL[s.prioridad] ?? s.prioridad,
      inquilinoNombre: inqNombre, propiedad: propiedadStr,
    })
    await reservarYEnviar({
      evento, organizacion_id: s.organizacion_id, destinatario_id: a.id,
      destinatarioEmail: a.email, contexto_unico: `solicitud:${s.id}:nueva`,
      asunto, html, metadata: { solicitud_id: s.id, prioridad: s.prioridad, tipo: s.tipo },
    }, resultado)
  }

  return resultado
}
