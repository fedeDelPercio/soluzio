-- ============================================================
-- 026_registro_notif_dedup.sql
-- Agrega contexto_unico + UNIQUE para deduplicar notificaciones.
--
-- Convención del campo contexto_unico (lo arma el edge function):
--   pago_vencido           → 'pago:{pago_id}'
--   pago_atrasado_7        → 'pago:{pago_id}:7d'
--   pago_atrasado_15       → 'pago:{pago_id}:15d'
--   comprobante_rechazado  → 'comprobante:{comprobante_id}'
--   tasas_ajuste_faltantes → 'ajuste:{contrato_id}:{anio}-{mes}'
--   seguro_incendio_*      → 'contrato:{contrato_id}:seguro'
--   documento_rechazado    → 'documento:{documento_id}'
--   contrato_vencido       → 'contrato:{contrato_id}:vencido'
--   contrato_rescindido    → 'contrato:{contrato_id}:rescindido'
--   solicitud_urgente      → 'solicitud:{solicitud_id}'
--
-- Un INSERT que choque con el UNIQUE significa que esa notificación
-- ya fue disparada para ese (destinatario, evento, recurso). El edge
-- function usa ON CONFLICT DO NOTHING para skipear silenciosamente.
-- ============================================================

ALTER TABLE registro_notificaciones
  ADD COLUMN contexto_unico text;

CREATE UNIQUE INDEX idx_reg_notif_dedup
  ON registro_notificaciones (
    organizacion_id,
    tipo_notificacion,
    destinatario_id,
    contexto_unico
  )
  WHERE contexto_unico IS NOT NULL;
