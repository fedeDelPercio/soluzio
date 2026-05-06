// Handler M5: Solicitud sin respuesta (default 2 días sin actividad).
// Lógica: solicitudes sin respuesta_admin y con creado_en hace N días o más,
// que sigan abiertas. Para evitar spam diario, el contexto_unico incluye
// solo el id de la solicitud (un único disparo por solicitud).

import { getAdminClient } from '../lib/supabase.ts'
import { offsetsPorOrg } from '../lib/offsets.ts'
import { adminsDeOrg } from '../lib/admins.ts'
import { reservarYEnviar } from '../lib/enviar.ts'
import { buildSolicitudSinRespuestaEmail } from '../templates/solicitud-eventos.ts'
import { describirPropiedad, haceDias } from '../lib/fechas.ts'
import type { ResultadoEvento } from '../lib/types.ts'

interface SolicitudRow {
  id: string; organizacion_id: string; titulo: string; creado_en: string;
  contratos: {
    propiedades: { calle: string; numero: string; piso: string | null; depto: string | null } | null;
    inquilino: { nombre: string; apellido: string } | null;
  } | null;
}

export async function handleSolicitudSinRespuesta(): Promise<ResultadoEvento> {
  const evento = 'solicitud_sin_respuesta' as const
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
    const corteFecha = haceDias(diasOffset)  // creadas antes de esta fecha
    const { data: solicitudesRaw, error } = await supabase
      .from('solicitudes')
      .select(`
        id, organizacion_id, titulo, creado_en,
        contratos (
          propiedades ( calle, numero, piso, depto ),
          inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
        )
      `)
      .in('estado', ['abierto', 'clasificado'])
      .is('respuesta_admin', null)
      .lte('creado_en', `${corteFecha}T23:59:59`)
      .in('organizacion_id', orgIds)

    if (error) { resultado.errores.push(`query: ${error.message}`); continue }
    const solicitudes = (solicitudesRaw ?? []) as unknown as SolicitudRow[]
    if (solicitudes.length === 0) continue

    for (const s of solicitudes) {
      const propiedadStr = describirPropiedad(s.contratos?.propiedades)
      const inq = s.contratos?.inquilino
      const inqNombre = inq ? `${inq.nombre} ${inq.apellido}`.trim() : 'el inquilino'
      const diasReales = Math.max(diasOffset, 1)

      for (const a of await adminsDeOrg(s.organizacion_id)) {
        const { asunto, html } = buildSolicitudSinRespuestaEmail({
          solicitudId: s.id, titulo: s.titulo, inquilinoNombre: inqNombre,
          propiedad: propiedadStr, diasSinRespuesta: diasReales, creadoEn: s.creado_en,
        })
        await reservarYEnviar({
          evento, organizacion_id: s.organizacion_id, destinatario_id: a.id,
          destinatarioEmail: a.email, contexto_unico: `solicitud:${s.id}:sin_respuesta`,
          asunto, html, metadata: { solicitud_id: s.id, dias_offset: diasOffset },
        }, resultado)
      }
    }
  }

  return resultado
}
