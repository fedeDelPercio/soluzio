// Cliente admin de Supabase (service_role) para el edge function.
// Bypass de RLS — solo para uso interno del envío de notificaciones.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

let cached: SupabaseClient | null = null

export function getAdminClient(): SupabaseClient {
  if (cached) return cached
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están seteadas')
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
