// Mirrors de los enums de la base de datos.
// Estos valores DEBEN mantenerse sincronizados con las migraciones SQL.

export const ROL_USUARIO = {
  ADMINISTRADOR: 'administrador',
  PROPIETARIO: 'propietario',
  INQUILINO: 'inquilino',
  INMOBILIARIO: 'inmobiliario',
} as const

export type RolUsuario = (typeof ROL_USUARIO)[keyof typeof ROL_USUARIO]

export const ESTADO_CONTRATO = {
  BORRADOR: 'borrador',
  ACTIVO: 'activo',
  POR_VENCER: 'por_vencer',
  VENCIDO: 'vencido',
  RESCINDIDO: 'rescindido',
} as const

export type EstadoContrato = (typeof ESTADO_CONTRATO)[keyof typeof ESTADO_CONTRATO]

export const INDICE_AJUSTE = {
  IPC: 'ipc',
  ICL: 'icl',
  FIJO: 'fijo',
} as const

export type IndiceAjuste = (typeof INDICE_AJUSTE)[keyof typeof INDICE_AJUSTE]

export const ESTADO_PAGO = {
  PENDIENTE: 'pendiente',
  COMPROBANTE_SUBIDO: 'comprobante_subido',
  VERIFICADO: 'verificado',
  ATRASADO: 'atrasado',
  DISPUTADO: 'disputado',
} as const

export type EstadoPago = (typeof ESTADO_PAGO)[keyof typeof ESTADO_PAGO]

export const ESTADO_SOLICITUD = {
  ABIERTO: 'abierto',
  CLASIFICADO: 'clasificado',
  ASIGNADO: 'asignado',
  EN_PROCESO: 'en_proceso',
  RESUELTO: 'resuelto',
  CERRADO: 'cerrado',
} as const

export type EstadoSolicitud = (typeof ESTADO_SOLICITUD)[keyof typeof ESTADO_SOLICITUD]

export const RESPONSABLE_MANTENIMIENTO = {
  INQUILINO: 'inquilino',
  PROPIETARIO: 'propietario',
  CONSORCIO: 'consorcio',
  INDETERMINADO: 'indeterminado',
} as const

export type ResponsableMantenimiento =
  (typeof RESPONSABLE_MANTENIMIENTO)[keyof typeof RESPONSABLE_MANTENIMIENTO]

export const ESTADO_DOCUMENTO = {
  PENDIENTE: 'pendiente',
  SUBIDO: 'subido',
  VERIFICADO: 'verificado',
  RECHAZADO: 'rechazado',
  VENCIDO: 'vencido',
} as const

export type EstadoDocumento = (typeof ESTADO_DOCUMENTO)[keyof typeof ESTADO_DOCUMENTO]

export const TIPO_SOLICITUD = {
  MANTENIMIENTO: 'mantenimiento',
  CONSULTA: 'consulta',
  RECLAMO: 'reclamo',
  RESCISION: 'rescision',
  OTRO: 'otro',
} as const

export type TipoSolicitud = (typeof TIPO_SOLICITUD)[keyof typeof TIPO_SOLICITUD]

export const PRIORIDAD_SOLICITUD = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const

export type PrioridadSolicitud = (typeof PRIORIDAD_SOLICITUD)[keyof typeof PRIORIDAD_SOLICITUD]

// Eventos de notificación. Mantener sincronizado con tipo_notificacion en SQL
// (migraciones 002 y 024). Los nombres siguen el spec aprobado 2026-05-02.
export const TIPO_NOTIFICACION = {
  // existentes (002)
  RECORDATORIO_PAGO:           'recordatorio_pago',
  PAGO_VENCIDO:                'pago_vencido',                 // P3
  PAGO_VENCIDO_GARANTE:        'pago_vencido_garante',
  PAGO_RECIBIDO:               'pago_recibido',
  AVISO_AJUSTE:                'aviso_ajuste',
  CONTRATO_POR_VENCER:         'contrato_por_vencer',
  SEGURO_INCENDIO_PENDIENTE:   'seguro_incendio_pendiente',
  DOCUMENTOS_FALTANTES:        'documentos_faltantes',
  ACTUALIZACION_MANTENIMIENTO: 'actualizacion_mantenimiento',
  // nuevos críticos (024)
  PAGO_ATRASADO_7:              'pago_atrasado_7',              // P4
  PAGO_ATRASADO_15:             'pago_atrasado_15',             // P5
  COMPROBANTE_RECHAZADO:        'comprobante_rechazado',        // P8
  TASAS_AJUSTE_FALTANTES:       'tasas_ajuste_faltantes',       // A4
  SEGURO_INCENDIO_RECORDATORIO: 'seguro_incendio_recordatorio', // S2
  SEGURO_INCENDIO_VENCIDO:      'seguro_incendio_vencido',      // S4
  DOCUMENTO_RECHAZADO:          'documento_rechazado',          // D2
  CONTRATO_VENCIDO:             'contrato_vencido',             // C3
  CONTRATO_RESCINDIDO:          'contrato_rescindido',          // C5
  SOLICITUD_URGENTE:            'solicitud_urgente',            // M2
} as const

export type TipoNotificacion = (typeof TIPO_NOTIFICACION)[keyof typeof TIPO_NOTIFICACION]

// Eventos del MVP S4 — los que tienen template + handler implementados.
// Es la lista canónica que renderiza el panel admin.
export const EVENTOS_NOTIFICACION_CRITICOS = [
  TIPO_NOTIFICACION.PAGO_VENCIDO,
  TIPO_NOTIFICACION.PAGO_ATRASADO_7,
  TIPO_NOTIFICACION.PAGO_ATRASADO_15,
  TIPO_NOTIFICACION.COMPROBANTE_RECHAZADO,
  TIPO_NOTIFICACION.TASAS_AJUSTE_FALTANTES,
  TIPO_NOTIFICACION.SEGURO_INCENDIO_RECORDATORIO,
  TIPO_NOTIFICACION.SEGURO_INCENDIO_VENCIDO,
  TIPO_NOTIFICACION.DOCUMENTO_RECHAZADO,
  TIPO_NOTIFICACION.CONTRATO_VENCIDO,
  TIPO_NOTIFICACION.CONTRATO_RESCINDIDO,
  TIPO_NOTIFICACION.SOLICITUD_URGENTE,
] as const
