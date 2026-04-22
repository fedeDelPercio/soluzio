'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { registrarDocumentoAction } from './actions'

const TIPOS_ADMIN = [
  { value: 'contrato',           label: 'Contrato PDF' },
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

const TIPOS_INQUILINO = [
  { value: 'dni_inquilino',  label: 'DNI Inquilino' },
  { value: 'seguro_incendio', label: 'Seguro de incendio' },
  { value: 'otro',           label: 'Otro' },
]

function TipoCombobox({
  opciones,
  value,
  onChange,
  disabled,
}: {
  opciones: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [query, setQuery]       = useState('')
  const [abierto, setAbierto]   = useState(false)
  const containerRef            = useRef<HTMLDivElement>(null)

  const seleccionado = opciones.find((o) => o.value === value)
  const filtradas = query
    ? opciones.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opciones

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false)
        // Si el usuario escribió pero no seleccionó, resetear
        if (!value) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  function seleccionar(opcion: { value: string; label: string }) {
    onChange(opcion.value)
    setQuery(opcion.label)
    setAbierto(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onChange('') // limpiar selección mientras escribe
    setAbierto(true)
  }

  function handleFocus() {
    setAbierto(true)
    if (seleccionado) setQuery('')
  }

  function handleBlur() {
    // Pequeño delay para permitir que el click en opciones se procese
    setTimeout(() => {
      if (!value) setQuery('')
    }, 150)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={abierto && !seleccionado ? query : (seleccionado?.label ?? query)}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder="Buscar tipo de documento..."
          className="w-full text-xs border border-zinc-200 rounded-md px-2.5 py-1.5 pr-7 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 disabled:opacity-50"
        />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
      </div>

      {abierto && filtradas.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtradas.map((o) => (
            <li
              key={o.value}
              onMouseDown={(e) => { e.preventDefault(); seleccionar(o) }}
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-zinc-50 transition-colors ${
                o.value === value ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-700'
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}

      {abierto && filtradas.length === 0 && query && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-md shadow-lg px-3 py-2 text-xs text-zinc-400">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}

interface Props {
  contratoId: string
  organizacionId: string
  esAdmin: boolean
}

export function UploadDocumento({ contratoId, organizacionId, esAdmin }: Props) {
  const [open, setOpen]           = useState(false)
  const [archivo, setArchivo]     = useState<File | null>(null)
  const [tipo, setTipo]           = useState('')
  const [subiendo, setSubiendo]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [ok, setOk]               = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)
  const [, startTransition]       = useTransition()

  const tipos = esAdmin ? TIPOS_ADMIN : TIPOS_INQUILINO

  function reset() {
    setOpen(false)
    setArchivo(null)
    setTipo('')
    setError(null)
    setOk(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!archivo || !tipo) return
    setError(null)
    setSubiendo(true)

    const supabase = createClient()
    const ext  = archivo.name.split('.').pop()
    const ruta = `${organizacionId}/${contratoId}/${tipo}_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivo, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      return
    }

    startTransition(async () => {
      const res = await registrarDocumentoAction(contratoId, tipo, ruta)
      if (res?.error) {
        // Revertir el archivo si falla el registro
        await supabase.storage.from('documentos').remove([ruta])
        setError(res.error)
      } else {
        setOk(true)
        setTimeout(reset, 1500)
      }
      setSubiendo(false)
    })
  }

  if (ok) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700 px-3 py-2">
        <CheckCircle2 className="w-3.5 h-3.5" /> Documento subido correctamente
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-md transition-colors"
      >
        <Upload className="w-3.5 h-3.5" />
        Subir documento
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-zinc-50 border-t border-zinc-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-700">Subir documento</p>
        <button type="button" onClick={reset} className="text-zinc-400 hover:text-zinc-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tipo de documento */}
      <TipoCombobox
        opciones={tipos}
        value={tipo}
        onChange={setTipo}
        disabled={subiendo}
      />

      {/* Selector de archivo */}
      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        className="border border-dashed border-zinc-300 rounded-md p-3 text-center cursor-pointer hover:border-zinc-400 hover:bg-white transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivo(f) }}
        />
        {archivo ? (
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <span className="text-xs text-zinc-700 font-medium truncate max-w-[200px]">{archivo.name}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <Upload className="w-4 h-4" />
            <span className="text-xs">PDF o imagen · máx. 20 MB</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={reset} disabled={subiendo}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!archivo || !tipo || subiendo}>
          {subiendo
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Subiendo...</>
            : 'Subir'}
        </Button>
      </div>
    </form>
  )
}
