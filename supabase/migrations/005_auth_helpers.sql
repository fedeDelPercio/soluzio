-- Funciones helper para RLS en public schema
-- Nota: auth schema es read-only en Supabase cloud

create or replace function public.get_organizacion_id()
returns uuid as $$
  select organizacion_id from perfiles where id = auth.uid()
$$ language sql stable security definer;

create or replace function public.get_rol_usuario()
returns rol_usuario as $$
  select rol from perfiles where id = auth.uid()
$$ language sql stable security definer;

create or replace function public.tiene_rol(variadic roles rol_usuario[])
returns boolean as $$
  select public.get_rol_usuario() = any(roles)
$$ language sql stable security definer;

create or replace function public.es_administrador()
returns boolean as $$
  select public.get_rol_usuario() = 'administrador'
$$ language sql stable security definer;

-- RLS de organizaciones (cross-table, requiere que perfiles exista)
create policy "organizaciones_select" on organizaciones
  for select using (id = public.get_organizacion_id());

create policy "organizaciones_update" on organizaciones
  for update using (
    id = public.get_organizacion_id() and public.es_administrador()
  );
