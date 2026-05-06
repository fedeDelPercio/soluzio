-- 023: Agregar campo descripción a fotos_solicitud
-- Permite comentar cada foto individualmente (se puede editar post-upload)
ALTER TABLE fotos_solicitud ADD COLUMN IF NOT EXISTS descripcion text;
