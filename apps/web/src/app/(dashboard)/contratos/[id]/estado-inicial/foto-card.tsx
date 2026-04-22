'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, MessageSquare, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  actualizarDescripcionFotoAction,
  agregarFeedbackFotoAction,
  eliminarFotoEstadoInicialAction,
} from './actions'

interface Props {
  foto: {
    id: string
    ruta_archivo: string
    descripcion: string | null
    feedback_admin: string | null
    url: string
  }
  esDueño: boolean
  esAdmin: boolean
}

export function FotoCard({ foto, esDueño, esAdmin }: Props) {
  const [editandoDesc, setEditandoDesc]   = useState(false)
  const [descripcion, setDescripcion]     = useState(foto.descripcion ?? '')
  const [editandoFb, setEditandoFb]       = useState(false)
  const [feedback, setFeedback]           = useState(foto.feedback_admin ?? '')
  const [, startTransition]               = useTransition()

  const puedeBorrar = esAdmin || (esDueño && !foto.feedback_admin)

  function guardarDescripcion() {
    startTransition(async () => {
      await actualizarDescripcionFotoAction(foto.id, descripcion)
      setEditandoDesc(false)
    })
  }

  function guardarFeedback() {
    startTransition(async () => {
      await agregarFeedbackFotoAction(foto.id, feedback)
      setEditandoFb(false)
    })
  }

  function borrar() {
    if (!confirm('¿Eliminar esta foto?')) return
    startTransition(async () => {
      await eliminarFotoEstadoInicialAction(foto.id)
    })
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <a href={foto.url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto.url} alt={foto.descripcion ?? 'Foto estado inicial'} className="w-full h-full object-cover" />
      </a>

      <div className="p-3 space-y-2">
        {/* Descripción */}
        {editandoDesc ? (
          <div className="space-y-1.5">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full text-xs border border-zinc-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              placeholder="Descripción (opcional)"
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={guardarDescripcion} className="h-6 px-2 text-xs">
                <Check className="w-3 h-3 mr-1" /> Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDescripcion(foto.descripcion ?? ''); setEditandoDesc(false) }} className="h-6 px-2 text-xs">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 text-xs text-zinc-600">
            <p className="flex-1 leading-relaxed">
              {foto.descripcion || <span className="text-zinc-400 italic">Sin descripción</span>}
            </p>
            {esDueño && (
              <button onClick={() => setEditandoDesc(true)} className="text-zinc-400 hover:text-zinc-700 flex-shrink-0">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Feedback admin */}
        {(foto.feedback_admin || esAdmin) && (
          <div className="border-t border-zinc-100 pt-2">
            {editandoFb ? (
              <div className="space-y-1.5">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={2}
                  className="w-full text-xs border border-amber-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-300 bg-amber-50"
                  placeholder="Feedback del admin..."
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={guardarFeedback} className="h-6 px-2 text-xs">
                    <Check className="w-3 h-3 mr-1" /> Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setFeedback(foto.feedback_admin ?? ''); setEditandoFb(false) }} className="h-6 px-2 text-xs">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-xs text-amber-700">
                <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <p className="flex-1 leading-relaxed">
                  {foto.feedback_admin || <span className="text-zinc-400 italic">Sin feedback</span>}
                </p>
                {esAdmin && (
                  <button onClick={() => setEditandoFb(true)} className="text-amber-500 hover:text-amber-700 flex-shrink-0">
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        {puedeBorrar && (
          <button
            onClick={borrar}
            className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" /> Eliminar
          </button>
        )}
      </div>
    </div>
  )
}
