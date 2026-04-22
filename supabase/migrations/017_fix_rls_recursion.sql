-- ============================================================
-- 017_fix_rls_recursion.sql
-- Fix infinite recursion between contratos and propiedades RLS policies.
--
-- The cycle was:
--   contratos (propietario/inmobiliario policies) → SELECT FROM propiedades
--   propiedades (inquilino policy) → SELECT FROM contratos
--
-- Solution: use a SECURITY DEFINER function to query contratos
-- without triggering its RLS policies, breaking the cycle.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_propiedad_ids_inquilino()
RETURNS SETOF uuid AS $$
  SELECT DISTINCT propiedad_id FROM contratos
  WHERE inquilino_id = auth.uid() OR coinquilino_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

DROP POLICY IF EXISTS "inquilino_select_propiedades" ON propiedades;

CREATE POLICY "inquilino_select_propiedades" ON propiedades
  FOR SELECT USING (
    organizacion_id = public.get_organizacion_id()
    AND id IN (SELECT public.get_propiedad_ids_inquilino())
  );
