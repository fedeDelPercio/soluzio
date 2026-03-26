-- ============================================================
-- 006_propiedades.sql
-- ============================================================

CREATE TABLE propiedades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
  propietario_id  uuid NOT NULL REFERENCES perfiles(id),
  inmobiliario_id uuid REFERENCES perfiles(id),

  -- Dirección
  calle           varchar(200) NOT NULL,
  numero          varchar(20)  NOT NULL,
  piso            varchar(10),
  depto           varchar(10),
  barrio          varchar(100),
  ciudad          varchar(100) NOT NULL,
  provincia       varchar(100) NOT NULL DEFAULT 'Buenos Aires',
  codigo_postal   varchar(10),

  -- Tipo
  tipo_propiedad  varchar(50)  NOT NULL DEFAULT 'departamento',

  -- Timestamps
  creado_en       timestamptz  NOT NULL DEFAULT now(),
  actualizado_en  timestamptz  NOT NULL DEFAULT now()
);

CREATE TRIGGER actualizar_propiedades_timestamp
  BEFORE UPDATE ON propiedades
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE INDEX idx_propiedades_organizacion ON propiedades(organizacion_id);
CREATE INDEX idx_propiedades_propietario  ON propiedades(propietario_id);

ALTER TABLE propiedades ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo
CREATE POLICY "admin_all_propiedades" ON propiedades
  FOR ALL USING (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  ) WITH CHECK (
    organizacion_id = public.get_organizacion_id()
    AND public.tiene_rol('administrador')
  );

-- Propietario: solo sus propiedades
CREATE POLICY "propietario_select_propiedades" ON propiedades
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND propietario_id = auth.uid()
  );

-- Inmobiliario: solo las propiedades que gestiona
CREATE POLICY "inmobiliario_select_propiedades" ON propiedades
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND inmobiliario_id = auth.uid()
  );
