-- Persist Spotify/YouTube confirmation metadata so URL, embed and covers
-- can be rebuilt from IDs without another search.

alter table public.repertoire
  add column if not exists spotify_track_id text,
  add column if not exists spotify_track_name text,
  add column if not exists spotify_artist_name text,
  add column if not exists spotify_album_name text,
  add column if not exists spotify_album_year text,
  add column if not exists spotify_duration_ms integer,
  add column if not exists spotify_cover_url_large text,
  add column if not exists spotify_cover_url_medium text,
  add column if not exists spotify_cover_url_small text,
  add column if not exists youtube_video_id text,
  add column if not exists youtube_title text,
  add column if not exists youtube_channel text,
  add column if not exists youtube_duration text,
  add column if not exists youtube_thumbnail_url text;
