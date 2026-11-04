-- lemo-linkedin · Fase 2: dati dallo userscript, base di conoscenza, apprendimento
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── Fonti ammesse per le metriche ──────────────────────────────
alter table public.post_metrics drop constraint if exists post_metrics_fonte_check;
alter table public.post_metrics add constraint post_metrics_fonte_check
  check (fonte in ('manuale','csv','api','import_kit','estensione'));

-- ── Post: tracciamento della generazione AI ─────────────────────
alter table public.posts add column if not exists testo_generato text;   -- bozza AI originale (per imparare dalle correzioni)
alter table public.posts add column if not exists generazione jsonb;     -- claim, fonti usate, versione playbook, esplorazione

-- ── Codici di collegamento dello userscript ─────────────────────
create table if not exists public.member_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id text not null references public.team_members(id) on delete cascade,
  token_hash text not null unique,
  etichetta text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
alter table public.member_tokens enable row level security;
create policy mt_read on public.member_tokens for select to authenticated
  using (member_id = public.current_member_id() or public.is_admin());
create policy mt_revoke on public.member_tokens for update to authenticated
  using (member_id = public.current_member_id() or public.is_admin());

-- Genera un codice nuovo per chi è loggato; restituito una sola volta in chiaro
create or replace function public.crea_codice_collegamento(etichetta text default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare me text := public.current_member_id(); tok text;
begin
  if me is null then raise exception 'Non sei nel team'; end if;
  tok := 'lemo_' || encode(gen_random_bytes(24), 'hex');
  insert into member_tokens(member_id, token_hash, etichetta)
  values (me, encode(digest(tok, 'sha256'), 'hex'), etichetta);
  return tok;
end $$;
revoke all on function public.crea_codice_collegamento(text) from public, anon;
grant execute on function public.crea_codice_collegamento(text) to authenticated;

-- ── Log di ingestione e sincronizzazione ────────────────────────
create table if not exists public.ingest_log (
  id uuid primary key default gen_random_uuid(),
  member_id text references public.team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  fonte text not null default 'estensione',
  parser_version text,
  post_visti int default 0,
  post_abbinati int default 0,
  post_nuovi int default 0,
  metriche_scritte int default 0,
  followers int,
  errori jsonb default '[]'::jsonb,
  user_agent text
);
alter table public.ingest_log enable row level security;
create policy il_read on public.ingest_log for select to authenticated using (public.is_team());

create table if not exists public.sync_log (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  created_at timestamptz not null default now(),
  ok boolean not null,
  dettagli jsonb
);
alter table public.sync_log enable row level security;
create policy sl_read on public.sync_log for select to authenticated using (public.is_team());

-- ── Base di conoscenza (ricerca full-text, niente chiavi esterne) ─
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  fonte text not null,              -- insights_studio, insights_pagina, notion
  source_id text not null,
  url text,
  titolo text,
  testo text,
  area text,
  meta jsonb default '{}'::jsonb,
  hash text,
  letto_il timestamptz not null default now(),
  tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(titolo,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(area,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(testo,'')), 'C')) stored,
  unique (fonte, source_id)
);
create index if not exists kc_tsv_idx on public.knowledge_chunks using gin(tsv);
alter table public.knowledge_chunks enable row level security;
create policy kc_read on public.knowledge_chunks for select to authenticated using (public.is_team());

-- Ricerca: parole del tema in OR, ordinate per pertinenza
create or replace function public.cerca_conoscenza(q text, n int default 8)
returns setof public.knowledge_chunks language sql stable security definer set search_path = public as $$
  with t as (
    select string_agg(w, ' | ') as expr from (
      select distinct lower(w) w from regexp_split_to_table(regexp_replace(coalesce(q,''), '[^[:alnum:]À-ÿ ]', ' ', 'g'), '\s+') w
      where length(w) >= 4) x)
  select k.* from public.knowledge_chunks k, t
  where t.expr is not null and k.tsv @@ to_tsquery('simple', t.expr)
  order by ts_rank(k.tsv, to_tsquery('simple', t.expr)) desc
  limit n
$$;

