-- ============================================================
-- 027_schedule_notifications_cron.sql
-- Schedule diario para disparar el edge function send-notifications.
--
-- Pre-requisito: 022_schedule_indices_cron.sql ya creó las extensiones
-- pg_cron + pg_net y el secret 'service_role_key' en vault.
-- ============================================================

-- Diariamente a las 12:00 UTC (09:00 ART).
SELECT cron.schedule(
  'send-daily-notifications',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kxzkunyglzxefzzifcxv.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := '{"modo":"cron"}'::jsonb
  ) AS request_id;
  $$
);
