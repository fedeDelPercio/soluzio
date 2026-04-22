import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { MessageSquare, Plus, SlidersHorizontal } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatFecha } from '@/lib/utils'
import { SolicitudesFiltros } from './solicitudes-filtros'

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
const PRIORIDAD_PILL: Record<string, { label: string; cls: string }> = {
  urgente: { label: 'Urgente', cls: 'bg-red-600 text-white' },
  alta:    { label: 'Alta',    cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' },
  media:   { label: '',        cls: '' },
  baja:    { label: '',        cls: '' },
}

type SolicitudRow = {
  id: string
  tipo: string
  titulo: string
  estado: string
  prioridad: string
  creado_en: string
  contratos: {
    propiedades: { calle: string; numero: string; ciudad: string } | null
    inquilino: { nombre: string; apellido: string } | null
  } | null
}

type SearchParams = Promise<{
  tipo?: string
  estado?: string
  prioridad?: string
  modo?: string
}>

export default async function SolicitudesPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, perfil } = await getSession()
  if (!user || !perfil) redirect('/login')

  const params = await searchParams
  const esAdmin     = perfil.rol === 'administrador'
  const esInquilino = perfil.rol === 'inquilino'
  const esPropietario = perfil.rol === 'propietario'

  const supabase = await createClient()
  const db = supabase as any

  const SELECT = `
    id, tipo, titulo, estado, prioridad, creado_en,
    contratos (
      propiedades ( calle, numero, ciudad ),
      inquilino:perfiles!contratos_inquilino_id_fkey ( nombre, apellido )
    )
  `

  // ── Inquilino / Propietario: vista simple ────────────────────────────────
  if (esInquilino || esPropietario) {
    const { data: solicitudesRaw } = await db
      .from('solicitudes')
      .select(SELECT)
      .not('estado', 'in', '("cerrado")')
      .order('creado_en', { ascending: false })
      .limit(100)

    const solicitudes = (solicitudesRaw ?? []) as SolicitudRow[]

    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Mis solicitudes</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} activa{solicitudes.length !== 1 ? 's' : ''}
            </p>
          </div>
          {esInquilino && (
            <Link
              href="/solicitudes/nueva"
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva
            </Link>
          )}
        </div>
        <SolicitudesList solicitudes={solicitudes} esAdmin={false} />
      </div>
    )
  }

  // ── Admin: modo explorar ─────────────────────────────────────────────────
  const modoExplorar = params.modo === 'explorar' || !!params.tipo || !!params.estado || !!params.prioridad

  if (modoExplorar) {
    const tipoParam     = params.tipo      ?? 'todos'
    const estadoParam   = params.estado    ?? 'activos'
    const prioridadParam = params.prioridad ?? 'todas'

    let query = db.from('solicitudes').select(SELECT)

    if (tipoParam !== 'todos') {
      query = query.eq('tipo', tipoParam)
    }

    if (estadoParam === 'activos') {
      query = query.in('estado', ['abierto', 'clasificado', 'asignado', 'en_proceso'])
    } else if (estadoParam !== 'todos') {
      query = query.eq('estado', estadoParam)
    }

    if (prioridadParam !== 'todas') {
      query = query.eq('prioridad', prioridadParam)
    }

    query = query.order('creado_en', { ascending: false }).limit(200)

    const { data: solicitudesRaw } = await query
    const solicitudes = (solicitudesRaw ?? []) as SolicitudRow[]

    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
        <Suspense>
          <SolicitudesFiltros totalCount={solicitudes.length} />
        </Suspense>
        <SolicitudesList solicitudes={solicitudes} esAdmin />
      </div>
    )
  }

  // ── Admin: vista default — bandeja de entrada ────────────────────────────
  const { data: solicitudesRaw } = await db
    .from('solicitudes')
    .select(SELECT)
    .in('estado', ['abierto', 'clasificado', 'asignado', 'en_proceso'])
    .order('prioridad', { ascending: false })
    .order('creado_en', { ascending: true })
    .limit(200)

  const solicitudes = (solicitudesRaw ?? []) as SolicitudRow[]

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Solicitudes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} activa{solicitudes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/solicitudes?modo=explorar"
          className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 border border-zinc-200 bg-white hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Explorar
        </Link>
      </div>

      <SolicitudesList solicitudes={solicitudes} esAdmin />
    </div>
  )
}

// ── Lista compartida ─────────────────────────────────────────────────────────

function SolicitudesList({
  solicitudes,
  esAdmin,
}: {
  solicitudes: SolicitudRow[]
  esAdmin: boolean
}) {
  if (solicitudes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 px-6 py-16 text-center">
        <MessageSquare className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-600">No hay solicitudes para mostrar</p>
        <p className="text-xs text-zinc-400 mt-1">
          {esAdmin ? 'La bandeja está vacía' : 'Usá el botón Nueva para crear una solicitud'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
      {solicitudes.map((s) => {
        const contrato = s.contratos as any
        const prop     = contrato?.propiedades
        const inq      = contrato?.inquilino

        return (
          <Link
            key={s.id}
            href={`/solicitudes/${s.id}`}
            className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-zinc-50 transition-colors"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${TIPO_COLOR[s.tipo]}`}>
                  {TIPO_LABEL[s.tipo]}
                </span>
                {PRIORIDAD_PILL[s.prioridad]?.label && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${PRIORIDAD_PILL[s.prioridad].cls}`}>
                    {PRIORIDAD_PILL[s.prioridad].label}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-zinc-900 truncate">{s.titulo}</p>
              <p className="text-xs text-zinc-500">
                {prop ? <>{prop.calle} {prop.numero} — {prop.ciudad}</> : '—'}
                {esAdmin && inq && <> · {inq.nombre} {inq.apellido}</>}
                {' · '}{formatFecha(s.creado_en)}
              </p>
            </div>
            <span className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-md font-medium ${ESTADO_COLOR[s.estado]}`}>
              {ESTADO_LABEL[s.estado]}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
