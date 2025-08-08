-- Create tables for playlists and tracks
create extension if not exists "pgcrypto";

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  artist text not null,
  file_path text not null,
  public_url text not null,
  mime_type text,
  size bigint,
  duration numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

-- Optional indexes
create index if not exists idx_playlists_user on public.playlists(user_id);
create index if not exists idx_tracks_user on public.tracks(user_id);
create index if not exists idx_playlist_tracks_playlist on public.playlist_tracks(playlist_id);
