import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bot, Image as ImageIcon } from 'lucide-react'
import { requireSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatFecha } from '@/lib/utils'
import { AdminActions } from './admin-actions'

const TIPO_LABEL: Record<string, string> = {
  mantenimiento: 'Mantenimiento',
  consulta:      'Consulta',
  reclamo:       'Reclamo',
  rescision:     'Rescisión',
  otro:          'Otro',
}
const TIPO_COLOR: Record<string, string> = {
  mantenimiento: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
  consulta:      'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
  reclamo:       'bg-red-100 text-red-700 ring-1 ring-red-200',
  rescision:     'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  otro:          'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
}
const ESTADO_LABEL: Record<string, string> = {
  abierto:    'Abierto',
  clasificado:'Clasificado',
  asignado:   'Asignado',
  en_proceso: 'En proceso',
  resuelto:   'Resuelto',
  cerrado:    'Cerrado',
}
const ESTADO_COLOR: Record<string, string> = {
  abierto:    'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200',
  clasificado:'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  asignado:   'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  en_proceso: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
  resuelto:   'bg-green-50 text-green-700 ring-1 ring-green-200',
  cerrado:    'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
}
const PRIORIDAD_COLOR: Record<string, string> = {
  urgente: 'bg-red-600 text-white',
  alta:    'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  media:   '',
  baja:    '',
}
const PRIORIDAD_LABEL: Record<string, string> = {
  urgente: 'Urgente',
  alta:    'Alta prioridad',
  media:   '',
  baja:    '',
}
const RESPONSABLE_LABEL: Record<string, string> = {
  inquilino:     'Inquilino',
  propietario:   'Propietario',
  consorcio:     'Consorcio',
  indeterminado: 'Indeterminado',
}
const RESPONSABLE_COLOR: Record<string, string> = {
  inquilino:     'bg-amber-50 border-amber-200 text-amber-800',
  propietario:   'bg-blue-50 border-blue-200 text-blue-800',
  consorcio:     'bg-purple-50 border-purple-200 text-purple-800',
  indeterminado: 'bg-zinc-50 border-zinc-200 text-zinc-600',
}

