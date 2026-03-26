-- ============================================================
-- 011_pagos.sql
-- Tablas para gestión de pagos: periodos_pago, pagos, comprobantes_pago
-- ============================================================

-- ── periodos_pago ────────────────────────────────────────────
-- Registro inmutable del monto que se debía en cada mes.
-- Una vez insertado no se modifica (auditoría histórica post-ajuste).

CREATE TABLE periodos_pago (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id  uuid        NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  contrato_id      uuid        NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  anio             int         NOT NULL,
  mes              int         NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fecha_vencimiento date       NOT NULL,
  monto            numeric(12,2) NOT NULL,
  tasa_ajuste      numeric(8,6),  -- null si no hubo ajuste ese período
  creado_en        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, anio, mes)
);

CREATE INDEX idx_periodos_pago_contrato  ON periodos_pago(contrato_id);
CREATE INDEX idx_periodos_pago_org       ON periodos_pago(organizacion_id);
CREATE INDEX idx_periodos_pago_venc      ON periodos_pago(fecha_vencimiento);

ALTER TABLE periodos_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "periodos_pago_admin" ON periodos_pago
  FOR ALL TO authenticated
  USING (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'))
  WITH CHECK (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'));

CREATE POLICY "periodos_pago_inquilino_select" ON periodos_pago
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND contrato_id IN (
      SELECT id FROM contratos WHERE inquilino_id = auth.uid()
    )
  );

CREATE POLICY "periodos_pago_propietario_select" ON periodos_pago
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

-- ── pagos ────────────────────────────────────────────────────
-- Un row por concepto de pago por período.

CREATE TABLE pagos (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id  uuid          NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  periodo_pago_id  uuid          NOT NULL REFERENCES periodos_pago(id) ON DELETE CASCADE,
  contrato_id      uuid          NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  concepto         concepto_pago NOT NULL DEFAULT 'alquiler',
  estado           estado_pago   NOT NULL DEFAULT 'pendiente',
  monto_esperado   numeric(12,2) NOT NULL,
  monto_pagado     numeric(12,2),
  fecha_vencimiento date         NOT NULL,
  creado_en        timestamptz   NOT NULL DEFAULT now(),
  actualizado_en   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagos_contrato  ON pagos(contrato_id);
CREATE INDEX idx_pagos_org       ON pagos(organizacion_id);
CREATE INDEX idx_pagos_estado    ON pagos(organizacion_id, estado);
CREATE INDEX idx_pagos_periodo   ON pagos(periodo_pago_id);

CREATE TRIGGER trg_pagos_updated
  BEFORE UPDATE ON pagos
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pagos_admin" ON pagos
  FOR ALL TO authenticated
  USING (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'))
  WITH CHECK (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'));

CREATE POLICY "pagos_inquilino_select" ON pagos
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND contrato_id IN (
      SELECT id FROM contratos WHERE inquilino_id = auth.uid()
    )
  );

CREATE POLICY "pagos_propietario_select" ON pagos
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

-- ── comprobantes_pago ────────────────────────────────────────
-- Comprobante de pago adjunto. Admin marca pago_recibido = true.

CREATE TABLE comprobantes_pago (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id     uuid        NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  pago_id             uuid        NOT NULL REFERENCES pagos(id) ON DELETE CASCADE,
  ruta_archivo        text        NOT NULL,
  fecha_transferencia date,
  referencia_bancaria text,
  pago_recibido       boolean     NOT NULL DEFAULT false,
  recibido_por        uuid        REFERENCES auth.users(id),
  recibido_en         timestamptz,
  creado_en           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comprobantes_pago_pago ON comprobantes_pago(pago_id);
CREATE INDEX idx_comprobantes_pago_org  ON comprobantes_pago(organizacion_id);

ALTER TABLE comprobantes_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comprobantes_admin" ON comprobantes_pago
  FOR ALL TO authenticated
  USING (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'))
  WITH CHECK (organizacion_id = public.get_organizacion_id() AND public.tiene_rol('administrador'));

-- Inquilino puede subir y ver sus propios comprobantes
CREATE POLICY "comprobantes_inquilino" ON comprobantes_pago
  FOR ALL TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND pago_id IN (
      SELECT p.id FROM pagos p
      JOIN contratos c ON p.contrato_id = c.id
      WHERE c.inquilino_id = auth.uid()
    )
  )
  WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('inquilino')
    AND pago_id IN (
      SELECT p.id FROM pagos p
      JOIN contratos c ON p.contrato_id = c.id
      WHERE c.inquilino_id = auth.uid()
    )
  );

CREATE POLICY "comprobantes_propietario_select" ON comprobantes_pago
  FOR SELECT TO authenticated
  USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('propietario')
    AND pago_id IN (
      SELECT p.id FROM pagos p
      JOIN contratos c ON p.contrato_id = c.id
      JOIN propiedades pr ON c.propiedad_id = pr.id
      WHERE pr.propietario_id = auth.uid()
    )
  );
