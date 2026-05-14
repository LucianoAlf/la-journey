alter table public.schools
  add column if not exists default_cover_font text,
  add column if not exists default_body_font text;

update public.schools
set
  default_cover_font = coalesce(default_cover_font, 'Montserrat'),
  default_body_font = coalesce(default_body_font, 'DM Sans')
where default_cover_font is null
   or default_body_font is null;

comment on column public.schools.default_cover_font is 'Default Google Font family for cover titles and display text.';
comment on column public.schools.default_body_font is 'Default Google Font family for body text in generated materials.';
