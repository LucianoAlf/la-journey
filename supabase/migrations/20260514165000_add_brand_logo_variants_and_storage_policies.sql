insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-logos',
  'school-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.schools
  add column if not exists logo_variants jsonb not null default '{}'::jsonb;

update public.schools
set logo_variants = jsonb_strip_nulls(
  coalesce(logo_variants, '{}'::jsonb)
  || jsonb_build_object('primary', logo_url)
)
where logo_url is not null
  and not (coalesce(logo_variants, '{}'::jsonb) ? 'primary');

drop policy if exists school_logos_public_read on storage.objects;
create policy school_logos_public_read
on storage.objects
for select
to public
using (bucket_id = 'school-logos');

drop policy if exists school_logos_dev_admin_insert on storage.objects;
create policy school_logos_dev_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'school-logos'
  and public.is_dev_admin()
);

drop policy if exists school_logos_dev_admin_update on storage.objects;
create policy school_logos_dev_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'school-logos'
  and public.is_dev_admin()
)
with check (
  bucket_id = 'school-logos'
  and public.is_dev_admin()
);

drop policy if exists school_logos_dev_admin_delete on storage.objects;
create policy school_logos_dev_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'school-logos'
  and public.is_dev_admin()
);

comment on column public.schools.logo_variants is 'Brand Kit logo variants keyed by usage, such as primary, symbol, horizontal, light, and dark.';
