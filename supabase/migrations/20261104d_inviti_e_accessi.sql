alter table public.team_members add column if not exists invitato_il timestamptz;

-- Per gli admin: chi è già entrato e quando (senza esporre altro di auth.users)
create or replace function public.stato_accessi()
returns table(member_id text, ultimo_accesso timestamptz, confermato boolean)
language sql security definer set search_path = public, auth as $$
  select m.id, u.last_sign_in_at, u.email_confirmed_at is not null
  from public.team_members m join auth.users u on lower(u.email) = lower(m.email)
  where public.is_admin()
$$;
revoke all on function public.stato_accessi() from public, anon;
grant execute on function public.stato_accessi() to authenticated;
