-- ============================================================
-- 030_notificaciones_offsets_y_seed.sql
-- Agrega defaults de configuracion.dias_offset para los eventos
-- existentes y seedea los 8 eventos "medios" del spec.
--
-- Convención: dias_offset en jsonb es número de días desde el
-- "trigger" del evento. La dirección (antes/después) la define el
-- handler internamente — el admin solo ajusta la magnitud.
-- ============================================================

-- 1) Defaults para los eventos existentes (cron-driven).
WITH defaults AS (
  SELECT * FROM (VALUES
    ('pago_vencido',                  1),
    ('pago_atrasado_7',               7),
    ('pago_atrasado_15',              15),
    ('seguro_incendio_recordatorio',  15),
    ('seguro_incendio_vencido',       1),
    ('contrato_vencido',              1),
    ('tasas_ajuste_faltantes',        0)
  ) AS t(evento, dias_offset)
)
UPDATE notificaciones_config nc
SET configuracion = jsonb_build_object('dias_offset', d.dias_offset)
FROM defaults d
WHERE nc.evento::text = d.evento
  AND (nc.configuracion = '{}'::jsonb OR NOT (nc.configuracion ? 'dias_offset'));

-- 2) Seed de los 8 eventos nuevos por organización.
INSERT INTO notificaciones_config (organizacion_id, evento, habilitado, configuracion)
SELECT o.id, e.evento::tipo_notificacion, true, jsonb_build_object('dias_offset', e.dias_offset)
FROM organizaciones o
CROSS JOIN (
  VALUES
    ('pago_proximo_vencer',     5),
    ('pago_vence_hoy',          0),
    ('seguro_pendiente',        10),
    ('seguro_proximo_vencer',   30),
    ('contrato_por_vencer',     30),
    ('solicitud_sin_respuesta', 2),
    ('contrato_bienvenida',     0),
    ('solicitud_nueva',         0)
) AS e(evento, dias_offset)
ON CONFLICT (organizacion_id, evento) DO NOTHING;
