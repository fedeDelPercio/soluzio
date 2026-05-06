-- ============================================================
-- 025_notificaciones_config.sql
-- Configuración por organización para los eventos de notificación.
-- Cada (organizacion_id, evento) tiene un toggle on/off y un slot
-- jsonb 'configuracion' reservado para futuros overrides (timing,
-- destinatarios extra) que se expondrán en el panel completo (v2).
-- ============================================================

CREATE TABLE notificaciones_config (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid              NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  evento          tipo_notificacion NOT NULL,
  habilitado      boolean           NOT NULL DEFAULT true,
  configuracion   jsonb             NOT NULL DEFAULT '{}'::jsonb,
  creado_en       timestamptz       NOT NULL DEFAULT now(),
  actualizado_en  timestamptz       NOT NULL DEFAULT now(),
  UNIQUE (organizacion_id, evento)
);

CREATE INDEX idx_notif_config_org ON notificaciones_config(organizacion_id);

-- Trigger para actualizado_en
CREATE OR REPLACE FUNCTION trigger_set_actualizado_en_notif_config()
RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_actualizado_en
  BEFORE UPDATE ON notificaciones_config
  FOR EACH ROW EXECUTE FUNCTION trigger_set_actualizado_en_notif_config();

-- RLS: solo administradores ven y editan la config de su org.
ALTER TABLE notificaciones_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_config_admin" ON notificaciones_config
  FOR ALL TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  )
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- ── Seed: una row por (org, evento crítico) habilitada por default ──
-- Eventos críticos del MVP S4. Si se agregan eventos en sprints
-- futuros, hay que repetir el seed para las orgs existentes.
INSERT INTO notificaciones_config (organizacion_id, evento, habilitado)
SELECT o.id, e.evento::tipo_notificacion, true
FROM organizaciones o
CROSS JOIN (
  VALUES
    ('pago_vencido'),
    ('pago_atrasado_7'),
    ('pago_atrasado_15'),
    ('comprobante_rechazado'),
    ('tasas_ajuste_faltantes'),
    ('seguro_incendio_recordatorio'),
    ('seguro_incendio_vencido'),
    ('documento_rechazado'),
    ('contrato_vencido'),
    ('contrato_rescindido'),
    ('solicitud_urgente')
) AS e(evento)
ON CONFLICT (organizacion_id, evento) DO NOTHING;
