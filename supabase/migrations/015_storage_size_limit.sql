-- ============================================================
-- 015_storage_size_limit.sql
-- Aumenta el límite del bucket documentos a 20 MB
-- Contratos firmados con firmas digitales pueden superar los 10 MB
-- ============================================================

UPDATE storage.buckets
SET file_size_limit = 20971520  -- 20 MB
WHERE id = 'documentos';
