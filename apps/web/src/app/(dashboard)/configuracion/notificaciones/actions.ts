'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import { TIPO_NOTIFICACION, type TipoNotificacion } from '@alquileres/shared'

const EVENTOS_VALIDOS = new Set<string>(Object.values(TIPO_NOTIFICACION))

export async function toggleNotificacionAction(
  evento:     string,
  habilitado: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await getSession()
  if (!perfil || perfil.rol !== 'administrador') return { ok: false, error: 'No autorizado' }
  if (!EVENTOS_VALIDOS.has(evento)) return { ok: false, error: 'Evento inválido' }

  const supabase = await createClient()
  const db = supabase as any

  // Upsert: si la fila no existe (no fue seedeada), la creamos.
  const { error } = await db
    .from('notificaciones_config')
    .upsert(
      {
        organizacion_id: perfil.organizacion_id,
        evento:          evento as TipoNotificacion,
        habilitado,
      },
      { onConflict: 'organizacion_id,evento' },
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/configuracion/notificaciones')
  return { ok: true }
}
