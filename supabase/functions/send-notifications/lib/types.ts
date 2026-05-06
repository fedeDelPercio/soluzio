// Tipos compartidos del edge function send-notifications.

export type EventoCritico =
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
