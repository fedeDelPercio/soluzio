'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface PdfUploadProps {
  contratoId: string
  documentoId: string
  organizacionId: string
}

type Estado = 'idle' | 'subiendo' | 'procesando' | 'ok' | 'error'

export function PdfUpload({ contratoId, documentoId, organizacionId }: PdfUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('idle')
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function handleUpload() {
    if (!archivo) return
    setEstado('subiendo')
    setMensaje(null)

    const supabase = createClient()

    // 1. Subir el PDF a Storage
    const ruta = `${organizacionId}/${contratoId}/${documentoId}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(ruta, archivo, { contentType: 'application/pdf', upsert: true })

    if (uploadError) {
      setEstado('error')
      setMensaje(uploadError.message)
      return
    }

    // 2. Actualizar el documento con la ruta y estado "subido"
    await (supabase as any)
      .from('documentos')
      .update({ ruta_archivo: ruta, estado: 'subido' })
      .eq('id', documentoId)

    // 3. Llamar a la Edge Function para procesar con IA
    setEstado('procesando')
    setMensaje('Claude está analizando el contrato...')

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-contract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ contrato_id: contratoId, ruta_archivo: ruta }),
      }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setEstado('error')
      setMensaje(err.error ?? 'Error al procesar el contrato con IA')
      return
    }

    setEstado('ok')
    setMensaje('¡Análisis completado! Revisá los datos extraídos.')

    setTimeout(() => {
      router.push(`/contratos/${contratoId}/analisis`)
    }, 1500)
  }

  return (
    <div className="space-y-4">
      {/* Drop area */}
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          archivo
            ? 'border-zinc-400 bg-zinc-50'
            : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) { setArchivo(f); setEstado('idle'); setMensaje(null) }
          }}
        />

        {archivo ? (
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

      {/* Estado */}
      {estado === 'subiendo' && (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Subiendo archivo...
        </div>
      )}
      {estado === 'procesando' && (
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          {mensaje}
        </div>
      )}
      {estado === 'ok' && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {mensaje}
        </div>
      )}
      {estado === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {mensaje}
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!archivo || estado === 'subiendo' || estado === 'procesando' || estado === 'ok'}
        className="w-full"
      >
        {estado === 'subiendo' || estado === 'procesando'
          ? 'Procesando...'
          : 'Analizar contrato con IA'}
      </Button>
    </div>
  )
}
