'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { crearContratoDesdeAnalisisAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, FileText, Loader2, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, Check, Bot,
} from 'lucide-react'

type Fase = 'upload' | 'revision' | 'creando'

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

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900'
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
}

export function ContratoWizard({ organizacionId }: WizardProps) {
  const [fase, setFase] = useState<Fase>('upload')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Upload
  const inputRef   = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo]       = useState<File | null>(null)
  const [subiendo, setSubiendo]     = useState(false)
  const [rutaArchivo, setRutaArchivo] = useState<string | null>(null)
  const [resultado, setResultado]   = useState<ResultadoAnalisis | null>(null)

  async function handleAnalizar() {
    if (!archivo) return
    setError(null)
    setSubiendo(true)

    const supabase  = createClient()
    const uploadId  = crypto.randomUUID()
    const ruta      = `${organizacionId}/temp/${uploadId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivo, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      return
    }

    setRutaArchivo(ruta)

    const res = await fetch('/api/analyze-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruta_archivo: ruta }),
    })

    setSubiendo(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Error al analizar el contrato')
      return
    }

    const { resultado: r } = await res.json()
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
      if (res?.error) setError(res.error)
    })
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
    { n: 3, label: 'Listo' },
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
              Subí el PDF del contrato y Claude va a extraer automáticamente todos los datos.
            </p>
          </div>

          <div
            onClick={() => !subiendo && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
              subiendo ? 'border-zinc-300 bg-zinc-50 cursor-default' :
              archivo  ? 'border-zinc-400 bg-zinc-50 cursor-pointer' :
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
                if (f) { setArchivo(f); setError(null) }
              }}
            />

            {subiendo ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 text-zinc-400 mx-auto animate-spin" />
                <p className="text-sm font-medium text-zinc-600">Claude está analizando el contrato...</p>
                <p className="text-xs text-zinc-400">Esto puede tardar unos segundos</p>
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
                <p className="text-sm font-medium text-zinc-600">Hacé clic para seleccionar el PDF del contrato</p>
                <p className="text-xs text-zinc-400">Máximo 10 MB · Solo PDF</p>
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
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${confianzaColor}`}>
              {confianzaLabel} ({Math.round(confianza * 100)}%)
            </span>
            {resultado.notas && (
              <p className="text-xs text-zinc-500 italic">{resultado.notas}</p>
            )}
          </div>

          {/* Propiedad */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">1</span>
              Propiedad
            </h3>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Calle</Label>
                <Input name="calle" required defaultValue={resultado.propiedad?.calle ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Número</Label>
                <Input name="numero" required defaultValue={resultado.propiedad?.numero ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
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
          </div>

          <Separator />

          {/* Inquilinos (1 o 2) */}
          {(resultado.inquilinos?.length > 0 ? resultado.inquilinos : [null]).map((inq, idx) => (
            <div key={idx} className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center text-xs text-zinc-600">2</span>
                {resultado.inquilinos?.length > 1 ? `Inquilino ${idx + 1}` : 'Inquilino'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre</Label>
                  <Input name={`inquilino_${idx}_nombre`} required defaultValue={inq?.nombre ?? ''} className={INPUT_CLASS} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Apellido</Label>
                  <Input name={`inquilino_${idx}_apellido`} required defaultValue={inq?.apellido ?? ''} className={INPUT_CLASS} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email <span className="text-zinc-400">(para invitar acceso)</span></Label>
                  <Input name={`inquilino_${idx}_email`} type="email" defaultValue={inq?.email ?? ''} className={INPUT_CLASS} />
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input name="propietario_nombre" defaultValue={resultado.propietario?.nombre ?? ''} className={INPUT_CLASS} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Apellido</Label>
                <Input name="propietario_apellido" defaultValue={resultado.propietario?.apellido ?? ''} className={INPUT_CLASS} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
                  <select name="moneda" defaultValue={resultado.moneda ?? 'ars'} className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900">
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
                  <select name="moneda_deposito" defaultValue={resultado.moneda_deposito ?? 'ars'} className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900">
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
            {resultado.vencimiento_seguro_incendio && (
              <div className="space-y-1">
                <Label className="text-xs">Vencimiento seguro de incendio</Label>
                <Input name="vencimiento_seguro_incendio" type="date"
                  defaultValue={resultado.vencimiento_seguro_incendio} className={INPUT_CLASS} />
              </div>
            )}
          </div>

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
    </div>
  )
}
