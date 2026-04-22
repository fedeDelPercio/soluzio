-- Migración 015: Día de vencimiento del pago mensual en contratos
--
-- Agrega la columna dia_vencimiento_pago al contrato para indicar qué día
-- del mes vence el pago del alquiler (ej: 5, 10). Reemplaza la lógica anterior
-- que usaba el día de inicio del contrato como día de vencimiento mensual.

ALTER TABLE contratos
  ADD COLUMN dia_vencimiento_pago smallint
  CHECK (dia_vencimiento_pago BETWEEN 1 AND 31);

COMMENT ON COLUMN contratos.dia_vencimiento_pago IS
  'Día del mes en que vence el pago del alquiler (1-31). NULL si no se especificó; debe completarse antes de generar pagos.';

-- =============================================================================
-- Migración de datos existentes (OPCIONAL)
-- =============================================================================
-- Para contratos ya creados con la lógica vieja (donde fecha_vencimiento de
-- cada pago era el día de inicio), el admin puede setear el día correcto
-- desde la UI de edición y el sistema recalculará automáticamente.
--
-- Si querés hacerlo masivo desde SQL, descomentá el bloque de abajo y ajustá
-- el día por defecto (ej: 10). Esto:
--   1. Setea dia_vencimiento_pago = 10 en todos los contratos que lo tengan NULL
--   2. Recalcula fecha_vencimiento en periodos_pago
--   3. Recalcula fecha_vencimiento en pagos que no hayan sido pagados aún
--
-- Descomentar con cuidado — ejecutar solo si estás seguro.

-- UPDATE contratos SET dia_vencimiento_pago = 10 WHERE dia_vencimiento_pago IS NULL;
--
-- UPDATE periodos_pago pp
--   SET fecha_vencimiento = make_date(
--     pp.anio,
--     pp.mes,
--     LEAST(c.dia_vencimiento_pago,
--           EXTRACT(day FROM (date_trunc('month', make_date(pp.anio, pp.mes, 1)) + interval '1 month - 1 day'))::int)
--   )
--   FROM contratos c
--   WHERE pp.contrato_id = c.id
--     AND c.dia_vencimiento_pago IS NOT NULL;
--
-- UPDATE pagos p
--   SET fecha_vencimiento = pp.fecha_vencimiento
--   FROM periodos_pago pp
--   WHERE p.periodo_pago_id = pp.id
--     AND p.estado IN ('pendiente', 'atrasado');
