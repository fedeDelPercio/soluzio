'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearInmobiliarioAction } from './actions'

export function CrearInmobiliario() {
  const [open, setOpen]     = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await crearInmobiliarioAction(formData)
      if (res?.error) setError(res.error)
      else setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" /> Nuevo inmobiliario
      </Button>
    )
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-800">Nuevo inmobiliario</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input name="nombre" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Apellido</Label>
          <Input name="apellido" required className="h-8 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Email <span className="text-zinc-400">(para invitar acceso)</span></Label>
          <Input name="email" type="email" required className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Teléfono <span className="text-zinc-400">(opc.)</span></Label>
          <Input name="telefono" type="tel" className="h-8 text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">DNI / CUIT <span className="text-zinc-400">(opc.)</span></Label>
        <Input name="dni" className="h-8 text-sm max-w-xs" />
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Creando...</> : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
