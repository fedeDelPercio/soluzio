-- Migración 018: Facturas de servicios
--
-- Tres cambios:
--   1. Toggle a nivel contrato: quién carga las facturas de servicios (default: inquilino).
--   2. comprobantes_pago.tipo_comprobante: para distinguir la factura (boleta de Edenor, etc.)
--      del comprobante de pago (que la pagó).
--   3. pagos.monto_esperado con DEFAULT 0 para permitir crear pagos de servicios sin monto conocido.

ALTER TABLE contratos
  ADD COLUMN IF NOT EXISTS facturas_servicios_las_carga varchar(20)
    CHECK (facturas_servicios_las_carga IN ('inquilino', 'propietario'))
    DEFAULT 'inquilino';

COMMENT ON COLUMN contratos.facturas_servicios_las_carga IS
  'Quién es responsable de subir las facturas de servicios en este contrato. Por defecto: inquilino.';

ALTER TABLE comprobantes_pago
  ADD COLUMN IF NOT EXISTS tipo_comprobante varchar(20)
    CHECK (tipo_comprobante IN ('factura', 'pago'))
    DEFAULT 'pago';

COMMENT ON COLUMN comprobantes_pago.tipo_comprobante IS
  'Tipo de archivo: factura (la boleta del servicio) o pago (el comprobante de que se pagó). Para alquileres siempre es pago.';

ALTER TABLE pagos
  ALTER COLUMN monto_esperado SET DEFAULT 0;
