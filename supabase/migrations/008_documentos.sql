-- ============================================================
-- 008_documentos.sql
-- ============================================================

CREATE TABLE documentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  contrato_id     uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,

  tipo_documento  tipo_documento   NOT NULL,
  estado          estado_documento NOT NULL DEFAULT 'pendiente',
  ruta_archivo    text,
  verificado_por  uuid REFERENCES perfiles(id),

  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER actualizar_documentos_timestamp
  BEFORE UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE INDEX idx_documentos_contrato     ON documentos(contrato_id);
CREATE INDEX idx_documentos_organizacion ON documentos(organizacion_id);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo
CREATE POLICY "admin_all_documentos" ON documentos
  FOR ALL USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  ) WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- Inquilino: ve y sube documentos de sus contratos
CREATE POLICY "inquilino_select_documentos" ON documentos
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND contrato_id IN (
      SELECT id FROM contratos WHERE inquilino_id = auth.uid()
    )
  );

CREATE POLICY "inquilino_insert_documentos" ON documentos
  FOR INSERT WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND contrato_id IN (
      SELECT id FROM contratos WHERE inquilino_id = auth.uid()
    )
  );
