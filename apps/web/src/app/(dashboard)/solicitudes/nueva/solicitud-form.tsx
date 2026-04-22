'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, Bot, Wrench,
  MessageCircle, AlertOctagon, DoorOpen, MoreHorizontal,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { crearSolicitudAction, insertarFotosSolicitudAction } from '../actions'

const TIPOS = [
  { value: 'mantenimiento', label: 'Mantenimiento', icon: Wrench, desc: 'Reparación o problema físico en la propiedad' },
  { value: 'consulta',      label: 'Consulta',      icon: MessageCircle, desc: 'Pregunta sobre el contrato, pagos o fechas' },
  { value: 'reclamo',       label: 'Reclamo',       icon: AlertOctagon, desc: 'Reclamo formal sobre algo prometido no cumplido' },
  { value: 'rescision',     label: 'Rescisión',     icon: DoorOpen, desc: 'Iniciar proceso de salida anticipada del contrato' },
  { value: 'otro',          label: 'Otro',          icon: MoreHorizontal, desc: 'Cualquier otra solicitud o comentario' },
]

const PRIORIDADES = [
  { value: 'baja',    label: 'Baja' },
  { value: 'media',   label: 'Media' },
  { value: 'alta',    label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

type Clasificacion = {
  responsable: string
  confianza: number
  razonamiento: string
  categoria_sugerida: string
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

interface Props {
  contratos: { id: string; label: string }[]
  esAdmin: boolean
}

export function SolicitudForm({ contratos, esAdmin }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [tipo, setTipo]           = useState('mantenimiento')
  const [titulo, setTitulo]       = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [contratoId, setContratoId]   = useState(contratos.length === 1 ? contratos[0].id : '')
  const [prioridad, setPrioridad]     = useState('media')

  // Fotos (solo mantenimiento)
  const [archivos, setArchivos]   = useState<File[]>([])
  const [subiendo, setSubiendo]   = useState(false)
  const [clasificando, setClasificando] = useState(false)
  const [clasificacion, setClasificacion] = useState<Clasificacion | null>(null)
  const [error, setError]         = useState('')
  const fileRef                   = useRef<HTMLInputElement>(null)

  const tipoSeleccionado = TIPOS.find((t) => t.value === tipo)

  function agregarArchivos(files: FileList | null) {
    if (!files) return
    const nuevos = Array.from(files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['jpg', 'jpeg', 'png', 'webp'].includes(ext ?? '')
    })
    setArchivos((prev) => [...prev, ...nuevos].slice(0, 5))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!contratoId) { setError('Seleccioná un contrato'); return }
    if (!titulo.trim()) { setError('Ingresá un título'); return }
    if (!descripcion.trim()) { setError('Ingresá una descripción'); return }
    setError('')

    if (tipo === 'mantenimiento' && archivos.length > 0) {
      setSubiendo(true)
      try {
        const supabase = createClient()
        const uploadedRutas: string[] = []

        for (const file of archivos) {
          const ext  = file.name.split('.').pop()
          const path = `solicitudes/${contratoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from('mantenimiento')
            .upload(path, file, { upsert: false })
          if (!uploadError) uploadedRutas.push(path)
        }

        setSubiendo(false)

        // Clasificar con IA antes de crear la solicitud
        if (uploadedRutas.length > 0 || (titulo && descripcion)) {
          setClasificando(true)
          try {
            const token = (await supabase.auth.getSession()).data.session?.access_token
            const res = await fetch('/api/classify-maintenance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ titulo, descripcion }),
            })
            if (res.ok) {
              const data = await res.json()
              setClasificacion(data.resultado)
            }
          } catch { /* continuar sin clasificación */ }
          setClasificando(false)
        }

        // Crear la solicitud y luego asociar fotos
        startTransition(async () => {
          const fd = new FormData()
          fd.set('contrato_id', contratoId)
          fd.set('tipo', tipo)
          fd.set('titulo', titulo)
          fd.set('descripcion', descripcion)
          fd.set('prioridad', prioridad)
          // crearSolicitudAction redirige internamente
          await crearSolicitudAction(fd)
        })
        return
      } catch {
        setSubiendo(false)
        setError('Error al subir las fotos')
        return
      }
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.set('contrato_id', contratoId)
      fd.set('tipo', tipo)
      fd.set('titulo', titulo)
      fd.set('descripcion', descripcion)
      fd.set('prioridad', prioridad)
      await crearSolicitudAction(fd)
    })
  }

  const cargando = subiendo || clasificando || isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tipo */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-700">Tipo de solicitud</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TIPOS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTipo(t.value); setClasificacion(null) }}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  tipo === t.value
                    ? 'border-zinc-900 bg-zinc-50'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tipo === t.value ? 'text-zinc-900' : 'text-zinc-400'}`} />
                <div>
                  <p className={`text-sm font-medium ${tipo === t.value ? 'text-zinc-900' : 'text-zinc-600'}`}>{t.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Contrato */}
      {contratos.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Contrato</label>
          <select
            value={contratoId}
            onChange={(e) => setContratoId(e.target.value)}
            required
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          >
            <option value="">Seleccioná un contrato</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">Título</label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          minLength={5}
          maxLength={200}
          placeholder={
            tipo === 'mantenimiento' ? 'Ej: Pérdida de agua en el baño' :
            tipo === 'consulta'      ? 'Ej: ¿Cuándo vence mi contrato?' :
            tipo === 'reclamo'       ? 'Ej: Reparación prometida no realizada' :
            tipo === 'rescision'     ? 'Solicitud de rescisión anticipada' :
            'Resumí tu solicitud en pocas palabras'
          }
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder={
            tipo === 'mantenimiento' ? 'Describí el problema con detalle: dónde está, cuándo empezó, si empeoró…' :
            tipo === 'consulta'      ? 'Describí tu consulta con el mayor detalle posible.' :
            tipo === 'reclamo'       ? 'Describí el incumplimiento: qué fue prometido, cuándo, y qué pasó en realidad.' :
            tipo === 'rescision'     ? 'Indicá la fecha deseada de rescisión y el motivo.' :
            'Describí tu solicitud con el mayor detalle posible.'
          }
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
        />
      </div>

      {/* Prioridad (mantenimiento siempre, otros solo admin) */}
      {(tipo === 'mantenimiento' || esAdmin) && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Prioridad</label>
          <div className="flex rounded-lg border border-zinc-200 bg-white overflow-hidden text-sm">
            {PRIORIDADES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPrioridad(p.value)}
                className={`flex-1 px-2 py-1.5 transition-colors ${
                  prioridad === p.value
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fotos (solo mantenimiento) */}
      {tipo === 'mantenimiento' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">
            Fotos <span className="text-zinc-400 font-normal">(opcional, máx. 5)</span>
          </label>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); agregarArchivos(e.dataTransfer.files) }}
            className="border-2 border-dashed border-zinc-200 rounded-lg p-6 text-center cursor-pointer hover:border-zinc-300 transition-colors"
          >
            <Upload className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Arrastrá fotos o hacé clic para seleccionar</p>
            <p className="text-xs text-zinc-400 mt-1">JPG, PNG, WebP · máx. 10 MB c/u</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => agregarArchivos(e.target.files)}
          />

          {archivos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {archivos.map((f, i) => (
                <div key={i} className="relative group">
                  <img
                    src={URL.createObjectURL(f)}
                    alt={f.name}
                    className="w-16 h-16 object-cover rounded-lg border border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setArchivos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-white border border-zinc-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resultado clasificación IA */}
      {clasificacion && (
        <div className={`border rounded-lg p-3 space-y-1 ${RESPONSABLE_COLOR[clasificacion.responsable] ?? RESPONSABLE_COLOR.indeterminado}`}>
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Análisis IA</span>
            <span className="text-xs ml-auto opacity-70">
              Confianza: {Math.round(clasificacion.confianza * 100)}%
            </span>
          </div>
          <p className="text-sm font-medium">
            Responsable sugerido: <strong>{RESPONSABLE_LABEL[clasificacion.responsable]}</strong>
          </p>
          <p className="text-xs opacity-80">{clasificacion.razonamiento}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {cargando ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {subiendo ? 'Subiendo fotos…' : clasificando ? 'Analizando con IA…' : 'Enviando…'}
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Enviar solicitud
          </>
        )}
      </button>
    </form>
  )
}
