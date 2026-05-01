'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ForgotPasswordForm() {
  const [error, setError]       = useState<string | null>(null)
  const [enviado, setEnviado]   = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    const email = (formData.get('email') as string)?.trim().toLowerCase()
    if (!email) {
      setError('Ingresá tu email.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (err) {
        setError(err.message ?? 'No pudimos enviar el email. Probá de nuevo.')
        return
      }
      setEnviado(true)
    })
  }

  if (enviado) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-md px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            Si el email existe, te enviamos un link para resetear tu contraseña.
            Revisá tu bandeja de entrada en los próximos minutos.
          </p>
        </div>
        <p className="text-xs text-zinc-500 text-center">
          ¿No lo encontrás? Probá en la carpeta de spam o promociones.
        </p>
        <p className="text-center text-sm">
          <Link href="/login" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-4">
            Volver al login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Enviando...' : 'Enviar link de recuperación'}
      </Button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-4">
          Volver al login
        </Link>
      </p>
    </form>
  )
}
