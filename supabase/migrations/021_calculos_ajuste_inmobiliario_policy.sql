-- ============================================================
-- 021_calculos_ajuste_inmobiliario_policy.sql
-- Permite al rol inmobiliario leer los ajustes aplicados en
-- contratos de las propiedades que gestiona (read-only).
-- ============================================================

CREATE POLICY "calculos_ajuste_inmobiliario_select" ON calculos_ajuste
  FOR SELECT TO authenticated
  USING (
    organizacion_id = get_organizacion_id()
    AND tiene_rol('inmobiliario'::rol_usuario)
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON c.propiedad_id = p.id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );
