-- Migración 019: Policies de SELECT para el rol inmobiliario
--
-- Un inmobiliario es un agente externo que cedió propiedades a la administradora.
-- Es un rol read-only: solo puede ver lo relacionado con las propiedades donde
-- propiedades.inmobiliario_id = auth.uid().

-- pagos
DROP POLICY IF EXISTS inmobiliario_select_pagos ON pagos;
CREATE POLICY inmobiliario_select_pagos ON pagos
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );

-- periodos_pago
DROP POLICY IF EXISTS inmobiliario_select_periodos ON periodos_pago;
CREATE POLICY inmobiliario_select_periodos ON periodos_pago
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );

-- comprobantes_pago
DROP POLICY IF EXISTS inmobiliario_select_comprobantes ON comprobantes_pago;
CREATE POLICY inmobiliario_select_comprobantes ON comprobantes_pago
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND pago_id IN (
      SELECT pg.id FROM pagos pg
      JOIN contratos c ON c.id = pg.contrato_id
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );

-- documentos
DROP POLICY IF EXISTS inmobiliario_select_documentos ON documentos;
CREATE POLICY inmobiliario_select_documentos ON documentos
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );

-- solicitudes
DROP POLICY IF EXISTS inmobiliario_select_solicitudes ON solicitudes;
CREATE POLICY inmobiliario_select_solicitudes ON solicitudes
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );

-- estado_inicial_fotos
DROP POLICY IF EXISTS inmobiliario_select_estado_inicial ON estado_inicial_fotos;
CREATE POLICY inmobiliario_select_estado_inicial ON estado_inicial_fotos
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.inmobiliario_id = auth.uid()
    )
  );

-- perfiles de inquilinos, coinquilinos, garantes y propietarios relacionados
DROP POLICY IF EXISTS inmobiliario_select_perfiles ON perfiles;
CREATE POLICY inmobiliario_select_perfiles ON perfiles
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND (
      id = auth.uid()
      OR id IN (
        SELECT c.inquilino_id FROM contratos c
        JOIN propiedades p ON p.id = c.propiedad_id
        WHERE p.inmobiliario_id = auth.uid()
        UNION
        SELECT c.coinquilino_id FROM contratos c
        JOIN propiedades p ON p.id = c.propiedad_id
        WHERE p.inmobiliario_id = auth.uid() AND c.coinquilino_id IS NOT NULL
        UNION
        SELECT c.garante_id FROM contratos c
        JOIN propiedades p ON p.id = c.propiedad_id
        WHERE p.inmobiliario_id = auth.uid() AND c.garante_id IS NOT NULL
        UNION
        SELECT p.propietario_id FROM propiedades p
        WHERE p.inmobiliario_id = auth.uid()
      )
    )
  );
