'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, X, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  previewEliminarContratoAction,
  eliminarContratoAction,
  type PreviewEliminarContrato,
} from './contrato-actions'

interface Props {
  contratoId: string
  open: boolean
  onClose: () => void
}

export function EliminarContratoDialog({ contratoId, open, onClose }: Props) {
  const router = useRouter()
  const [preview, setPreview]               = useState<PreviewEliminarContrato | null>(null)
  const [borrarPropiedad, setBorrarProp]    = useState(false)
  const [borrarInquilinos, setBorrarInq]    = useState(false)
  const [error, setError]                    = useState<string | null>(null)
  const [pending, startTransition]           = useTransition()

  // Cargar el preview al abrir
  useEffect(() => {
    if (!open) return
    setPreview(null)
    setBorrarProp(false)
    setBorrarInq(false)
    setError(null)
    previewEliminarContratoAction(contratoId).then(setPreview)
  }, [open, contratoId])

  // Cerrar con ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const propiedad        = preview?.propiedad ?? null
  const inquilinos       = preview?.inquilinos ?? []
  const propBloqueada    = !!propiedad && !propiedad.puedeBorrar
  const inqsBloqueados   = inquilinos.filter((i) => !i.puedeBorrar)
  const inqsLibres       = inquilinos.filter((i) => i.puedeBorrar)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const res = await eliminarContratoAction(contratoId, {
        borrarPropiedad: borrarPropiedad && !propBloqueada,
        borrarInquilinos: borrarInquilinos && inqsLibres.length > 0,
      })
      if (!res.ok) {
        setError(res.error ?? 'No se pudo eliminar.')
        return
      }
      onClose()
      router.replace('/contratos')
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-zinc-100">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">Eliminar contrato</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Esta acción no se puede deshacer. Se borran pagos, comprobantes, documentos y solicitudes asociadas al contrato.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 -mt-1"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {!preview ? (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando...
            </div>
          ) : !preview.ok ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {preview.error ?? 'Error al cargar la información del contrato.'}
            </p>
          ) : (
            <>
              <p className="text-sm text-zinc-700">
                ¿Querés eliminar también la propiedad y los inquilinos asociados? Solo se borran si no están vinculados a otro contrato.
              </p>

              {/* Propiedad */}
              {propiedad && (
                <label
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    propBloqueada ? 'bg-zinc-50 border-zinc-200 cursor-not-allowed' : 'border-zinc-200 hover:bg-zinc-50 cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={borrarPropiedad && !propBloqueada}
                    disabled={propBloqueada}
                    onChange={(e) => setBorrarProp(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-zinc-900 truncate">{propiedad.descripcion}</p>
                      {propBloqueada && <Lock className="w-3 h-3 text-zinc-400 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {propBloqueada ? propiedad.razon : 'También eliminar esta propiedad'}
                    </p>
                  </div>
                </label>
              )}

              {/* Inquilinos libres */}
              {inqsLibres.length > 0 && (
                <label className="flex items-start gap-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 cursor-pointer px-3 py-2.5 transition-colors">
                  <input
                    type="checkbox"
                    checked={borrarInquilinos}
                    onChange={(e) => setBorrarInq(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      Eliminar {inqsLibres.length === 1 ? 'al inquilino' : `a los ${inqsLibres.length} inquilinos`}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {inqsLibres.map((i) => i.nombre).join(', ')}
                    </p>
                  </div>
                </label>
              )}

              {/* Inquilinos bloqueados */}
              {inqsBloqueados.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-zinc-400" />
                    <p className="text-xs font-medium text-zinc-600">
                      Inquilino{inqsBloqueados.length > 1 ? 's' : ''} que se mantendrá{inqsBloqueados.length > 1 ? 'n' : ''}
                    </p>
                  </div>
                  {inqsBloqueados.map((i) => (
                    <p key={i.id} className="text-xs text-zinc-500 pl-4.5">
                      {i.nombre} — {i.razon}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 bg-zinc-50/50 rounded-b-xl">
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={pending || !preview?.ok}
          >
            {pending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Eliminando...</> : 'Eliminar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
