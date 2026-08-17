create table if not exists public.practice_audio (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  source text not null default 'lyria' check (source in ('lyria', 'upload')),
  kind text not null check (kind in ('vocalize', 'backing', 'exercise')),
  title text not null,
  recipe jsonb not null default '{}'::jsonb,
  lyria_model text,
  audio_path text,
  duration_seconds integer,
  status text not null default 'generated'
    check (status in ('generated', 'transcribing', 'transcribed', 'transcribe_failed')),
  recognized_chords jsonb,
  recognized_bpm numeric,
  recognized_key text,
  musicai_job_id text,
  exercise_id uuid references public.exercise_library(id) on delete set null,
  repertoire_id uuid references public.repertoire(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists practice_audio_school_created_idx
  on public.practice_audio (school_id, created_at desc);

create index if not exists practice_audio_repertoire_idx
  on public.practice_audio (repertoire_id)
  where repertoire_id is not null;

comment on table public.practice_audio is
  'Takes de áudio didático (Lyria ou upload). Um generate = uma linha. Regenerar cria linha nova.';

alter table public.practice_audio enable row level security;

create policy practice_audio_select on public.practice_audio
  for select using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy practice_audio_insert on public.practice_audio
  for insert with check (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy practice_audio_update on public.practice_audio
  for update using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy practice_audio_delete on public.practice_audio
  for delete using (
    school_id in (select users.school_id from public.users where users.id = auth.uid())
  );

create policy practice_audio_dev_admin on public.practice_audio
  for all using (is_dev_admin()) with check (is_dev_admin());