-- Numeri aziendali ricorrenti: calcolati o inseriti, pubblicabili solo se confermati
create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  chiave text not null unique,
  etichetta text not null,
  valore text,
  fonte text,
  calcolato_il timestamptz default now(),
  confermato_da text,
  confermato_il timestamptz,
  note text
);
alter table public.facts enable row level security;
create policy fa_read on public.facts for select to authenticated using (public.is_team());
create policy fa_write on public.facts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Apprendimento: caratteristiche dei post ─────────────────────
create or replace function public.togli_grassetto(s text)
returns text language plpgsql immutable as $$
declare out text := ''; c int; ch text;
begin
  if s is null then return null; end if;
  foreach ch in array regexp_split_to_array(s, '') loop
    c := ascii(ch);
    if c between 120276 and 120301 then out := out || chr(65 + c - 120276);       -- 𝗔-𝗭
    elsif c between 120302 and 120327 then out := out || chr(97 + c - 120302);    -- 𝗮-𝘇
    elsif c between 120812 and 120821 then out := out || chr(48 + c - 120812);    -- 𝟬-𝟵
    elsif c between 120328 and 120353 then out := out || chr(65 + c - 120328);    -- corsivo sans
    elsif c between 120354 and 120379 then out := out || chr(97 + c - 120354);
    elsif c = 10240 then out := out;                                              -- U+2800
    else out := out || ch; end if;
  end loop;
  return out;
end $$;

