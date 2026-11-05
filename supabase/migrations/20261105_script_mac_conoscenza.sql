-- Aggiornamento della base di conoscenza spostato su uno script Python (Mac, una volta al giorno).
-- Notion non fornisce più numeri aziendali: quelli li inserisce Leonardo da Impostazioni.

-- 1. Via i numeri calcolati dalla Dashboard Headsets (dati di utilizzo, non aziendali)
delete from public.facts where automatico or chiave like 'auto_%';

-- 2. Spegne gli aggiornamenti notturni lato server (il playbook notturno resta)
select cron.unschedule(jobname) from cron.job where jobname in ('conoscenza-notturna', 'conoscenza-notturna-2');

-- 3. Il server non legge più Notion: via la chiave dal Vault
delete from vault.secrets where name = 'lemo_NOTION_TOKEN';

-- 4. Token dello script (salvato solo come hash sha256; il valore sta nel .env del Mac)
create table if not exists public.script_tokens (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
alter table public.script_tokens enable row level security;   -- nessuna policy: accesso solo dalle funzioni sotto

create or replace function public._script_ok(p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  update public.script_tokens set last_used_at = now()
   where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and revoked_at is null
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke all on function public._script_ok(text) from public, anon, authenticated;

-- Fonti attive + pagine Notion già lette (per leggere solo quelle cambiate)
create or replace function public.script_stato(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public._script_ok(p_token) then raise exception 'token non valido'; end if;
  return jsonb_build_object(
    'fonti', coalesce((select jsonb_agg(to_jsonb(f) - 'created_at' order by f.ordine) from public.fonti_notion f where f.attivo), '[]'::jsonb),
    'visti', coalesce((select jsonb_object_agg(source_id, meta->>'last_edited') from public.knowledge_chunks where fonte = 'notion' and meta ? 'last_edited'), '{}'::jsonb));
end $$;

-- Inserisce/aggiorna pezzi di conoscenza (max 300 per chiamata)
create or replace function public.script_carica(p_token text, p_chunks jsonb)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare nuove int;
begin
  if not public._script_ok(p_token) then raise exception 'token non valido'; end if;
  if jsonb_array_length(p_chunks) > 300 then raise exception 'massimo 300 pezzi per chiamata'; end if;
  insert into public.knowledge_chunks (fonte, source_id, url, titolo, testo, area, meta, hash, letto_il)
  select c->>'fonte', c->>'source_id', c->>'url', left(c->>'titolo', 500), left(c->>'testo', 8000), left(c->>'area', 500),
         coalesce(c->'meta', '{}'::jsonb),
         encode(extensions.digest(coalesce(c->>'titolo','') || E'\n' || coalesce(c->>'testo','') || E'\n' || coalesce(c->>'area',''), 'sha256'), 'hex'),
         now()
    from jsonb_array_elements(p_chunks) c
   where c->>'fonte' in ('notion', 'insights_studio') and coalesce(c->>'source_id', '') <> ''
  on conflict (fonte, source_id) do update
    set url = excluded.url, titolo = excluded.titolo, testo = excluded.testo, area = excluded.area,
        meta = excluded.meta, hash = excluded.hash, letto_il = excluded.letto_il;
  get diagnostics nuove = row_count;
  return nuove;
end $$;

-- Toglie i pezzi di una fonte che non esistono più (protezione: serve un elenco non vuoto)
create or replace function public.script_pulisci(p_token text, p_fonte text, p_presenti text[])
returns int language plpgsql security definer set search_path = public as $$
declare via int;
begin
  if not public._script_ok(p_token) then raise exception 'token non valido'; end if;
  if p_fonte not in ('notion', 'insights_studio') then raise exception 'fonte non prevista'; end if;
  if coalesce(array_length(p_presenti, 1), 0) = 0 then return 0; end if;
  delete from public.knowledge_chunks where fonte = p_fonte and not (source_id = any(p_presenti));
  get diagnostics via = row_count;
  return via;
end $$;

create or replace function public.script_log(p_token text, p_ok boolean, p_dettagli jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public._script_ok(p_token) then raise exception 'token non valido'; end if;
  insert into public.sync_log (job, ok, dettagli) values ('conoscenza', p_ok, coalesce(p_dettagli, '{}'::jsonb) || '{"da":"script Mac"}');
end $$;

grant execute on function public.script_stato(text), public.script_carica(text, jsonb), public.script_pulisci(text, text, text[]), public.script_log(text, boolean, jsonb) to anon, authenticated;

-- 5. Nome azienda: sempre "Lemons in the room" (r minuscola)
update public.posts set testo = regexp_replace(testo, 'Lemons [Ii]n [Tt]he Room', 'Lemons in the room', 'g') where testo ~ 'Lemons [Ii]n [Tt]he Room';
update public.posts set testo_generato = regexp_replace(testo_generato, 'Lemons [Ii]n [Tt]he Room', 'Lemons in the room', 'g') where testo_generato ~ 'Lemons [Ii]n [Tt]he Room';
update public.team_members set ruolo = regexp_replace(ruolo, 'Lemons [Ii]n [Tt]he Room', 'Lemons in the room', 'g') where ruolo ~ 'Lemons [Ii]n [Tt]he Room';
