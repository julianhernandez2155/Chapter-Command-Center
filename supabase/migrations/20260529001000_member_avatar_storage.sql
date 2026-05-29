-- Member profile photo storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-avatars',
  'member-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists member_avatars_public_read on storage.objects;
create policy member_avatars_public_read
  on storage.objects
  for select
  using (bucket_id = 'member-avatars');

drop policy if exists member_avatars_insert_own_folder on storage.objects;
create policy member_avatars_insert_own_folder
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'member-avatars'
    and (
      (storage.foldername(name))[1] = public.current_member_id()::text
      or public.has_position(array['president', 'secretary'])
    )
  );

drop policy if exists member_avatars_update_own_folder on storage.objects;
create policy member_avatars_update_own_folder
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'member-avatars'
    and (
      (storage.foldername(name))[1] = public.current_member_id()::text
      or public.has_position(array['president', 'secretary'])
    )
  )
  with check (
    bucket_id = 'member-avatars'
    and (
      (storage.foldername(name))[1] = public.current_member_id()::text
      or public.has_position(array['president', 'secretary'])
    )
  );

drop policy if exists member_avatars_delete_own_folder on storage.objects;
create policy member_avatars_delete_own_folder
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'member-avatars'
    and (
      (storage.foldername(name))[1] = public.current_member_id()::text
      or public.has_position(array['president', 'secretary'])
    )
  );