export default async function SolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { perfil } = await requireSession()
  const { id } = await params

  const supabase = await createClient()
  const db = supabase as any

  const { data: solicitud } = await db
    .from('solicitudes')
    .select(`
      id, tipo, titulo, descripcion, estado, prioridad,
      categoria, ia_sugerencia_responsable, ia_confianza, ia_clasificacion_raw,
      responsable_confirmado, respuesta_admin, respondido_en,
      creado_en, actualizado_en,
      contratos (
        id,
        propiedades ( calle, numero, ciudad ),
        inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
      ),
      reportado:perfiles!solicitudes_reportado_por_fkey ( nombre, apellido ),
      respondido_por_perfil:perfiles!solicitudes_respondido_por_fkey ( nombre, apellido )
    `)
    .eq('id', id)
    .single()

  if (!solicitud) notFound()

  // Fotos (solo si mantenimiento)
  let fotosConUrl: { ruta: string; url: string }[] = []
  if (solicitud.tipo === 'mantenimiento') {
    const { data: fotos } = await db
      .from('fotos_solicitud')
      .select('ruta_archivo')
      .eq('solicitud_id', id)
      .limit(5)

    const rutas = (fotos ?? []).map((f: any) => f.ruta_archivo)
    if (rutas.length > 0) {
      const adminClient = createAdminClient()
      const { data: signedUrls } = await adminClient.storage
        .from('mantenimiento')
        .createSignedUrls(rutas, 3600)
      fotosConUrl = (signedUrls ?? [])
        .filter((s: any) => s.signedUrl)
        .map((s: any) => ({ ruta: s.path, url: s.signedUrl }))
    }
  }

  const esAdmin       = perfil?.rol === 'administrador'
  const contrato      = solicitud.contratos as any
  const prop          = contrato?.propiedades
  const inq           = contrato?.inquilino
  const reportado     = solicitud.reportado as any
  const respPor       = solicitud.respondido_por_perfil as any
  const iaRaw         = solicitud.ia_clasificacion_raw as any
  const iaRazonamiento = iaRaw?.content?.[0]
    ? (() => {
        try { return JSON.parse(iaRaw.content[0].text)?.razonamiento }
        catch { return null }
      })()
    : null

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-5">
      {/* Breadcrumb */}
      <Link href="/solicitudes" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
        <ArrowLeft className="w-3 h-3" /> Solicitudes
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${TIPO_COLOR[solicitud.tipo]}`}>
            {TIPO_LABEL[solicitud.tipo]}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${ESTADO_COLOR[solicitud.estado]}`}>
            {ESTADO_LABEL[solicitud.estado]}
          </span>
          {PRIORIDAD_COLOR[solicitud.prioridad] && (
            <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${PRIORIDAD_COLOR[solicitud.prioridad]}`}>
              {PRIORIDAD_LABEL[solicitud.prioridad]}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">{solicitud.titulo}</h1>
        <p className="text-xs text-zinc-500">
          {prop ? <>{prop.calle} {prop.numero} — {prop.ciudad}</> : '—'}
          {' · '}
          Reportado por {reportado?.nombre} {reportado?.apellido}
          {' · '}
          {formatFecha(solicitud.creado_en)}
        </p>
      </div>

      {/* Descripción */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4">
        <p className="text-sm text-zinc-700 whitespace-pre-wrap">{solicitud.descripcion}</p>
      </div>

      {/* Fotos */}
      {fotosConUrl.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" /> Fotos adjuntas
          </p>
          <div className="flex flex-wrap gap-3">
            {fotosConUrl.map((f) => (
              <a key={f.ruta} href={f.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={f.url}
                  alt="Foto solicitud"
                  className="w-24 h-24 object-cover rounded-lg border border-zinc-200 hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Panel IA (solo mantenimiento) */}
      {solicitud.tipo === 'mantenimiento' && solicitud.ia_sugerencia_responsable && (
        <div className={`border rounded-lg p-4 space-y-2 ${RESPONSABLE_COLOR[solicitud.ia_sugerencia_responsable] ?? RESPONSABLE_COLOR.indeterminado}`}>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Análisis IA</span>
            {solicitud.ia_confianza != null && (
              <span className="text-xs ml-auto opacity-70">
                Confianza: {Math.round(Number(solicitud.ia_confianza) * 100)}%
              </span>
            )}
          </div>
          <p className="text-sm">
            Responsable sugerido:{' '}
            <strong>{RESPONSABLE_LABEL[solicitud.ia_sugerencia_responsable]}</strong>
          </p>
          {iaRazonamiento && (
            <p className="text-xs opacity-80">{iaRazonamiento}</p>
          )}
          {solicitud.responsable_confirmado && (
            <p className="text-xs font-medium mt-1">
              Confirmado por admin:{' '}
              <strong>{RESPONSABLE_LABEL[solicitud.responsable_confirmado]}</strong>
            </p>
          )}
        </div>
      )}

      {/* Respuesta del admin */}
      {solicitud.respuesta_admin && (
        <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Respuesta del administrador</p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{solicitud.respuesta_admin}</p>
          {respPor && (
            <p className="text-xs text-zinc-400 mt-1">
              {respPor.nombre} {respPor.apellido} · {formatFecha(solicitud.respondido_en)}
            </p>
          )}
        </div>
      )}

      {/* Acciones admin */}
      {esAdmin && (
        <AdminActions
          solicitudId={id}
          estadoActual={solicitud.estado}
          prioridadActual={solicitud.prioridad}
          responsableActual={solicitud.responsable_confirmado ?? solicitud.ia_sugerencia_responsable ?? ''}
          tipoSolicitud={solicitud.tipo}
        />
      )}
    </div>
  )
}
