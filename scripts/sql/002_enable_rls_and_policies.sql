-- A) Database RLS: playlists, tracks, playlist_tracks

-- Pastikan RLS aktif
alter table public.playlists enable row level security;
alter table public.tracks enable row level security;
alter table public.playlist_tracks enable row level security;

-- Hapus policy lama jika ada (aman untuk rerun)
drop policy if exists playlists_owner_all on public.playlists;
drop policy if exists tracks_owner_all on public.tracks;
drop policy if exists playlist_tracks_owner_all on public.playlist_tracks;

-- playlists: hanya pemilik (auth.uid()) yang boleh SELECT/INSERT/UPDATE/DELETE
create policy playlists_owner_all
on public.playlists
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- tracks: hanya pemilik yang boleh SELECT/INSERT/UPDATE/DELETE
create policy tracks_owner_all
on public.tracks
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- playlist_tracks: hanya baris yang menghubungkan playlist & track milik user
create policy playlist_tracks_owner_all
on public.playlist_tracks
for all
to authenticated
using (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  and exists (select 1 from public.tracks t where t.id = track_id and t.user_id = auth.uid())
)
with check (
  exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid())
  and exists (select 1 from public.tracks t where t.id = track_id and t.user_id = auth.uid())
);
