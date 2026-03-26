-- ============================================================
-- 007_contratos.sql
-- ============================================================

CREATE TABLE contratos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  propiedad_id    uuid NOT NULL REFERENCES propiedades(id),
  inquilino_id    uuid NOT NULL REFERENCES perfiles(id),
  garante_id      uuid REFERENCES perfiles(id),

  -- Fechas y montos
  fecha_inicio            date           NOT NULL,
  fecha_fin               date           NOT NULL,
  monto_inicial           numeric(12,2)  NOT NULL,
  monto_actual            numeric(12,2)  NOT NULL,

  -- Ajuste
  indice_ajuste           indice_ajuste  NOT NULL DEFAULT 'icl',
  periodo_ajuste_meses    integer        NOT NULL DEFAULT 3,
  proxima_fecha_ajuste    date,

  -- Depósito y seguro
  monto_deposito              numeric(12,2),
  vencimiento_seguro_incendio date,

  -- Estado
  estado  estado_contrato NOT NULL DEFAULT 'borrador',

  -- Análisis IA
  ia_analisis_raw       jsonb,
  ia_analisis_resultado jsonb,
  ia_confianza          numeric(3,2),

  -- Timestamps
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER actualizar_contratos_timestamp
  BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE INDEX idx_contratos_organizacion ON contratos(organizacion_id);
CREATE INDEX idx_contratos_propiedad    ON contratos(propiedad_id);
CREATE INDEX idx_contratos_inquilino    ON contratos(inquilino_id);
CREATE INDEX idx_contratos_estado       ON contratos(estado);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo
CREATE POLICY "admin_all_contratos" ON contratos
  FOR ALL USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  ) WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- Inquilino: solo sus contratos
CREATE POLICY "inquilino_select_contratos" ON contratos
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND inquilino_id = auth.uid()
  );

-- Propietario: contratos de sus propiedades
CREATE POLICY "propietario_select_contratos" ON contratos
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND propiedad_id IN (
      SELECT id FROM propiedades WHERE propietario_id = auth.uid()
    )
  );

-- Inmobiliario: contratos de propiedades que gestiona
CREATE POLICY "inmobiliario_select_contratos" ON contratos
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND propiedad_id IN (
      SELECT id FROM propiedades WHERE inmobiliario_id = auth.uid()
    )
  );
