alter table doctors add column if not exists photo_path text;

-- Run once in Supabase: Storage bucket for doctor reference photos (public read).
insert into storage.buckets (id, name, public)
values ('doctor-photos', 'doctor-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read doctor photos" on storage.objects;
create policy "Public read doctor photos"
on storage.objects for select
using (bucket_id = 'doctor-photos');

-- Recreate view so photo_path is included (see 2026-06-03 migration if already deployed).
