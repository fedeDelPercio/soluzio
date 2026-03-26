-- ============================================================
-- 009_indices_ajuste.sql
-- Tabla global (sin organizacion_id) — datos de INDEC/BCRA
-- ============================================================

CREATE TABLE indices_ajuste (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_indice indice_ajuste NOT NULL,
  anio        integer       NOT NULL,
  mes         integer       NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_tasa  numeric(10,6) NOT NULL, -- tasa mensual decimal (0.06 = 6%)
  creado_en   timestamptz   NOT NULL DEFAULT now(),

  UNIQUE (tipo_indice, anio, mes)
);

CREATE INDEX idx_indices_tipo_fecha ON indices_ajuste(tipo_indice, anio DESC, mes DESC);

ALTER TABLE indices_ajuste ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer (datos públicos)
CREATE POLICY "authenticated_select_indices" ON indices_ajuste
  FOR SELECT TO authenticated USING (true);

-- Solo service_role (cron jobs) puede escribir — sin policy explícita = solo bypass
