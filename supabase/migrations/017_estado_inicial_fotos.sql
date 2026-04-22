-- Migración 017: Fotos del estado inicial de la vivienda
--
-- El inquilino puede subir fotos al arrancar el contrato documentando cómo recibió
-- la vivienda. El admin puede agregar feedback a cada foto. Estas fotos sirven
-- de respaldo al momento de desocupar el inmueble.

CREATE TABLE IF NOT EXISTS estado_inicial_fotos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id   uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  contrato_id       uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  subido_por        uuid NOT NULL REFERENCES auth.users(id),
  ruta_archivo      text NOT NULL,
  descripcion       text,
  feedback_admin    text,
  creado_en         timestamptz NOT NULL DEFAULT now(),
  actualizado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estado_inicial_fotos_contrato ON estado_inicial_fotos(contrato_id);

CREATE OR REPLACE FUNCTION set_actualizado_en_estado_inicial_fotos()
RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estado_inicial_fotos_updated ON estado_inicial_fotos;
CREATE TRIGGER trg_estado_inicial_fotos_updated
  BEFORE UPDATE ON estado_inicial_fotos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en_estado_inicial_fotos();

ALTER TABLE estado_inicial_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_estado_inicial ON estado_inicial_fotos
  FOR ALL
  USING (organizacion_id = get_organizacion_id() AND tiene_rol('administrador'::rol_usuario))
  WITH CHECK (organizacion_id = get_organizacion_id() AND tiene_rol('administrador'::rol_usuario));

CREATE POLICY inquilino_select_estado_inicial ON estado_inicial_fotos
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT id FROM contratos
      WHERE inquilino_id = auth.uid() OR coinquilino_id = auth.uid()
    )
  );

CREATE POLICY inquilino_insert_estado_inicial ON estado_inicial_fotos
  FOR INSERT
  WITH CHECK (
    organizacion_id = get_organizacion_id()
    AND subido_por = auth.uid()
    AND contrato_id IN (
      SELECT id FROM contratos
      WHERE inquilino_id = auth.uid() OR coinquilino_id = auth.uid()
    )
  );

CREATE POLICY inquilino_update_estado_inicial ON estado_inicial_fotos
  FOR UPDATE
  USING (organizacion_id = get_organizacion_id() AND subido_por = auth.uid())
  WITH CHECK (organizacion_id = get_organizacion_id() AND subido_por = auth.uid());

CREATE POLICY inquilino_delete_estado_inicial ON estado_inicial_fotos
  FOR DELETE
  USING (
    organizacion_id = get_organizacion_id()
    AND subido_por = auth.uid()
    AND feedback_admin IS NULL
  );

CREATE POLICY propietario_select_estado_inicial ON estado_inicial_fotos
  FOR SELECT
  USING (
    organizacion_id = get_organizacion_id()
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.propietario_id = auth.uid()
    )
  );

-- Bucket de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('estado-inicial', 'estado-inicial', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY estado_inicial_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'estado-inicial' AND (storage.foldername(name))[1] = get_organizacion_id()::text);

CREATE POLICY estado_inicial_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'estado-inicial'
    AND (storage.foldername(name))[1] = get_organizacion_id()::text
    AND tiene_rol('administrador'::rol_usuario, 'inquilino'::rol_usuario)
  );

CREATE POLICY estado_inicial_update ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'estado-inicial' AND (storage.foldername(name))[1] = get_organizacion_id()::text);

CREATE POLICY estado_inicial_delete ON storage.objects
  FOR DELETE
  USING (bucket_id = 'estado-inicial' AND (storage.foldername(name))[1] = get_organizacion_id()::text);
