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
}

export const EVENTOS_NOTIFICACION_META: Record<string, EventoNotificacionMeta> = {
  [TIPO_NOTIFICACION.PAGO_VENCIDO]: {
    evento:        TIPO_NOTIFICACION.PAGO_VENCIDO,
    grupo:         'pagos',
    label:         'Pago vencido',
    descripcion:   'Se notifica al día siguiente del vencimiento si no hay comprobante.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.PAGO_ATRASADO_7]: {
    evento:        TIPO_NOTIFICACION.PAGO_ATRASADO_7,
    grupo:         'pagos',
    label:         'Pago atrasado +7 días',
    descripcion:   'Recordatorio si pasaron 7 días desde el vencimiento sin comprobante.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.PAGO_ATRASADO_15]: {
    evento:        TIPO_NOTIFICACION.PAGO_ATRASADO_15,
    grupo:         'pagos',
    label:         'Pago atrasado +15 días',
    descripcion:   'Alerta tras 15 días de mora.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'critica',
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
  [TIPO_NOTIFICACION.TASAS_AJUSTE_FALTANTES]: {
    evento:        TIPO_NOTIFICACION.TASAS_AJUSTE_FALTANTES,
    grupo:         'ajustes',
    label:         'Tasas faltantes el día del ajuste',
    descripcion:   'Llega el día de aplicar un ajuste y la tasa IPC/ICL todavía no fue cargada.',
    destinatarios: ['admin'],
    trigger:       'cron',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.SEGURO_INCENDIO_RECORDATORIO]: {
    evento:        TIPO_NOTIFICACION.SEGURO_INCENDIO_RECORDATORIO,
    grupo:         'seguro',
    label:         'Seguro pendiente — recordatorio',
    descripcion:   'Pasados 15 días desde el inicio del contrato sin seguro de incendio cargado.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.SEGURO_INCENDIO_VENCIDO]: {
    evento:        TIPO_NOTIFICACION.SEGURO_INCENDIO_VENCIDO,
    grupo:         'seguro',
    label:         'Seguro vencido',
    descripcion:   'El seguro de incendio se venció.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'cron',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.DOCUMENTO_RECHAZADO]: {
    evento:        TIPO_NOTIFICACION.DOCUMENTO_RECHAZADO,
    grupo:         'documentos',
    label:         'Documento rechazado',
    descripcion:   'Se dispara apenas el admin rechaza un documento del contrato.',
    destinatarios: ['inquilino', 'admin'],
    trigger:       'evento',
    prioridad:     'critica',
  },
  [TIPO_NOTIFICACION.CONTRATO_VENCIDO]: {
    evento:        TIPO_NOTIFICACION.CONTRATO_VENCIDO,
    grupo:         'contrato',
    label:         'Contrato vencido',
    descripcion:   'Se notifica al día siguiente del vencimiento del contrato.',
    destinatarios: ['inquilino', 'admin', 'propietario'],
    trigger:       'cron',
    prioridad:     'critica',
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
  [TIPO_NOTIFICACION.SOLICITUD_URGENTE]: {
    evento:        TIPO_NOTIFICACION.SOLICITUD_URGENTE,
    grupo:         'mantenimiento',
    label:         'Solicitud urgente',
    descripcion:   'Apenas un inquilino crea una solicitud con prioridad alta o urgente.',
    destinatarios: ['admin'],
    trigger:       'evento',
    prioridad:     'critica',
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
