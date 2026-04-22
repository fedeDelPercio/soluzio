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
