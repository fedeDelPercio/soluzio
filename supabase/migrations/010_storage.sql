-- ============================================================
-- 010_storage.sql
-- Buckets privados para documentos, comprobantes y mantenimiento
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documentos',    'documentos',    false, 20971520, ARRAY['application/pdf','image/jpeg','image/png','image/webp']),
  ('comprobantes',  'comprobantes',  false, 5242880,  ARRAY['application/pdf','image/jpeg','image/png','image/webp']),
  ('mantenimiento', 'mantenimiento', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ── Bucket: documentos ──────────────────────────────────────

-- Admin: acceso completo
CREATE POLICY "admin_all_storage_documentos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.tiene_rol('administrador')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.tiene_rol('administrador')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );

-- Inquilino: lee y sube sus propios documentos
CREATE POLICY "inquilino_storage_documentos" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'documentos'
    AND public.tiene_rol('inquilino')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  )
  WITH CHECK (
    bucket_id = 'documentos'
    AND public.tiene_rol('inquilino')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );

-- ── Bucket: comprobantes ────────────────────────────────────

CREATE POLICY "admin_all_storage_comprobantes" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'comprobantes'
    AND public.tiene_rol('administrador')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  )
  WITH CHECK (
    bucket_id = 'comprobantes'
    AND public.tiene_rol('administrador')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );

CREATE POLICY "inquilino_storage_comprobantes" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'comprobantes'
    AND public.tiene_rol('inquilino')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  )
  WITH CHECK (
    bucket_id = 'comprobantes'
    AND public.tiene_rol('inquilino')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );

-- ── Bucket: mantenimiento ───────────────────────────────────

CREATE POLICY "admin_all_storage_mantenimiento" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'mantenimiento'
    AND public.tiene_rol('administrador')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  )
  WITH CHECK (
    bucket_id = 'mantenimiento'
    AND public.tiene_rol('administrador')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );

CREATE POLICY "inquilino_storage_mantenimiento" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'mantenimiento'
    AND public.tiene_rol('inquilino')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  )
  WITH CHECK (
    bucket_id = 'mantenimiento'
    AND public.tiene_rol('inquilino')
    AND (storage.foldername(name))[1] = public.get_organizacion_id()::text
  );
