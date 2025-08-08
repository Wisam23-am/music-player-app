-- B) Storage RLS: izinkan unggah ke bucket "music" untuk user terautentikasi
-- Ganti 'music' jika nama bucket berbeda (harus sama dengan env NEXT_PUBLIC_SUPABASE_BUCKET bila kamu memakai env itu).

-- Catatan: Secara default Storage menolak upload tanpa RLS policy. Anda perlu memberi INSERT pada storage.objects. [^5]

-- Insert: hanya ke folder {auth.uid()}/*
drop policy if exists "insert_own_folder" on storage.objects;
create policy "insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'music'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Select: izinkan user melihat hanya file di foldernya (list/get via API)
drop policy if exists "select_own_folder" on storage.objects;
create policy "select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'music'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Update/Delete: hanya file di folder sendiri
drop policy if exists "update_own_folder" on storage.objects;
create policy "update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'music'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "delete_own_folder" on storage.objects;
create policy "delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'music'
  and split_part(name, '/', 1) = auth.uid()::text
);
