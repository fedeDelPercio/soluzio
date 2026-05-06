// Metadata de los eventos de notificación del MVP S4.
// La consume el panel admin (/configuracion/notificaciones) y el edge function
// para mostrar/agrupar la lista canónica de eventos críticos.

import { TIPO_NOTIFICACION, type TipoNotificacion } from './enums'

export type GrupoNotificacion =
  | 'pagos'
  | 'ajustes'
  | 'seguro'
  | 'documentos'
  | 'contrato'
  | 'mantenimiento'

export type DestinatarioRol =
  | 'inquilino'
  | 'propietario'
  | 'admin'
  | 'inmobiliario'
  | 'garante'

export interface EventoNotificacionMeta {
  evento:        TipoNotificacion
  grupo:         GrupoNotificacion
  label:         string
  descripcion:   string
  destinatarios: DestinatarioRol[]
  trigger:       'cron' | 'evento'
  prioridad:     'critica' | 'media' | 'informativa'
  /**
   * Si el evento usa offset configurable (cron-driven con timing variable),
   * esto define cómo describirlo en la UI del panel admin.
   *   direccion: 'antes' del trigger natural, 'despues' o 'mismo_dia'
   *   referencia: a qué fecha se refiere el offset (vencimiento, inicio, etc.)
   *   defaultDias: valor por defecto del offset (debe coincidir con migration 030)
   *   minDias / maxDias: rango aceptable
   */
  offset?: {
    direccion:   'antes' | 'despues' | 'mismo_dia'
    referencia:  string
    defaultDias: number
    minDias:     number
    maxDias:     number
  }
}

