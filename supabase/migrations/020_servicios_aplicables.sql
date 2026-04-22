-- Migración 020: Servicios aplicables al contrato
--
-- Lista de conceptos de servicios (luz, gas, agua, etc.) que el contrato
-- debe pagar. El sistema usa este campo para auto-generar pagos mensuales
-- y para saber qué recordatorios enviar.

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS servicios_aplicables text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN contratos.servicios_aplicables IS
  'Lista de conceptos de servicios que aplican a este contrato (ej: electricidad, gas, agua, expensas_ordinarias, municipal, otro). El sistema genera pagos mensuales automáticamente para cada servicio aplicable.';
