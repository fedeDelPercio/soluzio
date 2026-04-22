'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, Loader2, AlertCircle, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { registrarFotoEstadoInicialAction } from './actions'

interface Props {
  contratoId: string
  organizacionId: string
  disabled?: boolean
}

export function UploadFotoEstadoInicial({ contratoId, organizacionId, disabled }: Props) {
  const [archivo, setArchivo]     = useState<File | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [subiendo, setSubiendo]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)
  const [, startTransition]       = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!archivo || disabled) return
    setError(null)
    setSubiendo(true)

    const form = e.currentTarget

    const supabase = createClient()
    const ext      = archivo.name.split('.').pop() || 'jpg'
    const ts       = Date.now()
    const ruta     = `${organizacionId}/${contratoId}/${ts}-${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('estado-inicial')
      .upload(ruta, archivo, { upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setSubiendo(false)
      return
    }

    const fd = new FormData(form)
    fd.set('ruta_archivo', ruta)

    startTransition(async () => {
      const res = await registrarFotoEstadoInicialAction(fd)
      if (res?.error) {
        setError(res.error)
      } else {
        setArchivo(null)
        setDescripcion('')
        if (inputRef.current) inputRef.current.value = ''
      }
      setSubiendo(false)
    })
  }

  if (disabled) {
    return (
      <div className="text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-center">
        Llegaste al límite de 30 fotos.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-white rounded-lg border border-zinc-200 p-4">
      <input type="hidden" name="contrato_id" value={contratoId} />

      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        className="border border-dashed border-zinc-300 rounded-md p-4 text-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setArchivo(f) }}
        />
        {archivo ? (
          <div className="flex items-center justify-center gap-2">
            <ImagePlus className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-700 font-medium">{archivo.name}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-zinc-400">
            <Upload className="w-4 h-4" />
            <span className="text-sm">Seleccionar foto (JPG / PNG / WebP)</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Descripción <span className="text-zinc-400">(opcional)</span></Label>
        <Input
          name="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="ej: cocina — azulejo roto sobre la mesada"
          className="h-8 text-sm"
        />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" size="sm" disabled={!archivo || subiendo} className="w-full sm:w-auto">
        {subiendo ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Subiendo...</> : 'Subir foto'}
      </Button>
    </form>
  )
}