create or replace view public.post_features
with (security_invoker = true) as
with base as (
  select p.*,
    public.togli_grassetto(p.testo) as t,
    split_part(btrim(public.togli_grassetto(p.testo), E' \n\r\t'), E'\n', 1) as r1,
    coalesce(p.published_at, p.scheduled_at) as quando
  from public.posts p
),
ult as (
  -- rilevazione più vicina ai 7 giorni (o l'ultima disponibile)
  select distinct on (m.post_id) m.*,
    coalesce(m.reactions,0)+coalesce(m.comments,0)+coalesce(m.reposts,0) as interazioni
  from public.post_metrics m join base b on b.id = m.post_id
  order by m.post_id,
    abs(extract(epoch from (m.captured_at - (b.quando + interval '7 days')))) asc
)
select b.id as post_id, b.member_id, b.origine, b.stato, b.formato, b.quando,
  extract(isodow from b.quando at time zone 'Europe/Rome')::int as dow,
  case when extract(hour from b.quando at time zone 'Europe/Rome') < 11 then 'mattina'
       when extract(hour from b.quando at time zone 'Europe/Rome') < 15 then 'pranzo'
       when extract(hour from b.quando at time zone 'Europe/Rome') < 19 then 'pomeriggio' else 'sera' end as fascia,
  case
    when b.r1 ~ '\?\s*$' then 'domanda'
    when b.r1 ~ '^[«"“]' then 'citazione'
    when b.r1 ~ '\d' then 'dato numerico'
    when b.r1 ~* '^(ieri|oggi|stamattina|la settimana|qualche|quando|un giorno|era|alle \d)' then 'storia'
    when b.r1 ~ '[:—–]' then 'contrasto/definizione'
    else 'affermazione' end as tipo_apertura,
  char_length(b.r1) as lung_prima_riga,
  char_length(b.t) as lung_testo,
  (split_part(b.t, E'\n', 1) || split_part(b.t, E'\n', 2) || split_part(b.t, E'\n', 3)) ~ '\d' as numero_in_apertura,
  (select count(*) from regexp_matches(b.t, E'(^|\n)\\s*[▸→•👉🍋-]', 'g'))::int as punti_elenco,
  b.t ~ '\?\s*(#.*)?$' or btrim(split_part(regexp_replace(b.t, E'\n#.*$', ''), E'\n\n', -1)) ~ '\?' as chiude_con_domanda,
  coalesce(b.vis->>'layout', null) as layout_grafico,
  (b.generazione->>'esplorazione')::boolean as esplorazione,
  u.interazioni, u.impressions, u.captured_at as rilevato_il
from base b left join ult u on u.post_id = b.id;

-- ── Playbook: regole apprese, versionate ────────────────────────
create table if not exists public.playbook (
  id uuid primary key default gen_random_uuid(),
  ambito text not null,           -- 'team' oppure id membro
  versione int not null,
  contenuto jsonb not null,
  created_at timestamptz not null default now(),
  unique (ambito, versione)
);
alter table public.playbook enable row level security;
create policy pb_read on public.playbook for select to authenticated using (public.is_team());

create or replace function public.ricalcola_playbook()
returns int language plpgsql security definer set search_path = public as $$
declare amb text; v int; c jsonb; nuove int := 0; min_gruppo int := 5;
begin
  -- indice per post = interazioni / mediana dell'autore (servono ≥3 post con dati)
  drop table if exists _ix;
  create temp table _ix as
  with f as (select * from post_features where stato = 'pubblicato' and interazioni is not null),
  med as (select member_id, percentile_cont(0.5) within group (order by interazioni) as mediana, count(*) n
          from f group by member_id having count(*) >= 3)
  select f.*, case when med.mediana > 0 then f.interazioni / med.mediana end as indice
  from f join med using (member_id);

  for amb in select 'team' union all select distinct member_id from _ix loop
    with s as (select * from _ix where (amb = 'team' or member_id = amb) and indice is not null),
    dim as (
      select 'tipo_apertura' d, tipo_apertura k, count(*) n, avg(indice) i from s group by 2
      union all select 'fascia', fascia, count(*), avg(indice) from s group by 2
      union all select 'giorno', dow::text, count(*), avg(indice) from s group by 2
      union all select 'formato', formato, count(*), avg(indice) from s group by 2
      union all select 'numero_in_apertura', numero_in_apertura::text, count(*), avg(indice) from s group by 2
      union all select 'chiude_con_domanda', chiude_con_domanda::text, count(*), avg(indice) from s group by 2
      union all select 'layout_grafico', layout_grafico, count(*), avg(indice) from s where layout_grafico is not null group by 2
    ),
    regole as (
      select d, jsonb_agg(jsonb_build_object('valore', k, 'post', n, 'indice', round(i::numeric, 2)) order by i desc) gruppi,
             bool_or(n >= min_gruppo) and count(*) filter (where n >= min_gruppo) >= 2 as affidabile
      from dim where k is not null group by d
    ),
    top as (select coalesce(jsonb_agg(post_id order by indice desc), '[]') ids from (select * from s order by indice desc limit 5) x),
    flop as (select coalesce(jsonb_agg(post_id order by indice asc), '[]') ids from (select * from s order by indice asc limit 3) x),
    correz as (
      select count(*) n,
        round(avg(char_length(p.testo)::numeric / nullif(char_length(p.testo_generato), 0)), 2) as rapporto_lunghezza
      from posts p where p.testo_generato is not null and p.stato in ('approvato','pubblicato')
        and (amb = 'team' or p.member_id = amb) and p.testo is distinct from p.testo_generato
    ),
    scartati as (
      select count(*) n from posts p
      where p.stato = 'scartato' and (amb = 'team' or p.member_id = amb)
    )
    select jsonb_build_object(
      'post_con_dati', (select count(*) from s),
      'soglia_gruppo', min_gruppo,
      'dimensioni', coalesce((select jsonb_object_agg(d, jsonb_build_object('affidabile', affidabile, 'gruppi', gruppi)) from regole), '{}'),
      'migliori', (select ids from top), 'peggiori', (select ids from flop),
      'correzioni_autore', (select to_jsonb(correz) from correz),
      'scartati', (select n from scartati)
    ) into c;
    select coalesce(max(versione), 0) + 1 into v from playbook where ambito = amb;
    -- nuova versione solo se cambia qualcosa
    if not exists (select 1 from playbook where ambito = amb and versione = v - 1 and contenuto = c) then
      insert into playbook(ambito, versione, contenuto) values (amb, v, c); nuove := nuove + 1;
    end if;
  end loop;
  insert into sync_log(job, ok, dettagli) values ('playbook', true, jsonb_build_object('nuove_versioni', nuove));
  return nuove;
end $$;
grant execute on function public.ricalcola_playbook() to authenticated;

-- ── Fatti calcolati dalla piattaforma (per ora: nessuna fonte interna diretta) ─
insert into public.facts(chiave, etichetta, valore, fonte, note) values
  ('sanificazione_secondi', 'Tempo di sanificazione tra due pazienti', '45 secondi', 'kit LinkedIn (non verificato)', 'DA VERIFICARE: SOP o test interni'),
  ('strutture_attive', 'Strutture sanitarie che usano LEMO', '59', 'kit LinkedIn (non verificato)', 'DA VERIFICARE: calcolare da Dashboard Headsets, San Martino escluso'),
  ('setup_settimane', 'Tempo di attivazione in un reparto', '2 settimane', 'kit LinkedIn (non verificato)', 'DA VERIFICARE')
on conflict (chiave) do nothing;

-- ── Tempo reale sulle nuove tabelle utili all'interfaccia ───────
alter publication supabase_realtime add table public.ingest_log, public.playbook, public.facts;

-- ── Pianificazioni ──────────────────────────────────────────────
select cron.schedule('playbook-settimanale', '0 5 * * 1', $$select public.ricalcola_playbook()$$);
