-- Tabla de perfiles de usuario (extiende auth.users)
create table perfiles (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  organizacion_id       uuid        not null references organizaciones(id),
  rol                   rol_usuario not null,
  nombre                text        not null,
  apellido              text        not null,
  telefono              text,
  dni                   text,
  avatar_url            text,
  activo                boolean     not null default true,
  preferencias_notificacion jsonb   not null default '{"email": true, "whatsapp": false}',
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now()
);

create index idx_perfiles_org on perfiles(organizacion_id);
create index idx_perfiles_rol on perfiles(organizacion_id, rol);

create trigger trg_perfiles_updated
  before update on perfiles
  for each row execute function actualizar_timestamp();

-- Función que crea un perfil automáticamente al registrarse
-- (Se completa con organizacion_id via metadatos del registro)
create or replace function handle_new_user()
returns trigger as $$
begin
  -- Solo si viene con metadatos completos (invitación con rol asignado)
  if new.raw_user_meta_data->>'organizacion_id' is not null then
    insert into perfiles (id, organizacion_id, rol, nombre, apellido)
    values (
      new.id,
      (new.raw_user_meta_data->>'organizacion_id')::uuid,
      (new.raw_user_meta_data->>'rol')::rol_usuario,
      coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
      coalesce(new.raw_user_meta_data->>'apellido', '')
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_new_user
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table perfiles enable row level security;

-- Ver todos los perfiles del mismo org
create policy "perfiles_select" on perfiles
  for select using (
    organizacion_id = (select organizacion_id from perfiles where id = auth.uid())
  );

-- Actualizar su propio perfil
create policy "perfiles_update_own" on perfiles
  for update using (id = auth.uid());

-- Admin puede actualizar cualquier perfil del org
create policy "perfiles_update_admin" on perfiles
  for update using (
    organizacion_id = (select organizacion_id from perfiles where id = auth.uid())
    and (select rol from perfiles where id = auth.uid()) = 'administrador'
  );

-- Service role inserta perfiles (via trigger handle_new_user)
create policy "perfiles_insert_service" on perfiles
  for insert with check (true);
