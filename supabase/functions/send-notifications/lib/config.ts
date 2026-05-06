// Lectura de notificaciones_config para saber qué eventos están
// habilitados por organización.

import { getAdminClient } from './supabase.ts'
import type { EventoCritico } from './types.ts'

/**
 * Devuelve un Set de organizaciones que tienen el evento habilitado.
 * El edge function filtra los destinatarios usando esto antes de
 * mandar el email.
 */
export async function orgsConEventoHabilitado(evento: EventoCritico): Promise<Set<string>> {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('notificaciones_config')
    .select('organizacion_id')
    .eq('evento', evento)
    .eq('habilitado', true)

  if (error) throw new Error(`orgsConEventoHabilitado: ${error.message}`)
  return new Set((data ?? []).map((r: { organizacion_id: string }) => r.organizacion_id))
}
