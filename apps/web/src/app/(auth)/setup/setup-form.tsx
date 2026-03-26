'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { setupAction } from './actions'
import Link from 'next/link'

export function SetupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await setupAction(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Organización</p>
        <div className="space-y-2">
          <Label htmlFor="org_nombre">Nombre de la inmobiliaria</Label>
          <Input id="org_nombre" name="org_nombre" placeholder="Red Suma" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org_slug">Identificador único</Label>
          <Input id="org_slug" name="org_slug" placeholder="red-suma" required
            pattern="[a-z0-9\-]+" title="Solo minúsculas, números y guiones" />
          <p className="text-xs text-zinc-400">Solo letras minúsculas, números y guiones.</p>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Administrador
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" name="apellido" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Configurando...' : 'Crear organización y administrador'}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-zinc-900 underline underline-offset-4">
          Iniciar sesión
        </Link>
      </p>
    </form>
  )
}
