-- Fonti Notion gestibili dal sito (admin)
create table if not exists public.fonti_notion (
  id uuid primary key default gen_random_uuid(),
  db_id text not null unique,
  nome text not null,
  attivo boolean not null default true,
  corpo boolean not null default false,
  campi_esclusi text[] not null default '{}',
  filtro_campo text, filtro_regex text,
  escludi_campo text, escludi_regex text,
  ordine int default 0,
  created_at timestamptz not null default now()
);
alter table public.fonti_notion enable row level security;
create policy fn_read on public.fonti_notion for select to authenticated using (public.is_team());
create policy fn_write on public.fonti_notion for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.fonti_notion(db_id,nome,corpo,campi_esclusi,filtro_campo,filtro_regex,escludi_campo,escludi_regex,ordine) values
 ('299e69fb-b9e6-807f-a025-c86ddaa82bf2','Paper clinici',true,'{}',null,null,null,null,1),
 ('2fae69fb-b9e6-800e-9abd-f5348624ecf1','Press',false,'{}',null,null,null,null,2),
 ('6f5b386b-4059-4902-b773-0d2d1d9288f8','Blog',true,'{"Meta Description (1)","Featured Image"}','Status','ready|publish|pubblicat|live','Category','nascost',3),
 ('1e2a1b2b-052e-4339-bcd6-26fa6b1d72de','Procedure',false,'{"Developer Notes","Mapping Status"}',null,null,null,null,4),
 ('ed33d2fa-b897-4aba-b180-50b5a5790b19','Esperienze LEMO',false,'{"Unity Scene","Version","Status","Fallback Mode","Transcript"}',null,null,null,null,5),
 ('267e69fb-b9e6-8000-8b31-ffea0c38cd04','Post social passati',true,'{}','Status','published','Platform','^((?!linkedin).)*$',6)
on conflict (db_id) do nothing;

-- Numeri aziendali calcolati in automatico vs inseriti a mano
alter table public.facts add column if not exists automatico boolean not null default false;

-- Chiavi salvate cifrate nel Vault (scrittura/lettura solo service_role, via Edge Functions)
create or replace function public.salva_segreto(nome text, valore text)
returns void language plpgsql security definer set search_path = public, vault as $$
declare sid uuid;
begin
  select id into sid from vault.secrets where name = 'lemo_' || nome;
  if sid is null then perform vault.create_secret(valore, 'lemo_' || nome);
  else perform vault.update_secret(sid, valore); end if;
end $$;
revoke all on function public.salva_segreto(text, text) from public, anon, authenticated;
grant execute on function public.salva_segreto(text, text) to service_role;

create or replace function public.leggi_segreto(nome text)
returns text language sql security definer set search_path = public, vault as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'lemo_' || nome limit 1
$$;
revoke all on function public.leggi_segreto(text) from public, anon, authenticated;
grant execute on function public.leggi_segreto(text) to service_role;

create or replace function public.stato_chiavi()
returns table(nome text, aggiornata timestamptz) language sql security definer set search_path = public, vault as $$
  select replace(name, 'lemo_', ''), updated_at from vault.secrets where name like 'lemo_%' and public.is_admin()
$$;
grant execute on function public.stato_chiavi() to authenticated;

alter publication supabase_realtime add table public.fonti_notion;
