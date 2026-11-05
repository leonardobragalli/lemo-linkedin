-- Fase 1 · correzioni di Matteo (5 nov 2026), riviste.
-- 1. cerca_conoscenza: non scarta più le sigle cliniche corte (VR, HTA, RCT, VAS...)
-- 2. Pannello → tabella posts: testi modificati, pubblicati e scartati nel Pannello
--    arrivano anche in `posts`, così generatore e playbook li vedono.
--    Fatto nel database (trigger) e non dal browser: funziona anche quando un collega
--    segna il post di un altro (le regole di accesso al browser lo impedirebbero).

-- 1 ─────────────────────────────────────────────────────────────────────────
create or replace function public.cerca_conoscenza(q text, n int default 8)
returns setof public.knowledge_chunks language sql stable security definer set search_path = public as $$
  with t as (
    select string_agg(w, ' | ') as expr from (
      select distinct lower(w) w
      from regexp_split_to_table(regexp_replace(coalesce(q,''), '[^[:alnum:]À-ÿ ]', ' ', 'g'), '\s+') w
      where length(w) >= 3
         or lower(w) in ('vr','xr','ar','rm','ct','ps','fc','pa','iv','ce','ai')
    ) x
  )
  select k.* from public.knowledge_chunks k, t
  where t.expr is not null and k.tsv @@ to_tsquery('simple', t.expr)
  order by ts_rank(k.tsv, to_tsquery('simple', t.expr)) desc
  limit n
$$;

-- 2 ─────────────────────────────────────────────────────────────────────────
-- Chiavi del Pannello: per Matteo senza nome (testo-post-08), per gli altri con il nome (testo-post-leonardo-08).
-- "Non mi piace" scarta lo slot per tutti: scartato-globale-07.
create or replace function public.pannello_applica_chiave(p_chiave text, p_valore text, p_cancellata boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  m text[]; v_prof text; v_slot text; acceso boolean;
begin
  -- testo modificato
  m := regexp_match(p_chiave, '^testo-post-(?:([a-z_]+)-)?(\d{2})$');
  if m is not null then
    v_prof := coalesce(m[1], 'matteo'); v_slot := m[2];
    if p_cancellata or coalesce(p_valore, '') = '' then
      update posts set testo = testo_originale, updated_by = 'pannello', updated_at = now()
        where member_id = v_prof and posts.slot = v_slot and origine = 'piano' and testo_originale is not null and testo is distinct from testo_originale;
    else
      update posts set testo = p_valore, updated_by = 'pannello', updated_at = now()
        where member_id = v_prof and posts.slot = v_slot and origine = 'piano' and testo is distinct from p_valore;
    end if;
    return;
  end if;

  -- pubblicato / "Già pubblicato"
  m := regexp_match(p_chiave, '^(?:pubblicato|archiviato-subito)-(?:([a-z_]+)-)?(\d{2})$');
  if m is not null then
    v_prof := coalesce(m[1], 'matteo'); v_slot := m[2];
    -- acceso se almeno una delle due chiavi vale '1'
    select exists (
      select 1 from pannello_stato s
      where s.valore = '1' and s.chiave in (
        case when v_prof = 'matteo' then 'pubblicato-' || v_slot else 'pubblicato-' || v_prof || '-' || v_slot end,
        case when v_prof = 'matteo' then 'archiviato-subito-' || v_slot else 'archiviato-subito-' || v_prof || '-' || v_slot end)
    ) into acceso;
    if not p_cancellata and p_valore = '1' then acceso := true; end if;
    if acceso then
      update posts set stato = 'pubblicato', updated_by = 'pannello', updated_at = now()
        where member_id = v_prof and posts.slot = v_slot and origine = 'piano' and stato <> 'pubblicato';
    else
      -- torna da rivedere solo se non è stato visto pubblicato davvero su LinkedIn
      update posts set stato = 'da_rivedere', updated_by = 'pannello', updated_at = now()
        where member_id = v_prof and posts.slot = v_slot and origine = 'piano' and stato = 'pubblicato' and linkedin_urn is null;
    end if;
    return;
  end if;

  -- "Non mi piace": v_slot scartato per tutti i profili
  m := regexp_match(p_chiave, '^scartato-globale-(\d{2})$');
  if m is not null then
    v_slot := m[1];
    if not p_cancellata and p_valore = '1' then
      update posts set stato = 'scartato', updated_by = 'pannello', updated_at = now()
        where posts.slot = v_slot and origine = 'piano' and stato in ('da_rivedere', 'approvato');
    else
      update posts set stato = 'da_rivedere', updated_by = 'pannello', updated_at = now()
        where posts.slot = v_slot and origine = 'piano' and stato = 'scartato';
    end if;
  end if;
end $$;
revoke all on function public.pannello_applica_chiave(text, text, boolean) from public, anon, authenticated;

create or replace function public.pannello_stato_a_posts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform pannello_applica_chiave(old.chiave, old.valore, true);
    return old;
  end if;
  perform pannello_applica_chiave(new.chiave, new.valore, false);
  return new;
end $$;

drop trigger if exists pannello_stato_a_posts on public.pannello_stato;
create trigger pannello_stato_a_posts
  after insert or update or delete on public.pannello_stato
  for each row execute function public.pannello_stato_a_posts();

-- allineamento iniziale con lo stato attuale del Pannello
select public.pannello_applica_chiave(chiave, valore, false)
from public.pannello_stato
where chiave ~ '^(testo-post-|pubblicato-|archiviato-subito-|scartato-globale-)';

-- 3 ─────────────────────────────────────────────────────────────────────────
-- Ruoli come sui profili LinkedIn (5 nov 2026)
update public.team_members set ruolo = 'Marketing Manager @ Lemons in the room' where id = 'sofia';
update public.team_members set ruolo = 'Dottore in Economia · Growth & International Expansion @ Lemons in the room' where id = 'alessandro_romagnosi';
