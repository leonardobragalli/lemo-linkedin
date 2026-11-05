-- Pannello di Matteo 1:1: stato condiviso (stesse chiavi che il Pannello usava su MQTT), una riga per chiave.
create table if not exists public.pannello_stato (
  chiave text primary key,
  valore text not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.pannello_stato enable row level security;
-- Come nel Pannello originale: tutto il team legge e scrive lo stato condiviso.
create policy ps_read on public.pannello_stato for select to authenticated using (public.is_team());
create policy ps_insert on public.pannello_stato for insert to authenticated with check (public.is_team());
create policy ps_update on public.pannello_stato for update to authenticated using (public.is_team()) with check (public.is_team());
create policy ps_delete on public.pannello_stato for delete to authenticated using (public.is_team());
alter publication supabase_realtime add table public.pannello_stato;
alter table public.pannello_stato replica identity full;
