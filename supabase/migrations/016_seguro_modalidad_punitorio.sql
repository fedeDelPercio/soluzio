-- Migración 016: Seguro de incendio, modalidad de cobro y tasa punitoria
--
-- Agrega 3 campos al contrato:
--   - requiere_seguro_incendio: si el contrato exige seguro de incendio (detectado por IA + confirmado por admin)
--   - modalidad_cobro: estricto (cobrar multa por mora) o flexible (no cobrar aunque esté pactada)
--   - tasa_punitorio_mensual: porcentaje mensual de punitorio para calcular la multa

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS requiere_seguro_incendio boolean,
  ADD COLUMN IF NOT EXISTS modalidad_cobro varchar(20) CHECK (modalidad_cobro IN ('estricto', 'flexible')),
  ADD COLUMN IF NOT EXISTS tasa_punitorio_mensual numeric(5,2) CHECK (tasa_punitorio_mensual >= 0 AND tasa_punitorio_mensual <= 100);

COMMENT ON COLUMN contratos.requiere_seguro_incendio IS
  'Si el contrato exige que el locatario contrate seguro de incendio. NULL = no definido.';

COMMENT ON COLUMN contratos.modalidad_cobro IS
  'Modalidad de cobro de multa por pago atrasado: estricto (se cobra) o flexible (no se cobra aunque esté en el contrato).';

COMMENT ON COLUMN contratos.tasa_punitorio_mensual IS
  'Porcentaje mensual de interés punitorio por mora (ej: 5.00 = 5% mensual). Usado para calcular multa cuando modalidad_cobro = estricto.';
