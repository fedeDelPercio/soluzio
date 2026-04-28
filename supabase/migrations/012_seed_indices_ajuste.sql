-- ============================================================
-- 012_seed_indices_ajuste.sql
-- Seed histórico de IPC (INDEC) e ICL (BCRA) — abr/2024 a mar/2026
--
-- IMPORTANTE:
--   - Los valores están almacenados como tasas mensuales en formato decimal
--     (0.046 = 4.6%).
--   - Los valores 2024–2025 son los oficialmente publicados.
--   - Los valores >= 2026-01 son estimaciones; reemplazar a medida que
--     INDEC y BCRA publiquen.
--   - Idempotente: puede correrse varias veces sin duplicar filas.
-- ============================================================

INSERT INTO indices_ajuste (tipo_indice, anio, mes, valor_tasa) VALUES
  -- IPC (INDEC) variación mensual
  ('ipc', 2024,  4, 0.0880),
  ('ipc', 2024,  5, 0.0420),
  ('ipc', 2024,  6, 0.0460),
  ('ipc', 2024,  7, 0.0400),
  ('ipc', 2024,  8, 0.0420),
  ('ipc', 2024,  9, 0.0350),
  ('ipc', 2024, 10, 0.0270),
  ('ipc', 2024, 11, 0.0240),
  ('ipc', 2024, 12, 0.0270),
  ('ipc', 2025,  1, 0.0220),
  ('ipc', 2025,  2, 0.0240),
  ('ipc', 2025,  3, 0.0370),
  ('ipc', 2025,  4, 0.0280),
  ('ipc', 2025,  5, 0.0150),
  ('ipc', 2025,  6, 0.0160),
  ('ipc', 2025,  7, 0.0190),
  ('ipc', 2025,  8, 0.0190),
  ('ipc', 2025,  9, 0.0210),
  ('ipc', 2025, 10, 0.0230),
  ('ipc', 2025, 11, 0.0240),
  ('ipc', 2025, 12, 0.0270),
  ('ipc', 2026,  1, 0.0250),
  ('ipc', 2026,  2, 0.0230),
  ('ipc', 2026,  3, 0.0210),

  -- ICL (BCRA) — variación mensual del coeficiente Casa Propia
  ('icl', 2024,  4, 0.1190),
  ('icl', 2024,  5, 0.1170),
  ('icl', 2024,  6, 0.0670),
  ('icl', 2024,  7, 0.0440),
  ('icl', 2024,  8, 0.0440),
  ('icl', 2024,  9, 0.0400),
  ('icl', 2024, 10, 0.0360),
  ('icl', 2024, 11, 0.0300),
  ('icl', 2024, 12, 0.0270),
  ('icl', 2025,  1, 0.0240),
  ('icl', 2025,  2, 0.0200),
  ('icl', 2025,  3, 0.0260),
  ('icl', 2025,  4, 0.0350),
  ('icl', 2025,  5, 0.0270),
  ('icl', 2025,  6, 0.0190),
  ('icl', 2025,  7, 0.0180),
  ('icl', 2025,  8, 0.0180),
  ('icl', 2025,  9, 0.0210),
  ('icl', 2025, 10, 0.0220),
  ('icl', 2025, 11, 0.0230),
  ('icl', 2025, 12, 0.0240),
  ('icl', 2026,  1, 0.0230),
  ('icl', 2026,  2, 0.0220),
  ('icl', 2026,  3, 0.0210)
ON CONFLICT (tipo_indice, anio, mes) DO UPDATE SET valor_tasa = EXCLUDED.valor_tasa;
