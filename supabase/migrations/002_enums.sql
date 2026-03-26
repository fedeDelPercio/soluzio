-- Enums del dominio de alquileres
-- IMPORTANTE: deben mantenerse sincronizados con packages/shared/src/types/enums.ts

create type rol_usuario as enum (
  'administrador',
  'propietario',
  'inquilino',
  'inmobiliario'
);

create type tipo_documento as enum (
  'contrato',
  'dni_inquilino',
  'dni_garante',
  'escritura_garantia',
  'informe_garantia',
  'seguro_incendio',
  'poliza_alternativa',
  'ficha_garante',
  'recibo_deposito',
  'otro'
);

create type estado_documento as enum (
  'pendiente',
  'subido',
  'verificado',
  'rechazado',
  'vencido'
);

create type indice_ajuste as enum (
  'ipc',
  'icl',
  'fijo'
);

create type estado_contrato as enum (
  'borrador',
  'activo',
  'por_vencer',
  'vencido',
  'rescindido'
);

create type concepto_pago as enum (
  'alquiler',
  'expensas_ordinarias',
  'expensas_extraordinarias',
  'agua',
  'electricidad',
  'gas',
  'municipal',
  'otro'
);

create type estado_pago as enum (
  'pendiente',
  'comprobante_subido',
  'verificado',
  'atrasado',
  'disputado'
);

create type estado_solicitud as enum (
  'abierto',
  'clasificado',
  'asignado',
  'en_proceso',
  'resuelto',
  'cerrado'
);

create type responsable_mantenimiento as enum (
  'inquilino',
  'propietario',
  'consorcio',
  'indeterminado'
);

create type tipo_notificacion as enum (
  'recordatorio_pago',
  'pago_vencido',
  'pago_vencido_garante',
  'pago_recibido',
  'aviso_ajuste',
  'contrato_por_vencer',
  'seguro_incendio_pendiente',
  'documentos_faltantes',
  'actualizacion_mantenimiento'
);

create type canal_notificacion as enum (
  'email',
  'whatsapp',
  'push'
);

create type estado_notificacion as enum (
  'en_cola',
  'enviado',
  'fallido',
  'suprimido'
);
