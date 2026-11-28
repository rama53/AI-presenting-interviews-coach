begin;

alter table public.practice_sessions
  add column if not exists interview_score smallint;

alter table public.practice_sessions
  drop constraint if exists practice_sessions_interview_score_check;

alter table public.practice_sessions
  add constraint practice_sessions_interview_score_check
  check (
    interview_score is null or (
      practice_type = 'interview'
      and ended_at is not null
      and interview_score between 0 and 100
    )
  );

alter table public.practice_sessions enable row level security;

-- Keep existing owner policies and require ownership even if a broader policy exists.
drop policy if exists "Practice history owner guard" on public.practice_sessions;
create policy "Practice history owner guard" on public.practice_sessions
  as restrictive for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Practice history requires sign-in" on public.practice_sessions;
create policy "Practice history requires sign-in" on public.practice_sessions
  as restrictive for all to anon
  using (false)
  with check (false);

grant select (interview_score), update (interview_score)
  on public.practice_sessions to authenticated;

create index if not exists practice_sessions_owner_recent_completed_idx
  on public.practice_sessions (user_id, ended_at desc, id desc)
  where ended_at is not null;

commit;
