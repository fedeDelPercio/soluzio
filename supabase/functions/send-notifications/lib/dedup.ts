// Lógica de deduplicación: insertar en registro_notificaciones con
// ON CONFLICT DO NOTHING. Si la fila ya existe → la notificación ya
// fue disparada para ese (organizacion, evento, destinatario, contexto).

import { getAdminClient } from './supabase.ts'
import type { EventoCritico } from './types.ts'

interface ReservarInput {
  organizacion_id:   string
  destinatario_id:   string
  tipo_notificacion: EventoCritico
  contexto_unico:    string
  metadata?:         Record<string, unknown>
}

/**
 * Reserva un slot en registro_notificaciones. Devuelve el id si insertó
 * (notificación nueva → mandar) o null si ya existía (skip = dedup hit).
 */
export async function reservarSlot(input: ReservarInput): Promise<{ id: string } | null> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from('registro_notificaciones')
    .insert({
      organizacion_id:   input.organizacion_id,
      destinatario_id:   input.destinatario_id,
      tipo_notificacion: input.tipo_notificacion,
      canal:             'email',
      estado:            'en_cola',
      contexto_unico:    input.contexto_unico,
      metadata:          input.metadata ?? null,
    })
    .select('id')
    .single()

  if (error) {
    // unique_violation = ya enviado, dedup hit
    // 23505 es el SQLSTATE de Postgres para unique_violation
    if (error.code === '23505') return null
    throw new Error(`reservarSlot: ${error.message}`)
  }

  return { id: data.id as string }
}

/**
 * Actualiza el registro tras intentar enviar.
 */
export async function actualizarEstado(
  registroId: string,
  estado: 'enviado' | 'fallido' | 'suprimido',
  idExterno?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = getAdminClient()

  const updates: Record<string, unknown> = { estado }
  if (idExterno) updates.id_externo = idExterno
  if (metadata)  updates.metadata   = metadata

  const { error } = await supabase
    .from('registro_notificaciones')
    .update(updates)
    .eq('id', registroId)

  if (error) {
    console.error('actualizarEstado falló:', error.message)
  }
}
