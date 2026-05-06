-- ============================================================
-- 029_notificaciones_eventos_medios.sql
-- Extiende el enum tipo_notificacion con los 8 eventos "medios"
-- del spec (los que generan acción del usuario). Sprint S4 fase 2.
-- ============================================================

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'pago_proximo_vencer';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'pago_vence_hoy';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'seguro_pendiente';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'seguro_proximo_vencer';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'solicitud_sin_respuesta';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'contrato_bienvenida';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'solicitud_nueva';
-- Nota: 'contrato_por_vencer' ya existe desde la migration 002.
