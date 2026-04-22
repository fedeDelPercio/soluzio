-- ============================================================
-- 016_calculos_ajuste.sql
-- Auditoría de cada ajuste de alquiler aplicado
-- ============================================================

CREATE TABLE calculos_ajuste (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id      uuid          NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  contrato_id          uuid          NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  monto_anterior       numeric(12,2) NOT NULL,
  monto_nuevo          numeric(12,2) NOT NULL,
  tasa_acumulada       numeric(8,6)  NOT NULL,
  variacion_porcentual numeric(6,2)  NOT NULL,
  periodos_usados      jsonb         NOT NULL,  -- [{ anio, mes, valor_tasa }]
  aplicado_por         uuid          REFERENCES auth.users(id),
  creado_en            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_calculos_ajuste_contrato ON calculos_ajuste(contrato_id);
CREATE INDEX idx_calculos_ajuste_org      ON calculos_ajuste(organizacion_id);

ALTER TABLE calculos_ajuste ENABLE ROW LEVEL SECURITY;

-- Admin: acceso total
CREATE POLICY "calculos_ajuste_admin" ON calculos_ajuste
  FOR ALL TO authenticated
  USING (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'))
  WITH CHECK (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'));

-- Propietario: solo lectura de sus contratos
CREATE POLICY "calculos_ajuste_propietario_select" ON calculos_ajuste
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('propietario')
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON c.propiedad_id = p.id
      WHERE p.propietario_id = auth.uid()
    )
  );

-- Inquilino: solo lectura de sus contratos
CREATE POLICY "calculos_ajuste_inquilino_select" ON calculos_ajuste
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND contrato_id IN (
      SELECT id FROM contratos
      WHERE inquilino_id = auth.uid() OR coinquilino_id = auth.uid()
    )
  );
