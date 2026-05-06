'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/session'
import {
  TIPO_NOTIFICACION,
  EVENTOS_NOTIFICACION_META,
  type TipoNotificacion,
} from '@alquileres/shared'

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

  const { error } = await db
    .from('notificaciones_config')
    .upsert(
      { organizacion_id: perfil.organizacion_id, evento: evento as TipoNotificacion, habilitado },
      { onConflict: 'organizacion_id,evento' },
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/configuracion/notificaciones')
  return { ok: true }
}

/**
 * Actualiza dias_offset dentro del jsonb `configuracion`. Valida contra el
 * rango definido en EVENTOS_NOTIFICACION_META[evento].offset.
 */
export async function setOffsetNotificacionAction(
  evento: string,
  dias:   number,
): Promise<{ ok: boolean; error?: string }> {
  const { perfil } = await getSession()
  if (!perfil || perfil.rol !== 'administrador') return { ok: false, error: 'No autorizado' }
  if (!EVENTOS_VALIDOS.has(evento)) return { ok: false, error: 'Evento inválido' }

  const meta = EVENTOS_NOTIFICACION_META[evento]
  if (!meta?.offset) return { ok: false, error: 'Este evento no soporta offset configurable' }
  const { minDias, maxDias } = meta.offset

  if (!Number.isInteger(dias) || dias < minDias || dias > maxDias) {
    return { ok: false, error: `El valor debe estar entre ${minDias} y ${maxDias}.` }
  }

  const supabase = await createClient()
  const db = supabase as any

  // Leer config actual para no perder otras keys del jsonb
  const { data: row } = await db
    .from('notificaciones_config')
    .select('configuracion')
    .eq('organizacion_id', perfil.organizacion_id)
    .eq('evento', evento)
    .maybeSingle()

  const configActual = (row?.configuracion ?? {}) as Record<string, unknown>
  const configNueva  = { ...configActual, dias_offset: dias }

  const { error } = await db
    .from('notificaciones_config')
    .upsert(
      {
        organizacion_id: perfil.organizacion_id,
        evento:          evento as TipoNotificacion,
        habilitado:      true,
        configuracion:   configNueva,
      },
      { onConflict: 'organizacion_id,evento' },
    )

  if (error) return { ok: false, error: error.message }

  revalidatePath('/configuracion/notificaciones')
  return { ok: true }
}

export async function resetOffsetNotificacionAction(
  evento: string,
): Promise<{ ok: boolean; error?: string }> {
  const meta = EVENTOS_NOTIFICACION_META[evento]
  if (!meta?.offset) return { ok: false, error: 'Este evento no soporta offset configurable' }
  return setOffsetNotificacionAction(evento, meta.offset.defaultDias)
}
