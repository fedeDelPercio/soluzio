'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { crearPropiedadAction } from '../actions'
import type { Perfil } from '@alquileres/database'

const TIPOS_PROPIEDAD = [
  'departamento', 'casa', 'local', 'oficina', 'cochera', 'galpón', 'otro',
]

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
]

interface PropiedadFormProps {
  propietarios: Perfil[]
  inmobiliarios: Perfil[]
}

export function PropiedadForm({ propietarios, inmobiliarios }: PropiedadFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await crearPropiedadAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Tipo y partes */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tipo_propiedad">Tipo de propiedad</Label>
          <select
            id="tipo_propiedad"
            name="tipo_propiedad"
            required
            defaultValue="departamento"
            className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            {TIPOS_PROPIEDAD.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="propietario_id">Propietario</Label>
          <select
            id="propietario_id"
            name="propietario_id"
            required
            className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="">Seleccionar propietario...</option>
            {propietarios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </div>

        {inmobiliarios.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="inmobiliario_id">
              Inmobiliario <span className="text-zinc-400 font-normal">(opcional)</span>
            </Label>
            <select
              id="inmobiliario_id"
              name="inmobiliario_id"
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="">Sin inmobiliario</option>
              {inmobiliarios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Separator />

      {/* Dirección */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dirección</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="calle">Calle</Label>
            <Input id="calle" name="calle" placeholder="Av. Corrientes" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" name="numero" placeholder="1234" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="piso">Piso <span className="text-zinc-400 font-normal">(opcional)</span></Label>
            <Input id="piso" name="piso" placeholder="3" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="depto">Depto <span className="text-zinc-400 font-normal">(opcional)</span></Label>
            <Input id="depto" name="depto" placeholder="A" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="barrio">Barrio <span className="text-zinc-400 font-normal">(opcional)</span></Label>
            <Input id="barrio" name="barrio" placeholder="Palermo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codigo_postal">Código postal</Label>
            <Input id="codigo_postal" name="codigo_postal" placeholder="1414" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" placeholder="Buenos Aires" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provincia">Provincia</Label>
            <select
              id="provincia"
              name="provincia"
              defaultValue="Buenos Aires"
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              {PROVINCIAS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : 'Crear propiedad'}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
