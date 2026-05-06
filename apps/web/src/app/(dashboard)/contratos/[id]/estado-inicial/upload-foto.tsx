'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, AlertCircle, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { registrarFotoEstadoInicialAction } from './actions'

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error'
type Item = { file: File; desc: string; status: ItemStatus }

interface Props {
  contratoId: string
  organizacionId: string
  disabled?: boolean
}

export function UploadFotoEstadoInicial({ contratoId, organizacionId, disabled }: Props) {
  const [items, setItems]   = useState<Item[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function agregarArchivos(files: FileList | null) {
    if (!files) return
    const nuevos = Array.from(files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      return ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)
    })
    setItems((prev) => [...prev, ...nuevos.map((f) => ({ file: f, desc: '', status: 'pending' as const }))].slice(0, 30))
  }

  function quitarItem(i: number) {
    setItems((prev) => prev.filter((_, j) => j !== i))
  }

  function actualizarDesc(i: number, desc: string) {
    setItems((prev) => prev.map((item, j) => j === i ? { ...item, desc } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0 || disabled) return
    setSubiendo(true)

    const supabase = createClient()
    let alguoOk = false

    for (let i = 0; i < items.length; i++) {
      if (items[i].status === 'done') continue
      setItems((prev) => prev.map((x, j) => j === i ? { ...x, status: 'uploading' } : x))

      const item = items[i]
      const ext  = item.file.name.split('.').pop() || 'jpg'
      const ruta = `${organizacionId}/${contratoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('estado-inicial')
        .upload(ruta, item.file, { upsert: false })

      if (uploadError) {
        setItems((prev) => prev.map((x, j) => j === i ? { ...x, status: 'error' } : x))
        continue
      }

      const fd = new FormData()
      fd.set('contrato_id', contratoId)
      fd.set('ruta_archivo', ruta)
      if (item.desc.trim()) fd.set('descripcion', item.desc.trim())

      const res = await registrarFotoEstadoInicialAction(fd)
      if (res?.error) {
        setItems((prev) => prev.map((x, j) => j === i ? { ...x, status: 'error' } : x))
      } else {
        setItems((prev) => prev.map((x, j) => j === i ? { ...x, status: 'done' } : x))
        alguoOk = true
      }
    }

    setSubiendo(false)
    if (alguoOk) {
      setTimeout(() => setItems((prev) => prev.filter((x) => x.status !== 'done')), 600)
    }
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
      <div
        onClick={() => !subiendo && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); agregarArchivos(e.dataTransfer.files) }}
        className="border border-dashed border-zinc-300 rounded-md p-4 text-center cursor-pointer hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { agregarArchivos(e.target.files); e.target.value = '' }}
        />
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Seleccionar fotos · Ctrl+clic para varias</span>
        </div>
        <p className="text-xs text-zinc-300 mt-1">JPG, PNG, WebP, HEIC · arrastrá o hacé clic</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 items-center bg-zinc-50 rounded-lg p-2 border border-zinc-100">
              <img
                src={URL.createObjectURL(item.file)}
                alt=""
                className="w-14 h-14 object-cover rounded flex-shrink-0 border border-zinc-200"
              />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs text-zinc-400 truncate">{item.file.name}</p>
                <input
                  type="text"
                  value={item.desc}
                  onChange={(e) => actualizarDesc(i, e.target.value)}
                  placeholder="Descripción (opcional)"
                  maxLength={200}
                  disabled={subiendo}
                  className="w-full text-sm border border-zinc-200 rounded px-2 py-1 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 disabled:opacity-50"
                />
              </div>
              <div className="flex-shrink-0 w-5 flex items-center justify-center">
                {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />}
                {item.status === 'done'      && <Check className="w-4 h-4 text-green-500" />}
                {item.status === 'error'     && <AlertCircle className="w-4 h-4 text-red-500" />}
                {item.status === 'pending' && !subiendo && (
                  <button type="button" onClick={() => quitarItem(i)} className="text-zinc-300 hover:text-zinc-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <Button type="submit" size="sm" disabled={subiendo || items.every((x) => x.status === 'done')} className="w-full sm:w-auto">
          {subiendo
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Subiendo…</>
            : items.length === 1 ? 'Subir foto' : `Subir ${items.length} fotos`}
        </Button>
      )}
    </form>
  )
}
