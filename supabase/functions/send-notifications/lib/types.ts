// Tipos compartidos del edge function send-notifications.

export type EventoCritico =
  // Críticos (S4 fase 1)
  | 'pago_vencido'
  | 'pago_atrasado_7'
  | 'pago_atrasado_15'
  | 'comprobante_rechazado'
  | 'tasas_ajuste_faltantes'
  | 'seguro_incendio_recordatorio'
  | 'seguro_incendio_vencido'
  | 'documento_rechazado'
  | 'contrato_vencido'
  | 'contrato_rescindido'
  | 'solicitud_urgente'
  // Medios (S4 fase 2)
  | 'pago_proximo_vencer'
  | 'pago_vence_hoy'
  | 'seguro_pendiente'
  | 'seguro_proximo_vencer'
  | 'contrato_por_vencer'
  | 'solicitud_sin_respuesta'
  | 'contrato_bienvenida'
  | 'solicitud_nueva'

export type RequestBody =
  | { modo: 'cron' }
  | { modo: 'evento'; evento: EventoCritico; recurso_id: string; metadata?: Record<string, unknown> }

export interface DestinatarioInfo {
  perfil_id: string
  organizacion_id: string
  email: string
  nombre: string
}

export interface NotificacionAEnviar {
  evento:           EventoCritico
  destinatario:     DestinatarioInfo
  contexto_unico:   string
  asunto:           string
  html:             string
  metadata?:        Record<string, unknown>
}

export interface ResultadoEvento {
  evento:    EventoCritico
  enviados:  number
  dedup:     number
  fallidos:  number
  errores:   string[]
}
