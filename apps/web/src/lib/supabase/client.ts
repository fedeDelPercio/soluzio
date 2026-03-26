import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@alquileres/database'

/**
 * Cliente Supabase para uso en Client Components (browser).
 * Singleton — reutiliza la misma instancia por session.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
