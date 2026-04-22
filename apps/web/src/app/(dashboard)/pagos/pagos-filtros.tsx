'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const ESTADOS = [
  { value: 'activos',            label: 'Pendientes' },
  { value: 'comprobante_subido', label: 'Con comprobante' },
  { value: 'verificado',         label: 'Verificados' },
  { value: 'todos',              label: 'Todos' },
]

interface Propiedad {
  id: string
  calle: string
  numero: string
}

interface Props {
  propiedades: Propiedad[]
  totalCount: number
}

function buildPeriodos(): { value: string; label: string }[] {
  const hoy = new Date()
  const pasados: { value: string; label: string }[] = []
  // Últimos 6 meses (incluyendo el actual)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
    pasados.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return [
    { value: 'todos',    label: 'Todos los períodos' },
    ...pasados,
    { value: 'futuros',  label: '▸ Futuros' },
  ]
}

export function PagosFiltros({ propiedades, totalCount }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const estado      = searchParams.get('estado')       ?? 'activos'
  const periodo     = searchParams.get('periodo')      ?? 'todos'
  const propiedadId = searchParams.get('propiedad_id') ?? ''

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const updateEstado = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('estado', value)
      // Al cambiar estado resetear período para no ocultar resultados
      params.delete('periodo')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const periodos = buildPeriodos()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/pagos"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-2"
          >
            <ArrowLeft className="w-3 h-3" /> Volver a pagos pendientes
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Explorar pagos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {totalCount} resultado{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {/* Estado */}
        <div className="flex rounded-lg border border-zinc-200 bg-white overflow-hidden text-sm">
          {ESTADOS.map((e) => (
            <button
              key={e.value}
              onClick={() => updateEstado(e.value)}
              className={`px-3 py-1.5 transition-colors ${
                estado === e.value
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Período */}
        <select
          value={periodo}
          onChange={(e) => update('periodo', e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg bg-white px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          {periodos.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Propiedad */}
        {propiedades.length > 1 && (
          <select
            value={propiedadId}
            onChange={(e) => update('propiedad_id', e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg bg-white px-3 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">Todas las propiedades</option>
            {propiedades.map((p) => (
              <option key={p.id} value={p.id}>
                {p.calle} {p.numero}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
