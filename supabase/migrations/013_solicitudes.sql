-- ============================================================
-- 013_solicitudes.sql
-- Sistema de solicitudes generalizado (mantenimiento, consultas,
-- reclamos, rescisión, otros)
-- ============================================================

-- ── Nuevos enums ────────────────────────────────────────────

CREATE TYPE tipo_solicitud AS ENUM (
  'mantenimiento',
  'consulta',
  'reclamo',
  'rescision',
  'otro'
);

CREATE TYPE prioridad_solicitud AS ENUM (
  'baja',
  'media',
  'alta',
  'urgente'
);

-- ── SECURITY DEFINER helpers ─────────────────────────────────
-- Rompen la recursión RLS: solicitudes→contratos→propiedades→contratos

CREATE OR REPLACE FUNCTION public.get_contrato_ids_inquilino()
RETURNS SETOF uuid AS $$
  SELECT id FROM contratos
  WHERE inquilino_id = auth.uid() OR coinquilino_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_contrato_ids_propietario()
RETURNS SETOF uuid AS $$
  SELECT c.id FROM contratos c
  JOIN propiedades p ON c.propiedad_id = p.id
  WHERE p.propietario_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── solicitudes ──────────────────────────────────────────────

CREATE TABLE solicitudes (
  id                        uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id           uuid                  NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  contrato_id               uuid                  NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  reportado_por             uuid                  NOT NULL REFERENCES perfiles(id),

  -- Tipo y contenido
  tipo                      tipo_solicitud         NOT NULL,
  titulo                    text                  NOT NULL,
  descripcion               text                  NOT NULL,

  -- Estado y prioridad
  estado                    estado_solicitud       NOT NULL DEFAULT 'abierto',
  prioridad                 prioridad_solicitud    NOT NULL DEFAULT 'media',

  -- Solo para tipo='mantenimiento' (nullable en otros tipos)
  categoria                 text,
  ia_sugerencia_responsable responsable_mantenimiento,
  ia_clasificacion_raw      jsonb,
  ia_confianza              numeric(3,2),
  responsable_confirmado    responsable_mantenimiento,

  -- Respuesta del admin (aplica a todos los tipos)
  respuesta_admin           text,
  respondido_por            uuid                  REFERENCES perfiles(id),
  respondido_en             timestamptz,

  -- Timestamps
  creado_en                 timestamptz           NOT NULL DEFAULT now(),
  actualizado_en            timestamptz           NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_solicitudes_updated
  BEFORE UPDATE ON solicitudes
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE INDEX idx_solicitudes_org      ON solicitudes(organizacion_id);
CREATE INDEX idx_solicitudes_contrato ON solicitudes(contrato_id);
CREATE INDEX idx_solicitudes_estado   ON solicitudes(organizacion_id, estado);
CREATE INDEX idx_solicitudes_tipo     ON solicitudes(organizacion_id, tipo);
CREATE INDEX idx_solicitudes_reporter ON solicitudes(reportado_por);

ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo
CREATE POLICY "solicitudes_admin" ON solicitudes
  FOR ALL TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  )
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- Inquilino: SELECT + INSERT de sus contratos
CREATE POLICY "solicitudes_inquilino_select" ON solicitudes
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND contrato_id IN (SELECT public.get_contrato_ids_inquilino())
  );

CREATE POLICY "solicitudes_inquilino_insert" ON solicitudes
  FOR INSERT TO authenticated
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND contrato_id IN (SELECT public.get_contrato_ids_inquilino())
    AND reportado_por = auth.uid()
  );

-- Propietario: solo lectura de sus propiedades
CREATE POLICY "solicitudes_propietario_select" ON solicitudes
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('propietario')
    AND contrato_id IN (SELECT public.get_contrato_ids_propietario())
  );

-- ── fotos_solicitud ──────────────────────────────────────────

CREATE TABLE fotos_solicitud (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid        NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  solicitud_id    uuid        NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
  ruta_archivo    text        NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fotos_solicitud_solicitud ON fotos_solicitud(solicitud_id);
CREATE INDEX idx_fotos_solicitud_org       ON fotos_solicitud(organizacion_id);

ALTER TABLE fotos_solicitud ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo
CREATE POLICY "fotos_solicitud_admin" ON fotos_solicitud
  FOR ALL TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  )
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- Inquilino: SELECT + INSERT en sus solicitudes
CREATE POLICY "fotos_solicitud_inquilino_select" ON fotos_solicitud
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND solicitud_id IN (
      SELECT id FROM solicitudes
      WHERE contrato_id IN (SELECT public.get_contrato_ids_inquilino())
    )
  );

CREATE POLICY "fotos_solicitud_inquilino_insert" ON fotos_solicitud
  FOR INSERT TO authenticated
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND solicitud_id IN (
      SELECT id FROM solicitudes
      WHERE contrato_id IN (SELECT public.get_contrato_ids_inquilino())
    )
  );

-- Propietario: solo lectura
CREATE POLICY "fotos_solicitud_propietario_select" ON fotos_solicitud
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('propietario')
    AND solicitud_id IN (
      SELECT id FROM solicitudes
      WHERE contrato_id IN (SELECT public.get_contrato_ids_propietario())
    )
  );
