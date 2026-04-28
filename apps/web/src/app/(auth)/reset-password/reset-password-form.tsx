'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordForm() {
  const [error, setError]               = useState<string | null>(null)
  const [ready, setReady]               = useState(false)
  const [exitoso, setExitoso]           = useState(false)
  const [isPending, startTransition]    = useTransition()
  const router                          = useRouter()

  // Supabase manda el link con el token en el hash (#access_token=...&type=recovery)
  // o como query param `code` (PKCE flow). Establecemos la sesión.
  useEffect(() => {
    const supabase = createClient()

    async function inicializar() {
      const hash = window.location.hash
      const search = new URLSearchParams(window.location.search)

      // Caso 1: PKCE (?code=...)
      const code = search.get('code')
      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code)
        if (err) {
          setError('El link expiró o no es válido. Pedí uno nuevo.')
          return
        }
        setReady(true)
        return
      }

      // Caso 2: implicit (#access_token=...&refresh_token=...&type=recovery)
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1))
        const accessToken  = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (accessToken && refreshToken) {
          const { error: err } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (err) {
            setError('El link expiró o no es válido. Pedí uno nuevo.')
            return
          }
          setReady(true)
          return
        }
      }

      // Caso 3: ya hay sesión activa
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setReady(true)
        return
      }

      setError('Link inválido o expirado. Pedí uno nuevo desde "Olvidé mi contraseña".')
    }

    inicializar()
  }, [])

  function handleSubmit(formData: FormData) {
    setError(null)
    const password  = formData.get('password') as string
    const password2 = formData.get('password2') as string

    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message ?? 'No pudimos actualizar la contraseña.')
        return
      }
      setExitoso(true)
      setTimeout(() => router.replace('/overview'), 1500)
    })
  }

  if (exitoso) {
    return (
      <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-md px-3 py-2.5">
        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          Contraseña actualizada. Te redirigimos al dashboard...
        </p>
      </div>
    )
  }

  if (error && !ready) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-zinc-600 hover:text-zinc-900 underline underline-offset-4">
            Pedir un nuevo link
          </Link>
        </p>
      </div>
    )
  }

  if (!ready) {
    return <p className="text-sm text-zinc-500 text-center">Validando link...</p>
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
          autoComplete="new-password"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password2">Repetir contraseña</Label>
        <Input
          id="password2"
          name="password2"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar nueva contraseña'}
      </Button>
    </form>
  )
}
