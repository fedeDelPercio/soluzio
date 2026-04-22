'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Loader2, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { subirArchivoPagoServicioAction } from './actions'

interface Props {
  pagoId: string
  contratoId: string
  organizacionId: string
  tipo: 'factura' | 'pago'
  pedirMonto?: boolean
}

export function UploadArchivoServicio({ pagoId, contratoId, organizacionId, tipo, pedirMonto }: Props) {
  const [open, setOpen]         = useState(false)
  const [archivo, setArchivo]   = useState<File | null>(null)
  const [monto, setMonto]       = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)
  const [, startTransition]     = useTransition()

  const etiqueta = tipo === 'factura' ? 'Subir factura' : 'Subir comprobante de pago'

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
      >
        {etiqueta}
      </button>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!archivo) return
    setError(null)
    setSubiendo(true)

    const form = e.currentTarget
    const supabase = createClient()
    const ext      = archivo.name.split('.').pop() || 'pdf'
    const ts       = Date.now()
    const ruta     = `${organizacionId}/${contratoId}/${pagoId}-${tipo}-${ts}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(ruta, archivo, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      return
    }

    const fd = new FormData(form)
    fd.set('ruta_archivo', ruta)

    startTransition(async () => {
      const res = await subirArchivoPagoServicioAction(fd)
      if (res?.error) {
        setError(res.error)
        setSubiendo(false)
      } else {
        setArchivo(null)
        setMonto('')
        setOpen(false)
        setSubiendo(false)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 p-2.5 bg-zinc-50 rounded-md border border-zinc-200">
      <input type="hidden" name="pago_id" value={pagoId} />
      <input type="hidden" name="contrato_id" value={contratoId} />
      <input type="hidden" name="tipo_comprobante" value={tipo} />

      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        className="border border-dashed border-zinc-300 rounded-md p-2 text-center cursor-pointer hover:border-zinc-400 hover:bg-white transition-colors"
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
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs text-zinc-700">{archivo.name}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <Upload className="w-3.5 h-3.5" />
            <span className="text-xs">Seleccionar archivo</span>
          </div>
        )}
      </div>

      {pedirMonto && (
        <div className="space-y-1">
          <Label className="text-[11px]">Monto de la factura</Label>
          <Input
            name="monto"
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="ej: 25000"
            className="h-7 text-xs"
          />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-1.5 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={subiendo} className="h-7 text-xs">
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!archivo || subiendo} className="h-7 text-xs">
          {subiendo ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Subiendo</> : 'Subir'}
        </Button>
      </div>
    </form>
  )
}