export const EVENTOS_NOTIFICACION_META: Record<string, EventoNotificacionMeta> = {
  // ── Pagos ────────────────────────────────────────────────────────
  [TIPO_NOTIFICACION.PAGO_PROXIMO_VENCER]: {
    evento:        TIPO_NOTIFICACION.PAGO_PROXIMO_VENCER,
    grupo:         'pagos',
    label:         'Pago próximo a vencer',
    descripcion:   'Recordatorio al inquilino antes del vencimiento del alquiler.',
    destinatarios: ['inquilino'],
    trigger:       'cron',
    prioridad:     'media',
    offset: { direccion: 'antes', referencia: 'el vencimiento', defaultDias: 5, minDias: 1, maxDias: 30 },
  },
  [TIPO_NOTIFICACION.PAGO_VENCE_HOY]: {
    evento:        TIPO_NOTIFICACION.PAGO_VENCE_HOY,
    grupo:         'pagos',
    label:         'Pago vence hoy',
    descripcion:   'Aviso al inquilino el día del vencimiento.',
    destinatarios: ['inquilino'],
    trigger:       'cron',
    prioridad:     'media',
    offset: { direccion: 'mismo_dia', referencia: 'el vencimiento', defaultDias: 0, minDias: 0, maxDias: 0 },
  },
  [TIPO_NOTIFICACION.PAGO_VENCIDO]: {
    evento:        TIPO_NOTIFICACION.PAGO_VENCIDO,
    grupo:         'pagos',
    label:         'Pago vencido',
    descripcion:   'Notificación tras el vencimiento si no hay comprobante.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'despues', referencia: 'del vencimiento', defaultDias: 1, minDias: 1, maxDias: 7 },
  },
  [TIPO_NOTIFICACION.PAGO_ATRASADO_7]: {
    evento:        TIPO_NOTIFICACION.PAGO_ATRASADO_7,
    grupo:         'pagos',
    label:         'Pago atrasado',
    descripcion:   'Alerta cuando un pago lleva varios días sin comprobante.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'despues', referencia: 'del vencimiento', defaultDias: 7, minDias: 3, maxDias: 30 },
  },
  [TIPO_NOTIFICACION.PAGO_ATRASADO_15]: {
    evento:        TIPO_NOTIFICACION.PAGO_ATRASADO_15,
    grupo:         'pagos',
    label:         'Pago muy atrasado',
    descripcion:   'Segundo recordatorio fuerte cuando la mora se prolonga.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'despues', referencia: 'del vencimiento', defaultDias: 15, minDias: 10, maxDias: 60 },
  },
  [TIPO_NOTIFICACION.COMPROBANTE_RECHAZADO]: {
    evento:        TIPO_NOTIFICACION.COMPROBANTE_RECHAZADO,
    grupo:         'pagos',
    label:         'Comprobante rechazado',
    descripcion:   'Se dispara apenas el admin rechaza un comprobante de pago.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'evento',
    prioridad:     'critica',
  },
  // ── Ajustes ──────────────────────────────────────────────────────
  [TIPO_NOTIFICACION.TASAS_AJUSTE_FALTANTES]: {
    evento:        TIPO_NOTIFICACION.TASAS_AJUSTE_FALTANTES,
    grupo:         'ajustes',
    label:         'Tasas faltantes el día del ajuste',
    descripcion:   'Llega el día de aplicar un ajuste y la tasa IPC/ICL todavía no fue cargada.',
    destinatarios: ['admin'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'mismo_dia', referencia: 'del ajuste', defaultDias: 0, minDias: 0, maxDias: 0 },
  },
  // ── Seguro ───────────────────────────────────────────────────────
  [TIPO_NOTIFICACION.SEGURO_PENDIENTE]: {
    evento:        TIPO_NOTIFICACION.SEGURO_PENDIENTE,
    grupo:         'seguro',
    label:         'Seguro pendiente (primer aviso)',
    descripcion:   'Aviso al inquilino si todavía no cargó la póliza.',
    destinatarios: ['inquilino'],
    trigger:       'cron',
    prioridad:     'media',
    offset: { direccion: 'despues', referencia: 'del inicio del contrato', defaultDias: 10, minDias: 5, maxDias: 30 },
  },
  [TIPO_NOTIFICACION.SEGURO_INCENDIO_RECORDATORIO]: {
    evento:        TIPO_NOTIFICACION.SEGURO_INCENDIO_RECORDATORIO,
    grupo:         'seguro',
    label:         'Seguro pendiente (recordatorio fuerte)',
    descripcion:   'Recordatorio crítico cuando se cumple el límite legal sin seguro.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'despues', referencia: 'del inicio del contrato', defaultDias: 15, minDias: 10, maxDias: 60 },
  },
  [TIPO_NOTIFICACION.SEGURO_PROXIMO_VENCER]: {
    evento:        TIPO_NOTIFICACION.SEGURO_PROXIMO_VENCER,
    grupo:         'seguro',
    label:         'Seguro próximo a vencer',
    descripcion:   'Aviso anticipado al inquilino para renovar la póliza.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'media',
    offset: { direccion: 'antes', referencia: 'del vencimiento del seguro', defaultDias: 30, minDias: 7, maxDias: 90 },
  },
  [TIPO_NOTIFICACION.SEGURO_INCENDIO_VENCIDO]: {
    evento:        TIPO_NOTIFICACION.SEGURO_INCENDIO_VENCIDO,
    grupo:         'seguro',
    label:         'Seguro vencido',
    descripcion:   'El seguro de incendio se venció.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'despues', referencia: 'del vencimiento del seguro', defaultDias: 1, minDias: 1, maxDias: 7 },
  },
  // ── Documentos ───────────────────────────────────────────────────
  [TIPO_NOTIFICACION.DOCUMENTO_RECHAZADO]: {
    evento:        TIPO_NOTIFICACION.DOCUMENTO_RECHAZADO,
    grupo:         'documentos',
    label:         'Documento rechazado',
    descripcion:   'Se dispara apenas el admin rechaza un documento del contrato.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'evento',
    prioridad:     'critica',
  },
  // ── Contrato ─────────────────────────────────────────────────────
  [TIPO_NOTIFICACION.CONTRATO_BIENVENIDA]: {
    evento:        TIPO_NOTIFICACION.CONTRATO_BIENVENIDA,
    grupo:         'contrato',
    label:         'Bienvenida al contrato',
    descripcion:   'Se manda al crear un contrato. Confirma a las partes que están registradas.',
    destinatarios: ['inquilino', 'propietario', 'inmobiliario'],
    trigger:       'evento',
    prioridad:     'media',
  },
  [TIPO_NOTIFICACION.CONTRATO_POR_VENCER]: {
    evento:        TIPO_NOTIFICACION.CONTRATO_POR_VENCER,
    grupo:         'contrato',
    label:         'Contrato por vencer',
    descripcion:   'Aviso anticipado de fin de contrato para coordinar renovación o entrega.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'media',
    offset: { direccion: 'antes', referencia: 'del fin del contrato', defaultDias: 30, minDias: 7, maxDias: 90 },
  },
  [TIPO_NOTIFICACION.CONTRATO_VENCIDO]: {
    evento:        TIPO_NOTIFICACION.CONTRATO_VENCIDO,
    grupo:         'contrato',
    label:         'Contrato vencido',
    descripcion:   'Se notifica al día siguiente del vencimiento del contrato.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'critica',
    offset: { direccion: 'despues', referencia: 'del fin del contrato', defaultDias: 1, minDias: 1, maxDias: 7 },
  },
  [TIPO_NOTIFICACION.CONTRATO_RESCINDIDO]: {
    evento:        TIPO_NOTIFICACION.CONTRATO_RESCINDIDO,
    grupo:         'contrato',
    label:         'Contrato rescindido',
    descripcion:   'Notificación inmediata cuando se rescinde un contrato.',
    destinatarios: ['inquilino', 'admin', 'propietario', 'inmobiliario'],
    trigger:       'evento',
    prioridad:     'critica',
  },
  // ── Solicitudes ──────────────────────────────────────────────────
  [TIPO_NOTIFICACION.SOLICITUD_NUEVA]: {
    evento:        TIPO_NOTIFICACION.SOLICITUD_NUEVA,
    grupo:         'mantenimiento',
    label:         'Solicitud nueva',
    descripcion:   'Aviso al admin cuando un inquilino crea una solicitud (prioridad baja o media).',
    destinatarios: ['admin'],
    trigger:       'evento',
    prioridad:     'media',
  },
  [TIPO_NOTIFICACION.SOLICITUD_URGENTE]: {
    evento:        TIPO_NOTIFICACION.SOLICITUD_URGENTE,
    grupo:         'mantenimiento',
    label:         'Solicitud urgente',
    descripcion:   'Aviso al admin cuando un inquilino crea una solicitud con prioridad alta o urgente.',
    destinatarios: ['admin'],
    trigger:       'evento',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.SOLICITUD_SIN_RESPUESTA]: {
    evento:        TIPO_NOTIFICACION.SOLICITUD_SIN_RESPUESTA,
    grupo:         'mantenimiento',
    label:         'Solicitud sin respuesta',
    descripcion:   'Recordatorio al admin si una solicitud lleva días sin actividad.',
    destinatarios: ['admin'],
    trigger:       'cron',
    prioridad:     'media',
    offset: { direccion: 'despues', referencia: 'sin actividad', defaultDias: 2, minDias: 1, maxDias: 30 },
  },
}

export const GRUPO_LABEL: Record<GrupoNotificacion, string> = {
  pagos:         'Pagos',
  ajustes:       'Ajustes IPC/ICL',
  seguro:        'Seguro de incendio',
  documentos:    'Documentos del contrato',
  contrato:      'Contrato',
  mantenimiento: 'Solicitudes / Mantenimiento',
}

export const ROL_LABEL: Record<DestinatarioRol, string> = {
  inquilino:    'Inquilino',
  propietario:  'Propietario',
  admin:        'Administrador',
  inmobiliario: 'Inmobiliario',
  garante:      'Garante',
}
