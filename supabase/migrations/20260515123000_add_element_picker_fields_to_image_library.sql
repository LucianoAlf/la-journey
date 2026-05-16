alter table public.image_library
  add column if not exists element_type text default 'decorativo',
  add column if not exists is_element boolean default false,
  add column if not exists source text default 'upload',
  add column if not exists metadata jsonb default '{}';

comment on column public.image_library.element_type is
  'Element picker category: musica, instrumento, forma, decorativo, moldura.';

comment on column public.image_library.is_element is
  'True when this asset should appear in the editor Elements picker.';

comment on column public.image_library.source is
  'Asset origin, for example upload, ai, seed, or curated.';

comment on column public.image_library.metadata is
  'Extra structured metadata for element picker assets.';
