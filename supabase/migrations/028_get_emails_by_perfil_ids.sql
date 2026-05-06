-- ============================================================
-- 028_get_emails_by_perfil_ids.sql
-- Helper SECURITY DEFINER para que edge functions con service_role
-- resuelvan emails a partir de perfil_ids. La tabla perfiles no
-- guarda email (vive en auth.users) y PostgREST no expone auth.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_emails_by_perfil_ids(perfil_ids uuid[])
RETURNS TABLE(id uuid, email text)
SECURITY DEFINER
LANGUAGE sql
STABLE
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(perfil_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_emails_by_perfil_ids(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_emails_by_perfil_ids(uuid[]) TO authenticated;
