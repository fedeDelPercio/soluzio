'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { actualizarSolicitudAction } from '../actions'

const ESTADOS = [
  { value: 'abierto',    label: 'Abierto' },
  { value: 'clasificado', label: 'Clasificado' },
  { value: 'asignado',   label: 'Asignado' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto',   label: 'Resuelto' },
  { value: 'cerrado',    label: 'Cerrado' },
]

const PRIORIDADES = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Media' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const RESPONSABLES = [
  { value: '',              label: 'Sin confirmar' },
  { value: 'inquilino',     label: 'Inquilino' },
  { value: 'propietario',   label: 'Propietario' },
  { value: 'consorcio',     label: 'Consorcio' },
  { value: 'indeterminado', label: 'Indeterminado' },
]

interface Props {
  solicitudId: string
  estadoActual: string
  prioridadActual: string
  responsableActual: string
  tipoSolicitud: string
}

export function AdminActions({
  solicitudId,
  estadoActual,
  prioridadActual,
  responsableActual,
  tipoSolicitud,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [estado, setEstado]             = useState(estadoActual)
  const [prioridad, setPrioridad]       = useState(prioridadActual)
  const [responsable, setResponsable]   = useState(responsableActual)
  const [respuesta, setRespuesta]       = useState('')
  const [success, setSuccess]           = useState(false)
  const [error, setError]               = useState('')

  async function handleGuardar() {
    setSuccess(false)
    setError('')

    startTransition(async () => {
      const fd = new FormData()
      if (estado !== estadoActual)           fd.set('estado', estado)
      if (prioridad !== prioridadActual)     fd.set('prioridad', prioridad)
      if (responsable !== responsableActual) fd.set('responsable_confirmado', responsable)
      if (respuesta.trim())                  fd.set('respuesta_admin', respuesta.trim())

      const result = await actualizarSolicitudAction(solicitudId, fd)

      if (result.ok) {
        setSuccess(true)
        setRespuesta('')
        router.refresh()
      } else {
        setError(result.error ?? 'Error al guardar')
      }
    })
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4 space-y-4">
      <p className="text-sm font-semibold text-zinc-700">Acciones del administrador</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Estado */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Estado</label>
          <div className="relative">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full appearance-none text-sm border border-zinc-200 rounded-lg px-3 py-2 pr-7 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Prioridad */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Prioridad</label>
          <div className="relative">
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full appearance-none text-sm border border-zinc-200 rounded-lg px-3 py-2 pr-7 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {PRIORIDADES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Responsable (solo mantenimiento) */}
        {tipoSolicitud === 'mantenimiento' && (
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs text-zinc-500">Responsable confirmado</label>
            <div className="relative">
              <select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full appearance-none text-sm border border-zinc-200 rounded-lg px-3 py-2 pr-7 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {RESPONSABLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Respuesta */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-500">Respuesta al inquilino (opcional)</label>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Escribí una respuesta o comentario para el inquilino…"
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Cambios guardados
        </div>
      )}

      <button
        type="button"
        onClick={handleGuardar}
        disabled={isPending}
        className="flex items-center gap-2 bg-zinc-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
        ) : (
          <><CheckCircle2 className="w-4 h-4" /> Guardar cambios</>
        )}
      </button>
    </div>
  )
}
