import { createClient } from '@supabase/supabase-js'
import type { Database } from '@alquileres/database'

/**
 * Cliente Supabase con service role key.
 * SOLO para uso en Server Actions y Route Handlers del servidor.
 * NUNCA importar en Client Components.
 * Bypasea RLS — usar con cuidado.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada')
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
