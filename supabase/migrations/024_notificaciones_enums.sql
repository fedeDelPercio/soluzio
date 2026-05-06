-- ============================================================
-- 024_notificaciones_enums.sql
-- Extensión del enum tipo_notificacion para los 11 eventos críticos
-- del sistema de notificaciones (Sprint S4 — MVP).
--
-- Mantener sincronizado con packages/shared/src/types/enums.ts
-- ============================================================

-- pago_vencido ya existe (P3). Agregamos el resto de los críticos.
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'pago_atrasado_7';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'pago_atrasado_15';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'comprobante_rechazado';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'tasas_ajuste_faltantes';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'seguro_incendio_recordatorio';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'seguro_incendio_vencido';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'documento_rechazado';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'contrato_vencido';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'contrato_rescindido';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'solicitud_urgente';
