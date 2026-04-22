'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const TIPOS = [
  { value: 'todos',         label: 'Todos' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'consulta',      label: 'Consulta' },
  { value: 'reclamo',       label: 'Reclamo' },
  { value: 'rescision',     label: 'Rescisión' },
  { value: 'otro',          label: 'Otro' },
]

const ESTADOS = [
  { value: 'activos',    label: 'Activos' },
  { value: 'abierto',    label: 'Abiertos' },
  { value: 'clasificado','label': 'Clasificados' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto',   label: 'Resueltos' },
  { value: 'todos',      label: 'Todos' },
]

const PRIORIDADES = [
  { value: 'todas',   label: 'Todas las prioridades' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'alta',    label: 'Alta' },
  { value: 'media',   label: 'Media' },
  { value: 'baja',    label: 'Baja' },
]

interface Props {
  totalCount: number
}

export function SolicitudesFiltros({ totalCount }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const tipo      = searchParams.get('tipo')      ?? 'todos'
  const estado    = searchParams.get('estado')    ?? 'activos'
  const prioridad = searchParams.get('prioridad') ?? 'todas'

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('modo', 'explorar')
      if (value && value !== 'todos' && value !== 'todas') params.set(key, value)
      else params.delete(key)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/solicitudes"
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Volver a bandeja
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Explorar solicitudes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {totalCount} resultado{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Tipo */}
        <div className="flex flex-wrap rounded-lg border border-zinc-200 bg-white overflow-hidden text-sm">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              onClick={() => update('tipo', t.value)}
              className={`px-3 py-1.5 transition-colors ${
                tipo === t.value
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Estado */}
        <select
          value={estado}
          onChange={(e) => update('estado', e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg bg-white px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>

        {/* Prioridad */}
        <select
          value={prioridad}
          onChange={(e) => update('prioridad', e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg bg-white px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          {PRIORIDADES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
