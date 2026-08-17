alter table public.practice_audio
  drop constraint if exists practice_audio_source_check;

alter table public.practice_audio
  add constraint practice_audio_source_check
  check (source in ('lyria', 'upload', 'suno'));

comment on table public.practice_audio is
  'Takes de áudio didático (Suno, Lyria ou upload). Um generate = uma linha. Regenerar cria linha nova.';
