-- Tabla de organizaciones (base del modelo multi-tenant)
create table organizaciones (
  id              uuid        primary key default gen_random_uuid(),
  nombre          text        not null,
  slug            text        not null unique,
  cuit            text,
  direccion       text,
  telefono        text,
  email           text,
  logo_url        text,
  configuracion   jsonb       not null default '{}',
  plan            text        not null default 'trial',
  plan_vence_en   timestamptz,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- Trigger para actualizar `actualizado_en` automáticamente
create or replace function actualizar_timestamp()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizaciones_updated
  before update on organizaciones
  for each row execute function actualizar_timestamp();

-- RLS
alter table organizaciones enable row level security;

-- Solo los miembros de la organización pueden ver su propia org
create policy "organizaciones_select" on organizaciones
  for select using (
    id = (select organizacion_id from perfiles where id = auth.uid())
  );

-- Solo el service role puede crear organizaciones
create policy "organizaciones_insert" on organizaciones
  for insert with check (false);

-- Solo administradores pueden actualizar
create policy "organizaciones_update" on organizaciones
  for update using (
    id = (select organizacion_id from perfiles where id = auth.uid())
    and (select rol from perfiles where id = auth.uid()) = 'administrador'
  );
