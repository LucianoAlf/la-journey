create table if not exists public.school_cover_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  render_data jsonb not null default '{}'::jsonb,
  thumbnail_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_cover_templates_school_id_idx
  on public.school_cover_templates(school_id);

create index if not exists school_cover_templates_updated_at_idx
  on public.school_cover_templates(updated_at desc);

alter table public.school_cover_templates enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists school_cover_templates_dev_admin_all on public.school_cover_templates;
create policy school_cover_templates_dev_admin_all
on public.school_cover_templates
as permissive
for all
to authenticated
using (public.is_dev_admin())
with check (public.is_dev_admin());

drop trigger if exists school_cover_templates_set_updated_at on public.school_cover_templates;
create trigger school_cover_templates_set_updated_at
before update on public.school_cover_templates
for each row
execute function public.set_updated_at();

comment on table public.school_cover_templates is 'Saved cover compositions for school Brand Kit reuse.';
comment on column public.school_cover_templates.render_data is 'Cover block render_data snapshot, including background, text elements, logo, overlays, colors, and layout.';
