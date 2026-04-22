-- ============================================================
-- 014_registro_notificaciones.sql
-- Log append-only de notificaciones enviadas (Sprint 4)
-- ============================================================

CREATE TABLE registro_notificaciones (
  id                uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id   uuid                  NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  destinatario_id   uuid                  NOT NULL REFERENCES perfiles(id),
  tipo_notificacion tipo_notificacion      NOT NULL,
  canal             canal_notificacion     NOT NULL DEFAULT 'email',
  estado            estado_notificacion    NOT NULL DEFAULT 'en_cola',
  id_externo        text,
  metadata          jsonb,
  creado_en         timestamptz           NOT NULL DEFAULT now()
);

CREATE INDEX idx_reg_notif_org          ON registro_notificaciones(organizacion_id);
CREATE INDEX idx_reg_notif_destinatario ON registro_notificaciones(destinatario_id);
CREATE INDEX idx_reg_notif_estado       ON registro_notificaciones(estado);

ALTER TABLE registro_notificaciones ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo
CREATE POLICY "reg_notif_admin" ON registro_notificaciones
  FOR ALL TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  )
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- Usuarios: solo lectura de las propias
CREATE POLICY "reg_notif_user_select" ON registro_notificaciones
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND destinatario_id = auth.uid()
  );
