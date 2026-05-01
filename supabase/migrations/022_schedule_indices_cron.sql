-- ============================================================
-- 022_schedule_indices_cron.sql
-- Habilita pg_cron + pg_net y programa fetch-index-rates mensual.
--
-- Pre-requisito: en vault.secrets debe existir un secret llamado
-- 'service_role_key' con el JWT service_role del proyecto.
-- Crear con: SELECT vault.create_secret('<JWT>', 'service_role_key');
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;

-- Día 15 de cada mes a las 09:00 UTC (06:00 ART). INDEC publica el IPC
-- entre el 10 y el 15 del mes siguiente al medido.
SELECT cron.schedule(
  'fetch-index-rates-monthly',
  '0 9 15 * *',
  $$
  SELECT net.http_post(
    url := 'https://kxzkunyglzxefzzifcxv.supabase.co/functions/v1/fetch-index-rates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
