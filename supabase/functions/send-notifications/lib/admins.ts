// Helper para resolver admins de una organización (con su email).
// Cachea por org en una sola corrida.

import { getAdminClient } from './supabase.ts'
import { resolverEmails } from './perfiles.ts'

export interface AdminResuelto {
  id:     string
  nombre: string
  email:  string
}

const cache = new Map<string, AdminResuelto[]>()

export function clearAdminsCache(): void {
  cache.clear()
}

export async function adminsDeOrg(organizacionId: string): Promise<AdminResuelto[]> {
  const cached = cache.get(organizacionId)
  if (cached) return cached

  const supabase = getAdminClient()
  const { data: perfiles } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .eq('organizacion_id', organizacionId)
    .eq('rol', 'administrador')

  const lista = (perfiles ?? []) as { id: string; nombre: string }[]
  if (lista.length === 0) {
    cache.set(organizacionId, [])
    return []
  }

  const emails = await resolverEmails(lista.map((a) => a.id))
  const out = lista
    .map((a) => ({ id: a.id, nombre: a.nombre, email: emails.get(a.id) ?? '' }))
    .filter((a) => !!a.email)

  cache.set(organizacionId, out)
  return out
}
