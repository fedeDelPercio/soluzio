// Helper para disparar notificaciones event-driven desde Server Actions.
// Llama al edge function send-notifications con modo='evento'.
//
// Uso:
//   await dispararNotificacion('comprobante_rechazado', comprobanteId, { motivo })
//
// Si falla, loguea pero NO tira error — la Server Action no debe abortar
// si la notificación falla. La acción principal ya se guardó en DB.

import type { TipoNotificacion } from '@alquileres/shared'

const EVENTOS_DISPATCH = [
  'comprobante_rechazado',
  'documento_rechazado',
  'contrato_rescindido',
  'solicitud_urgente',
] as const satisfies readonly TipoNotificacion[]

type EventoDispatch = typeof EVENTOS_DISPATCH[number]

export async function dispararNotificacion(
  evento:    EventoDispatch,
  recursoId: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('[notif/dispatch] faltan envs SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    return { ok: false, error: 'config' }
  }

  try {
    const res = await fetch(`${url}/functions/v1/send-notifications`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        modo:       'evento',
        evento,
        recurso_id: recursoId,
        metadata:   metadata ?? {},
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[notif/dispatch] ${evento}/${recursoId} falló:`, res.status, body)
      return { ok: false, error: `HTTP ${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    console.error(`[notif/dispatch] ${evento}/${recursoId} fetch error:`, (err as Error).message)
    return { ok: false, error: (err as Error).message }
  }
}
