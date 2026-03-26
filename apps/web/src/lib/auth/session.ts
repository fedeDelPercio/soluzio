import { createClient } from '@/lib/supabase/server'
import type { Perfil } from '@alquileres/database'

/**
 * Obtiene el usuario autenticado + su perfil completo.
 * Para usar en Server Components y Server Actions.
 */
export async function getSession(): Promise<{
  user: { id: string; email: string } | null
  perfil: Perfil | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, perfil: null }

  const { data: perfilRaw } = await (supabase as any)
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()
  const perfil = perfilRaw as Perfil | null

  return {
    user: { id: user.id, email: user.email ?? '' },
    perfil,
  }
}

/**
 * Variante que redirige a /login si no hay sesión activa.
 */
export async function requireSession() {
  const session = await getSession()
  if (!session.user) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }
  return session as { user: { id: string; email: string }; perfil: Perfil | null }
}
