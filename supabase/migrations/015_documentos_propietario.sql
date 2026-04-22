-- ============================================================
-- 015_documentos_propietario.sql
-- Extiende acceso a documentos para propietarios y coinquilinos
-- ============================================================

-- Propietario: lee documentos de contratos de sus propiedades
CREATE POLICY "propietario_select_documentos" ON documentos
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('propietario')
    AND contrato_id IN (
      SELECT c.id FROM contratos c
      JOIN propiedades p ON p.id = c.propiedad_id
      WHERE p.propietario_id = auth.uid()
    )
  );

-- Coinquilino: lee documentos de sus contratos
CREATE POLICY "coinquilino_select_documentos" ON documentos
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND contrato_id IN (
      SELECT id FROM contratos WHERE coinquilino_id = auth.uid()
    )
  );

-- Propietario: lectura en storage (org-level, el signed URL es la línea de defensa real)
CREATE POLICY "propietario_read_storage_documentos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.tiene_rol('propietario')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );
