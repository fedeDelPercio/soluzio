'use client'

import { useState, useTransition } from 'react'
import { Plus, Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { crearPagoServicioAction } from './actions'

const SELECT_CLASS = 'flex h-8 w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900'

const SERVICIOS = [
  { value: 'electricidad',              label: 'Electricidad (luz)' },
  { value: 'gas',                       label: 'Gas' },
  { value: 'agua',                      label: 'Agua' },
  { value: 'expensas_ordinarias',       label: 'Expensas ordinarias' },
  { value: 'expensas_extraordinarias',  label: 'Expensas extraordinarias' },
  { value: 'municipal',                 label: 'ABL / Municipal' },
  { value: 'otro',                      label: 'Otro' },
]

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Props {
  contratoId: string
}

export function CrearPagoServicio({ contratoId }: Props) {
  const [open, setOpen]         = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [, startTransition]     = useTransition()
  const hoy = new Date()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await crearPagoServicioAction(formData)
      if (res?.error) setError(res.error)
      else setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1" /> Agregar pago de servicio
      </Button>
    )
  }

  return (
    <form action={handleSubmit} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
      <input type="hidden" name="contrato_id" value={contratoId} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-800">Nuevo pago de servicio</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-1">
          <Label className="text-xs">Servicio</Label>
          <select name="concepto" required defaultValue="electricidad" className={SELECT_CLASS}>
            {SERVICIOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mes</Label>
          <select name="mes" required defaultValue={hoy.getMonth() + 1} className={SELECT_CLASS}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Año</Label>
          <select name="anio" required defaultValue={hoy.getFullYear()} className={SELECT_CLASS}>
            {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm">
          Crear
        </Button>
      </div>
    </form>
  )
}
