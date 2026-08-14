-- Spotify permalink on repertoire (same role as youtube_url).
-- Unique source_url so Cifra Club / Songsterr imports cannot duplicate the same page.

delete from public.repertoire r
where r.source_url is not null
  and exists (
    select 1
    from public.repertoire keep
    where keep.source_url = r.source_url
      and keep.id <> r.id
      and (
        cardinality(coalesce(keep.chords, '{}'::text[]))
          > cardinality(coalesce(r.chords, '{}'::text[]))
        or (
          cardinality(coalesce(keep.chords, '{}'::text[]))
            = cardinality(coalesce(r.chords, '{}'::text[]))
          and keep.created_at > r.created_at
        )
      )
  );

alter table public.repertoire
  add column if not exists spotify_url text;

create unique index if not exists repertoire_source_url_unique
  on public.repertoire (source_url)
  where source_url is not null;
