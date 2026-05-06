// Resolver emails de perfiles vía RPC SECURITY DEFINER.
// perfiles no guarda email (vive en auth.users) y PostgREST no expone auth.

import { getAdminClient } from './supabase.ts'

export async function resolverEmails(perfilIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (perfilIds.length === 0) return map

  const supabase = getAdminClient()
  const { data, error } = await supabase.rpc('get_emails_by_perfil_ids', {
    perfil_ids: perfilIds,
  })

  if (error) {
    console.error('resolverEmails:', error.message)
    return map
  }

  for (const row of (data ?? []) as { id: string; email: string | null }[]) {
    if (row.email) map.set(row.id, row.email)
  }
  return map
}
