'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { crearContratoDesdeAnalisisAction } from './actions'
import { registrarDocumentoAction } from '../[id]/documentos/actions'
import { crearInmobiliarioAction } from '../../inmobiliarios/actions'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Check, Bot, FolderOpen, X, ChevronDown,
} from 'lucide-react'

type Fase = 'upload' | 'revision' | 'documentos'

const TIPOS_ADICIONALES = [
  { value: 'dni_inquilino',      label: 'DNI Inquilino' },
  { value: 'dni_garante',        label: 'DNI Garante' },
  { value: 'escritura_garantia', label: 'Escritura garantía' },
  { value: 'informe_garantia',   label: 'Informe garantía' },
  { value: 'seguro_incendio',    label: 'Seguro de incendio' },
  { value: 'poliza_alternativa', label: 'Póliza alternativa' },
  { value: 'ficha_garante',      label: 'Ficha garante' },
  { value: 'recibo_deposito',    label: 'Recibo depósito' },
  { value: 'otro',               label: 'Otro' },
]

// Combobox con búsqueda (reutilizable localmente)
function TipoCombobox({
  opciones, value, onChange, disabled,
}: {
  opciones: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [query, setQuery]     = useState('')
  const [abierto, setAbierto] = useState(false)
  const containerRef          = useRef<HTMLDivElement>(null)
  const seleccionado          = opciones.find((o) => o.value === value)
  const filtradas             = query
    ? opciones.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opciones

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false)
        if (!value) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  function seleccionar(o: { value: string; label: string }) {
    onChange(o.value)
    setQuery(o.label)
    setAbierto(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={abierto && !seleccionado ? query : (seleccionado?.label ?? query)}
          onChange={(e) => { setQuery(e.target.value); onChange(''); setAbierto(true) }}
          onFocus={() => { setAbierto(true); if (seleccionado) setQuery('') }}
          onBlur={() => { setTimeout(() => { if (!value) setQuery('') }, 150) }}
          disabled={disabled}
          placeholder="Buscar tipo de documento..."
          className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2 pr-7 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 disabled:opacity-50"
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
      </div>
      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtradas.map((o) => (
            <li
              key={o.value}
              onMouseDown={(e) => { e.preventDefault(); seleccionar(o) }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50 transition-colors ${o.value === value ? 'bg-zinc-100 font-medium' : 'text-zinc-700'}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {abierto && filtradas.length === 0 && query && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-lg px-3 py-2 text-sm text-zinc-400">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}

interface ResultadoAnalisis {
  fecha_inicio: string | null
  fecha_fin: string | null
  monto_inicial: number | null
  monto_deposito: number | null
  moneda: 'ars' | 'usd' | null
  moneda_deposito: 'ars' | 'usd' | null
  indice_ajuste: 'ipc' | 'icl' | 'fijo' | null
  periodo_ajuste_meses: number | null
  vencimiento_seguro_incendio: string | null
  propiedad: {
    tipo_propiedad: string | null
    calle: string | null
    numero: string | null
    piso: string | null
    depto: string | null
    barrio: string | null
    ciudad: string | null
    provincia: string | null
  } | null
  inquilinos: Array<{
    nombre: string | null
    apellido: string | null
    dni: string | null
    email: string | null
    telefono: string | null
  }>
  propietario: {
    nombre: string | null
    apellido: string | null
    dni: string | null
    email: string | null
    telefono: string | null
  } | null
  confianza: number | null
  notas: string | null
}

const SELECT_CLASS = 'flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900'
const INPUT_CLASS  = 'h-8 text-sm bg-white'

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
]

interface WizardProps {
  organizacionId: string
  inmobiliarios: { id: string; nombre: string; apellido: string }[]
}

export function ContratoWizard({ organizacionId, inmobiliarios: inmobiliariosInicial }: WizardProps) {
  const [inmobiliarios, setInmobiliarios]   = useState(inmobiliariosInicial)
  const [inmobNuevoOpen, setInmobNuevoOpen] = useState(false)
  const [inmobCreando, setInmobCreando]     = useState(false)
  const [inmobError, setInmobError]         = useState<string | null>(null)
  const [inmobSeleccionado, setInmobSeleccionado] = useState('')

  const router = useRouter()

  const [fase, setFase]   = useState<Fase>('upload')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Upload PDF
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo]         = useState<File | null>(null)
  const [subiendo, setSubiendo]       = useState(false)
  const [rutaArchivo, setRutaArchivo] = useState<string | null>(null)
  const [resultado, setResultado]     = useState<ResultadoAnalisis | null>(null)
  const [isDragging, setIsDragging]   = useState(false)
  const [progreso, setProgreso]       = useState(0)
  const [faseProgreso, setFaseProgreso] = useState<'subiendo' | 'analizando' | null>(null)

  // Documentos adicionales (fase 3)
  const docInputRef                             = useRef<HTMLInputElement>(null)
  const [contratoId, setContratoId]             = useState<string | null>(null)
  const [tipoDoc, setTipoDoc]                   = useState('')
  const [archivoDoc, setArchivoDoc]             = useState<File | null>(null)
  const [subiendoDoc, setSubiendoDoc]           = useState(false)
  const [errorDoc, setErrorDoc]                 = useState<string | null>(null)
  const [docsSubidos, setDocsSubidos]           = useState<{ tipo: string; label: string }[]>([])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (subiendo) return
    const f = e.dataTransfer.files?.[0]
    if (!f || f.type !== 'application/pdf') { setError('Solo se aceptan archivos PDF.'); return }
    if (f.size > 50 * 1024 * 1024) { setError('El archivo supera el límite de 50 MB.'); return }
    setArchivo(f); setError(null)
  }

  async function handleAnalizar() {
    if (!archivo) return
    setError(null)
    setSubiendo(true)
    setProgreso(0)
    setFaseProgreso('subiendo')

    // Estimación de tiempos según tamaño del archivo
    const sizeMB = archivo.size / 1024 / 1024
    const uploadEstimadoMs   = Math.max(2500, sizeMB * 800)       // ~0.8s por MB, mínimo 2.5s
    const analisisEstimadoMs = Math.max(25000, sizeMB * 1500 + 15000) // base 25s + 1.5s por MB

    // Animar progreso durante el upload: avanza hasta 30%
    const inicioUpload = Date.now()
    const interval1 = setInterval(() => {
      const transcurrido = Date.now() - inicioUpload
      const pct = Math.min(30, (transcurrido / uploadEstimadoMs) * 30)
      setProgreso(pct)
    }, 120)

    const supabase  = createClient()
    const uploadId  = crypto.randomUUID()
    const ruta      = `${organizacionId}/temp/${uploadId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivo, { contentType: 'application/pdf', upsert: true })

    clearInterval(interval1)

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      setProgreso(0)
      setFaseProgreso(null)
      return
    }

    setRutaArchivo(ruta)
    setProgreso(35)
    setFaseProgreso('analizando')

    // Animar progreso durante el análisis IA: avanza hasta 95%
    const inicioAnalisis = Date.now()
    const interval2 = setInterval(() => {
      const transcurrido = Date.now() - inicioAnalisis
      // Easing: avanza rápido al principio y lento al final
      const ratio = Math.min(1, transcurrido / analisisEstimadoMs)
      const eased = 1 - Math.pow(1 - ratio, 2) // easeOutQuad
      const pct = 35 + eased * 60 // 35% → 95%
      setProgreso(Math.min(95, pct))
    }, 200)

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/analyze-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify({ ruta_archivo: ruta }),
    })

    clearInterval(interval2)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Error al analizar el contrato')
      setSubiendo(false)
      setProgreso(0)
      setFaseProgreso(null)
      return
    }

    setProgreso(100)
    const { resultado: r } = await res.json()
    // Pequeño delay para que la animación del 100% se vea
    await new Promise((r) => setTimeout(r, 300))
    setSubiendo(false)
    setProgreso(0)
    setFaseProgreso(null)
    setResultado(r)
    setFase('revision')
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    if (rutaArchivo) formData.set('ruta_archivo', rutaArchivo)
    if (resultado)   formData.set('ia_analisis_resultado', JSON.stringify(resultado))
    if (resultado?.confianza != null) formData.set('ia_confianza', String(resultado.confianza))
    startTransition(async () => {
      const res = await crearContratoDesdeAnalisisAction(formData)
      if (res?.error) { setError(res.error); return }
      if (res?.contratoId) {
        setContratoId(res.contratoId)
        setFase('documentos')
      }
    })
  }

  async function handleSubirDoc() {
    if (!archivoDoc || !tipoDoc || !contratoId) return
    setErrorDoc(null)
    setSubiendoDoc(true)

    const supabase = createClient()
    const ext  = archivoDoc.name.split('.').pop()
    const ruta = `${organizacionId}/${contratoId}/${tipoDoc}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivoDoc, { upsert: false })

    if (uploadError) {
      setErrorDoc(uploadError.message)
      setSubiendoDoc(false)
      return
    }

    const res = await registrarDocumentoAction(contratoId, tipoDoc, ruta)
    if (res?.error) {
      await supabase.storage.from('documentos').remove([ruta])
      setErrorDoc(res.error)
    } else {
      const label = TIPOS_ADICIONALES.find((t) => t.value === tipoDoc)?.label ?? tipoDoc
      setDocsSubidos((prev) => [...prev, { tipo: tipoDoc, label }])
      setTipoDoc('')
      setArchivoDoc(null)
      if (docInputRef.current) docInputRef.current.value = ''
    }
    setSubiendoDoc(false)
  }

  const confianza = resultado?.confianza ?? 0
  const confianzaColor = confianza >= 0.85
    ? 'bg-green-100 text-green-700'
    : confianza >= 0.65
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-600'
  const confianzaLabel = confianza >= 0.85 ? 'Alta confianza' : confianza >= 0.65 ? 'Confianza media' : 'Confianza baja'

  const STEPS = [
    { n: 1, label: 'Subir PDF' },
    { n: 2, label: 'Revisar datos' },
    { n: 3, label: 'Documentos' },
  ]
  const stepActual = fase === 'upload' ? 1 : fase === 'revision' ? 2 : 3

  return (
    <div className="max-w-2xl space-y-6">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              stepActual === s.n
                ? 'bg-zinc-900 text-white'
                : stepActual > s.n
                  ? 'text-zinc-500'
                  : 'text-zinc-400'
            }`}>
              {stepActual > s.n
                ? <Check className="w-3.5 h-3.5" />
                : <span className="w-4 h-4 flex items-center justify-center text-xs">{s.n}</span>
              }
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-zinc-300 mx-1" />}
          </div>
        ))}
      </div>

      <Separator />

      {/* ── Fase 1: Upload ── */}
      {fase === 'upload' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-zinc-600">
              Subí el PDF del contrato y vamos a extraer automáticamente todos los datos.
            </p>
          </div>

          <div
            onClick={() => !subiendo && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (!subiendo) setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              subiendo    ? 'border-zinc-300 bg-zinc-50 cursor-default' :
              isDragging  ? 'border-zinc-900 bg-zinc-100 cursor-copy' :
              archivo     ? 'border-zinc-400 bg-zinc-50 cursor-pointer' :
                            'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                if (f.size > 50 * 1024 * 1024) { setError('El archivo supera el límite de 50 MB.'); return }
                setArchivo(f); setError(null)
              }}
            />

            {subiendo ? (
              <div className="space-y-3 py-2">
                <p className="text-sm font-medium text-zinc-600">
                  {faseProgreso === 'subiendo' ? 'Subiendo el PDF...' : 'Analizando con Inteligencia Artificial...'}
                </p>
                <div className="max-w-xs mx-auto space-y-1.5">
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full transition-all duration-200 ease-out"
                      style={{ width: `${progreso}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 text-center">
                    {Math.round(progreso)}%
                    {faseProgreso === 'analizando' && progreso < 95 && ' · puede tardar hasta 1 minuto en contratos grandes'}
                  </p>
                </div>
              </div>
            ) : archivo ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-zinc-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-zinc-900">{archivo.name}</p>
                  <p className="text-xs text-zinc-500">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-sm font-medium text-zinc-600">Arrastrá el PDF acá o hacé clic para buscarlo</p>
                <p className="text-xs text-zinc-400">Máximo 50 MB · Solo PDF</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <Button
            onClick={handleAnalizar}
            disabled={!archivo || subiendo}
            className="w-full"
          >
            {subiendo ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</>
            ) : (
              <><Bot className="w-4 h-4 mr-2" /> Extraer datos del contrato</>
            )}
          </Button>
        </div>
      )}

      {/* ── Fase 2: Revisión ── */}
      {fase === 'revision' && resultado && (
        <form action={handleSubmit} className="space-y-6">

          {/* Badge de confianza */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-start gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap flex-shrink-0 ${confianzaColor}`}>
              {confianzaLabel} · {Math.round(confianza * 100)}%
            </span>
            {resultado.notas && (
              <p className="text-xs text-zinc-500 leading-relaxed">{resultado.notas}</p>
            )}
          </div>

          {/* Propiedad */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">1</span>
              Propiedad
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <select name="tipo_propiedad" defaultValue={resultado.propiedad?.tipo_propiedad ?? 'departamento'} className={SELECT_CLASS}>
                  <option value="departamento">Departamento</option>
                  <option value="casa">Casa</option>
                  <option value="ph">PH</option>
                  <option value="local">Local comercial</option>
                  <option value="oficina">Oficina</option>
                  <option value="galpon">Galpón</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Barrio <span className="text-zinc-400">(opc.)</span></Label>
                <Input name="barrio" defaultValue={resultado.propiedad?.barrio ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Calle</Label>
                <Input name="calle" required defaultValue={resultado.propiedad?.calle ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Número</Label>
                <Input name="numero" required defaultValue={resultado.propiedad?.numero ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Piso <span className="text-zinc-400">(opc.)</span></Label>
                <Input name="piso" defaultValue={resultado.propiedad?.piso ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Depto <span className="text-zinc-400">(opc.)</span></Label>
                <Input name="depto" defaultValue={resultado.propiedad?.depto ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ciudad</Label>
                <Input name="ciudad" required defaultValue={resultado.propiedad?.ciudad ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Provincia</Label>
              <select name="provincia" defaultValue={resultado.propiedad?.provincia ?? 'Buenos Aires'} className={SELECT_CLASS}>
                {PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inmobiliario / agente responsable <span className="text-zinc-400">(opc.)</span></Label>
              <div className="flex gap-2">
                <select
                  name="inmobiliario_id"
                  value={inmobSeleccionado}
                  onChange={(e) => setInmobSeleccionado(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Sin inmobiliario asignado</option>
                  {inmobiliarios.map((i) => (
                    <option key={i.id} value={i.id}>{i.nombre} {i.apellido}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInmobNuevoOpen(!inmobNuevoOpen)}
                  className="h-9 flex-shrink-0"
                >
                  {inmobNuevoOpen ? <X className="w-3.5 h-3.5" /> : <><span className="mr-1">+</span> Nuevo</>}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-400">Agente externo que derivó el alquiler. Tendrá acceso en modo solo lectura.</p>

              {inmobNuevoOpen && (
                <div
                  className="mt-2 p-3 bg-zinc-50 border border-zinc-200 rounded-md space-y-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.currentTarget.querySelector('button[data-submit]') as HTMLButtonElement)?.click()
                    }
                  }}
                >
                  <p className="text-xs font-medium text-zinc-700">Nuevo inmobiliario</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="inmob-nombre"
                      placeholder="Nombre"
                      className="h-8 text-xs"
                      disabled={inmobCreando}
                    />
                    <Input
                      id="inmob-apellido"
                      placeholder="Apellido"
                      className="h-8 text-xs"
                      disabled={inmobCreando}
                    />
                  </div>
                  <Input
                    id="inmob-email"
                    type="email"
                    placeholder="Email (para invitar acceso)"
                    className="h-8 text-xs"
                    disabled={inmobCreando}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="inmob-telefono"
                      type="tel"
                      placeholder="Teléfono (opc.)"
                      className="h-8 text-xs"
                      disabled={inmobCreando}
                    />
                    <Input
                      id="inmob-dni"
                      placeholder="DNI / CUIT (opc.)"
                      className="h-8 text-xs"
                      disabled={inmobCreando}
                    />
                  </div>

                  {inmobError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {inmobError}
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    data-submit
                    disabled={inmobCreando}
                    onClick={async () => {
                      setInmobError(null)
                      setInmobCreando(true)
                      const fd = new FormData()
                      fd.set('nombre',   (document.getElementById('inmob-nombre')   as HTMLInputElement)?.value ?? '')
                      fd.set('apellido', (document.getElementById('inmob-apellido') as HTMLInputElement)?.value ?? '')
                      fd.set('email',    (document.getElementById('inmob-email')    as HTMLInputElement)?.value ?? '')
                      fd.set('telefono', (document.getElementById('inmob-telefono') as HTMLInputElement)?.value ?? '')
                      fd.set('dni',      (document.getElementById('inmob-dni')      as HTMLInputElement)?.value ?? '')
                      const res = await crearInmobiliarioAction(fd)
                      setInmobCreando(false)
                      if (res?.error || !res?.id) {
                        setInmobError(res?.error ?? 'Error al crear')
                        return
                      }
                      const nuevo = {
                        id: res.id,
                        nombre: fd.get('nombre') as string,
                        apellido: fd.get('apellido') as string,
                      }
                      setInmobiliarios((prev) => [...prev, nuevo])
                      setInmobSeleccionado(res.id)
                      setInmobNuevoOpen(false)
                    }}
                  >
                    {inmobCreando ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Creando...</> : 'Crear'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Inquilinos (1 o 2) */}
          {(resultado.inquilinos?.length > 0 ? resultado.inquilinos : [null]).map((inq, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">2</span>
                {resultado.inquilinos?.length > 1 ? `Inquilino ${idx + 1}` : 'Inquilino'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input name={`inquilino_${idx}_nombre`} required defaultValue={inq?.nombre ?? ''} className={INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Apellido</Label>
                  <Input name={`inquilino_${idx}_apellido`} required defaultValue={inq?.apellido ?? ''} className={INPUT_CLASS} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email <span className="text-zinc-400">(para invitar acceso)</span></Label>
                  <Input name={`inquilino_${idx}_email`} type="email" defaultValue={inq?.email ?? ''} className={INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono <span className="text-zinc-400">(opc.)</span></Label>
                  <Input name={`inquilino_${idx}_telefono`} type="tel" defaultValue={inq?.telefono ?? ''} className={INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">DNI <span className="text-zinc-400">(opc.)</span></Label>
                  <Input name={`inquilino_${idx}_dni`} defaultValue={inq?.dni ?? ''} className={INPUT_CLASS} />
                </div>
              </div>
              {idx < (resultado.inquilinos?.length ?? 1) - 1 && <Separator />}
            </div>
          ))}
          {/* Campo oculto con cantidad de inquilinos */}
          <input type="hidden" name="inquilinos_count" value={resultado.inquilinos?.length ?? 1} />

          <Separator />

          {/* Propietario */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">3</span>
              Propietario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input name="propietario_nombre" defaultValue={resultado.propietario?.nombre ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Apellido</Label>
                <Input name="propietario_apellido" defaultValue={resultado.propietario?.apellido ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">DNI <span className="text-zinc-400">(opc.)</span></Label>
                <Input name="propietario_dni" defaultValue={resultado.propietario?.dni ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email <span className="text-zinc-400">(opc.)</span></Label>
                <Input name="propietario_email" type="email" defaultValue={resultado.propietario?.email ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teléfono <span className="text-zinc-400">(opc.)</span></Label>
                <Input name="propietario_telefono" defaultValue={resultado.propietario?.telefono ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Condiciones */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">4</span>
              Condiciones económicas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Fecha de inicio</Label>
                <Input name="fecha_inicio" type="date" required defaultValue={resultado.fecha_inicio ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha de fin</Label>
                <Input name="fecha_fin" type="date" required defaultValue={resultado.fecha_fin ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Monto inicial</Label>
                <div className="flex gap-2">
                  <select name="moneda" defaultValue={resultado.moneda ?? 'ars'} className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900">
                    <option value="ars">$ARS</option>
                    <option value="usd">USD</option>
                  </select>
                  <Input name="monto_inicial" type="number" required min="0" step="0.01"
                    defaultValue={resultado.monto_inicial ?? ''} className={INPUT_CLASS} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Depósito <span className="text-zinc-400">(opc.)</span></Label>
                <div className="flex gap-2">
                  <select name="moneda_deposito" defaultValue={resultado.moneda_deposito ?? 'ars'} className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900">
                    <option value="ars">$ARS</option>
                    <option value="usd">USD</option>
                  </select>
                  <Input name="monto_deposito" type="number" min="0" step="0.01"
                    defaultValue={resultado.monto_deposito ?? ''} className={INPUT_CLASS} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Índice de ajuste</Label>
                <select name="indice_ajuste" defaultValue={resultado.indice_ajuste ?? 'icl'} className={SELECT_CLASS}>
                  <option value="icl">ICL (BCRA)</option>
                  <option value="ipc">IPC (INDEC)</option>
                  <option value="fijo">Fijo</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Período de ajuste</Label>
                <select name="periodo_ajuste_meses" defaultValue={String(resultado.periodo_ajuste_meses ?? 3)} className={SELECT_CLASS}>
                  <option value="1">Mensual</option>
                  <option value="3">Trimestral</option>
                  <option value="4">Cuatrimestral</option>
                  <option value="6">Semestral</option>
                  <option value="12">Anual</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Día de vencimiento del pago mensual</Label>
                <Input
                  name="dia_vencimiento_pago"
                  type="number"
                  min="1"
                  max="31"
                  required
                  defaultValue={resultado.dia_vencimiento_pago ?? ''}
                  placeholder="ej: 10"
                  className={INPUT_CLASS}
                />
                <p className="text-[11px] text-zinc-400">Día del mes en que debe abonarse el alquiler (1-31).</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Requiere seguro de incendio</Label>
                <select
                  name="requiere_seguro_incendio"
                  required
                  defaultValue={resultado.requiere_seguro_incendio === true ? 'si' : resultado.requiere_seguro_incendio === false ? 'no' : ''}
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>Seleccionar...</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
                <p className="text-[11px] text-zinc-400">
                  {resultado.requiere_seguro_incendio === true
                    ? 'La IA detectó que el contrato exige seguro de incendio.'
                    : resultado.requiere_seguro_incendio === false
                    ? 'La IA no encontró mención explícita al seguro.'
                    : 'No se pudo determinar desde el contrato — definilo manualmente.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Facturas de servicios — ¿quién las carga?</Label>
                <select
                  name="facturas_servicios_las_carga"
                  required
                  defaultValue="inquilino"
                  className={SELECT_CLASS}
                >
                  <option value="inquilino">Inquilino</option>
                  <option value="propietario">Propietario</option>
                </select>
                <p className="text-[11px] text-zinc-400">Quién sube las facturas de luz, gas, agua y otros servicios.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Servicios aplicables al contrato</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 bg-white border border-zinc-200 rounded-lg px-3 py-2.5">
                {[
                  { value: 'electricidad',              label: 'Electricidad' },
                  { value: 'gas',                       label: 'Gas' },
                  { value: 'agua',                      label: 'Agua' },
                  { value: 'expensas_ordinarias',       label: 'Expensas ord.' },
                  { value: 'expensas_extraordinarias',  label: 'Expensas extra.' },
                  { value: 'municipal',                 label: 'ABL / Municipal' },
                  { value: 'otro',                      label: 'Otro' },
                ].map((s) => (
                  <label key={s.value} className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="servicios_aplicables"
                      value={s.value}
                      className="w-3.5 h-3.5 accent-zinc-900 cursor-pointer"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-zinc-400">El sistema va a generar pagos mensuales para cada servicio marcado.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modalidad de cobro de multa</Label>
                <select
                  name="modalidad_cobro"
                  required
                  defaultValue=""
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>Seleccionar...</option>
                  <option value="estricto">Estricto (cobrar multa)</option>
                  <option value="flexible">Flexible (no cobrar multa)</option>
                </select>
                <p className="text-[11px] text-zinc-400">
                  {resultado.observacion_modalidad_cobro
                    ? `IA: "${resultado.observacion_modalidad_cobro}"`
                    : 'Decidí si aplicás estrictamente la multa por mora o si preferís ser flexible.'}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tasa punitoria mensual (%)</Label>
                <Input
                  name="tasa_punitorio_mensual"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  defaultValue={resultado.tasa_punitorio_mensual ?? ''}
                  placeholder="ej: 5"
                  className={INPUT_CLASS}
                />
                <p className="text-[11px] text-zinc-400">Solo se usa si la modalidad es estricta.</p>
              </div>
            </div>
            {resultado.vencimiento_seguro_incendio && (
              <div className="space-y-1">
                <Label className="text-xs">Vencimiento seguro de incendio</Label>
                <Input name="vencimiento_seguro_incendio" type="date"
                  defaultValue={resultado.vencimiento_seguro_incendio} className={INPUT_CLASS} />
              </div>
            )}
          </div>

          {/* Cláusulas especiales */}
          {((resultado.clausulas_especiales?.length ?? 0) > 0 || resultado.notas) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">
                    <Bot className="w-3 h-3" />
                  </span>
                  Condiciones del contrato
                  <span className="ml-auto text-xs font-normal text-zinc-400">Generado por IA</span>
                </h3>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 space-y-3">
                  {(resultado.clausulas_especiales?.length ?? 0) > 0 && (
                    <ul className="space-y-2">
                      {resultado.clausulas_especiales.map((clausula: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-700">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                          {clausula}
                        </li>
                      ))}
                    </ul>
                  )}
                  {resultado.notas && (
                    <p className="text-xs text-zinc-500 border-t border-zinc-200 pt-3">{resultado.notas}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setFase('upload')}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando contrato...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar y crear contrato</>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ── Fase 3: Documentos adicionales ── */}
      {fase === 'documentos' && contratoId && (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-zinc-600">
              El contrato fue creado. Podés subir ahora los documentos adicionales o hacerlo más tarde desde el detalle del contrato.
            </p>
          </div>

          {/* Docs ya subidos */}
          {docsSubidos.length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
              {docsSubidos.map((d, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-zinc-700">{d.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de upload */}
          <div className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-700">Subir documento adicional</p>

            <TipoCombobox
              opciones={TIPOS_ADICIONALES}
              value={tipoDoc}
              onChange={setTipoDoc}
              disabled={subiendoDoc}
            />

            <div
              onClick={() => !subiendoDoc && docInputRef.current?.click()}
              className="border border-dashed border-zinc-300 rounded-md p-3 text-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            >
              <input
                ref={docInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivoDoc(f) }}
              />
              {archivoDoc ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-700 font-medium truncate max-w-xs">{archivoDoc.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setArchivoDoc(null); if (docInputRef.current) docInputRef.current.value = '' }}
                    className="text-zinc-400 hover:text-zinc-600 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-zinc-400">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">PDF o imagen · máx. 20 MB</span>
                </div>
              )}
            </div>

            {errorDoc && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {errorDoc}
              </div>
            )}

            <Button
              onClick={handleSubirDoc}
              disabled={!archivoDoc || !tipoDoc || subiendoDoc}
              variant="outline"
              className="w-full"
            >
              {subiendoDoc
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Subiendo...</>
                : <><Upload className="w-4 h-4 mr-2" /> Subir documento</>
              }
            </Button>
          </div>

          {/* Acciones finales */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push(`/contratos/${contratoId}`)}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Saltar por ahora
            </button>
            <Button onClick={() => router.push(`/contratos/${contratoId}`)}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Ir al contrato
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
