alter table public.repertoire
  add column if not exists curated_by uuid references public.users(id) on delete set null;

create index if not exists repertoire_curated_by_idx on public.repertoire (curated_by);

comment on column public.repertoire.curated_by is 'Professor who last approved or published this song.';
