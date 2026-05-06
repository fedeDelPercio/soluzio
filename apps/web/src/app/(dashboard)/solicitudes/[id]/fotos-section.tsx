'use client'

import { useState } from 'react'
import { Image as ImageIcon, Pencil, Check, X, MessageSquarePlus } from 'lucide-react'
import { actualizarDescripcionFotoAction } from '../actions'

type Foto = {
  id: string
  ruta: string
  url: string
  descripcion: string | null
}

interface Props {
  fotos: Foto[]
  canEdit: boolean
}

export function FotosSection({ fotos: initialFotos, canEdit }: Props) {
  const [fotos, setFotos]           = useState<Foto[]>(initialFotos)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editValue, setEditValue]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [showGeneral, setShowGeneral] = useState(false)
  const [generalValue, setGeneralValue] = useState('')
  const [savingGeneral, setSavingGeneral] = useState(false)

  if (fotos.length === 0) return null

  function startEdit(foto: Foto) {
    setEditingId(foto.id)
    setEditValue(foto.descripcion ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  async function saveEdit(fotoId: string) {
    setSaving(true)
    const result = await actualizarDescripcionFotoAction(fotoId, editValue)
    if (result.ok) {
      setFotos((prev) => prev.map((f) => f.id === fotoId ? { ...f, descripcion: editValue.trim() || null } : f))
      setEditingId(null)
    }
    setSaving(false)
  }

  async function saveGeneral() {
    if (!generalValue.trim()) return
    setSavingGeneral(true)
    // Aplica a todas las fotos que aún no tienen descripción
    const sinDesc = fotos.filter((f) => !f.descripcion)
    await Promise.all(sinDesc.map((f) => actualizarDescripcionFotoAction(f.id, generalValue)))
    setFotos((prev) =>
      prev.map((f) => f.descripcion ? f : { ...f, descripcion: generalValue.trim() })
    )
    setGeneralValue('')
    setShowGeneral(false)
    setSavingGeneral(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-700 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4" /> Fotos adjuntas
        </p>
        {canEdit && fotos.some((f) => !f.descripcion) && (
          <button
            type="button"
            onClick={() => setShowGeneral((v) => !v)}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Comentar todas
          </button>
        )}
      </div>

      {/* Comentario general */}
      {showGeneral && (
        <div className="flex gap-2 items-center bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
          <input
            autoFocus
            type="text"
            value={generalValue}
            onChange={(e) => setGeneralValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveGeneral(); if (e.key === 'Escape') setShowGeneral(false) }}
            placeholder="Comentario para fotos sin descripción…"
            maxLength={200}
            className="flex-1 text-sm bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={saveGeneral}
            disabled={savingGeneral || !generalValue.trim()}
            className="text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-40 transition-colors"
          >
            Aplicar
          </button>
          <button type="button" onClick={() => setShowGeneral(false)} className="text-zinc-400 hover:text-zinc-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid de fotos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fotos.map((foto) => (
          <div key={foto.id} className="space-y-1.5">
            <a href={foto.url} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={foto.url}
                alt="Foto solicitud"
                className="w-full aspect-square object-cover rounded-lg border border-zinc-200 hover:opacity-90 transition-opacity"
              />
            </a>

            {/* Descripción / editor inline */}
            {editingId === foto.id ? (
              <div className="flex gap-1 items-center">
                <input
                  autoFocus
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(foto.id); if (e.key === 'Escape') cancelEdit() }}
                  maxLength={200}
                  className="flex-1 text-xs border border-zinc-300 rounded px-1.5 py-1 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => saveEdit(foto.id)}
                  disabled={saving}
                  className="text-green-600 hover:text-green-700 disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={cancelEdit} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-1 min-h-[1.5rem]">
                <p className="flex-1 text-xs text-zinc-500 leading-snug line-clamp-2">
                  {foto.descripcion ?? <span className="text-zinc-300 italic">Sin descripción</span>}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => startEdit(foto)}
                    className="flex-shrink-0 text-zinc-300 hover:text-zinc-500 transition-colors mt-0.5"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
