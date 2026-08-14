create table if not exists public.exercise_collections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  name text not null,
  description text,
  instrument text not null default 'universal',
  difficulty_level public.difficulty_level not null default 'foundation',
  tags text[] not null default '{}',
  cover_image_url text,
  is_template boolean not null default false,
  curation_status public.curation_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.exercise_collections(id) on delete cascade,
  exercise_id uuid not null references public.exercise_library(id) on delete cascade,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (collection_id, exercise_id)
);

create index if not exists exercise_collections_school_idx
  on public.exercise_collections (school_id, sort_order);

create index if not exists exercise_collection_items_collection_idx
  on public.exercise_collection_items (collection_id, sort_order);

comment on table public.exercise_collections is
  'Cadernos temáticos de exercício. Agrupa itens da exercise_library por instrumento, nível ou propósito pedagógico.';
comment on table public.exercise_collection_items is
  'Exercícios vinculados a um caderno. Um exercício pode estar em múltiplos cadernos.';

alter table public.exercise_collections enable row level security;
alter table public.exercise_collection_items enable row level security;

create policy exercise_collections_select on public.exercise_collections
  for select using (
    school_id is null
    or school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collections_insert on public.exercise_collections
  for insert with check (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collections_update on public.exercise_collections
  for update using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collections_delete on public.exercise_collections
  for delete using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy exercise_collection_items_select on public.exercise_collection_items
  for select using (
    collection_id in (select exercise_collections.id from public.exercise_collections)
  );

create policy exercise_collection_items_insert on public.exercise_collection_items
  for insert with check (
    collection_id in (
      select exercise_collections.id from public.exercise_collections
      where exercise_collections.school_id in (
        select users.school_id from public.users where users.id = auth.uid()
      )
    )
  );

create policy exercise_collection_items_update on public.exercise_collection_items
  for update using (
    collection_id in (
      select exercise_collections.id from public.exercise_collections
      where exercise_collections.school_id in (
        select users.school_id from public.users where users.id = auth.uid()
      )
    )
  );

create policy exercise_collection_items_delete on public.exercise_collection_items
  for delete using (
    collection_id in (
      select exercise_collections.id from public.exercise_collections
      where exercise_collections.school_id in (
        select users.school_id from public.users where users.id = auth.uid()
      )
    )
  );

create policy exercise_collections_dev_admin on public.exercise_collections
  for all using (is_dev_admin()) with check (is_dev_admin());

create policy exercise_collection_items_dev_admin on public.exercise_collection_items
  for all using (is_dev_admin()) with check (is_dev_admin());
