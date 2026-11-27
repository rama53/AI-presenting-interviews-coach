begin;

grant update (report) on public.practice_sessions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('practice-recordings', 'practice-recordings', false, 25000000, array['video/webm', 'video/mp4'])
on conflict (id) do nothing;

drop policy if exists "Read own practice recordings" on storage.objects;
create policy "Read own practice recordings" on storage.objects
for select to authenticated using (
  bucket_id = 'practice-recordings' and exists (
    select 1 from public.practice_sessions as session
    where session.user_id = (select auth.uid())
      and name = session.id::text || '/recording'
  )
);

drop policy if exists "Upload own practice recordings" on storage.objects;
create policy "Upload own practice recordings" on storage.objects
for insert to authenticated with check (
  bucket_id = 'practice-recordings' and exists (
    select 1 from public.practice_sessions as session
    where session.user_id = (select auth.uid())
      and session.ended_at is not null
      and name = session.id::text || '/recording'
  )
);

commit;
