'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { subirComprobanteAction } from './actions'

interface Props {
  pagoId: string
  contratoId: string
  organizacionId: string
}

export function UploadComprobante({ pagoId, contratoId, organizacionId }: Props) {
  const [open, setOpen]         = useState(false)
  const [archivo, setArchivo]   = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [ok, setOk]             = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)
  const [, startTransition]     = useTransition()

  if (ok) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700">
        <CheckCircle2 className="w-3.5 h-3.5" /> Comprobante enviado
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors"
      >
        Subir comprobante
      </button>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!archivo) return
    setError(null)
    setSubiendo(true)

    const supabase = createClient()
    const ext      = archivo.name.split('.').pop()
    const ruta     = `${organizacionId}/${contratoId}/${pagoId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(ruta, archivo, { upsert: true })

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      return
    }

    const fd = new FormData(e.currentTarget)
    fd.set('ruta_archivo', ruta)

    startTransition(async () => {
      const res = await subirComprobanteAction(fd)
      if (res?.error) {
        setError(res.error)
      } else {
        setOk(true)
      }
      setSubiendo(false)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
      <input type="hidden" name="pago_id" value={pagoId} />
      <input type="hidden" name="contrato_id" value={contratoId} />

      {/* Selector de archivo */}
      <div>
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
              <span className="text-xs text-zinc-700 font-medium">{archivo.name}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-zinc-400">
              <Upload className="w-4 h-4" />
              <span className="text-xs">Seleccionar archivo (PDF o imagen)</span>
            </div>
          )}
        </div>
      </div>

      {/* Campos opcionales */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de transferencia <span className="text-zinc-400">(opc.)</span></Label>
          <Input name="fecha_transferencia" type="date" className="h-7 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Referencia bancaria <span className="text-zinc-400">(opc.)</span></Label>
          <Input name="referencia_bancaria" className="h-7 text-xs" placeholder="Nro. operación" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={subiendo}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!archivo || subiendo}>
          {subiendo ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enviando...</> : 'Enviar comprobante'}
        </Button>
      </div>
    </form>
  )
}
