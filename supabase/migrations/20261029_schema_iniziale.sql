-- lemo-linkedin · schema iniziale (Fase 1)
-- Accesso: solo membri del team elencati in team_members (email @lemonsintheroom.com).

create extension if not exists pgcrypto;

-- ── Membri del team ──────────────────────────────────────────────
create table public.team_members (
  id            text primary key,              -- slug: matteo, leonardo, ...
  email         text unique,                   -- null = DA CHIEDERE (non può ancora entrare)
  nome          text not null,
  nome_breve    text,
  iniziali      text,
  ruolo         text,
  reparto       text,
  angolo        text,
  colore        text,
  colore_scuro  text,
  linkedin_url  text,
  headline_it   text,
  headline_en   text,
  about_it      text,
  exp_it        text,
  commento_coro text,
  commenti_tipizzati jsonb default '[]'::jsonb,
  onda          jsonb,                          -- giorni/orari abituali
  ordine        int default 0,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ── Post ─────────────────────────────────────────────────────────
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  member_id     text not null references public.team_members(id) on delete cascade,
  slot          text,                           -- 01..18 (piano editoriale), null per storici/nuovi
  origine       text not null default 'piano' check (origine in ('piano','storico','nuovo')),
  titolo        text,
  tema          text,
  testo         text not null default '',
  testo_originale text,
  commento      text,                           -- primo commento / fonti estese
  fonti         text,
  hook_formula  text,
  ganci_opzioni jsonb default '[]'::jsonb,
  vis           jsonb,                          -- dati per il generatore grafico
  immagine      text,                           -- asset di riferimento (Matteo)
  formato       text default 'immagini' check (formato in ('immagini','carosello','testo','link','altro')),
  is_riserva    boolean not null default false,
  stato         text not null default 'da_rivedere'
                check (stato in ('da_rivedere','approvato','pubblicato','scartato')),
  scheduled_at  timestamptz,
  published_at  timestamptz,
  linkedin_url  text,
  linkedin_urn  text,
  note          text,
  updated_at    timestamptz not null default now(),
  updated_by    text,
  created_at    timestamptz not null default now()
);
create index posts_member_idx on public.posts(member_id);
create index posts_sched_idx  on public.posts(scheduled_at);
create unique index posts_urn_uq on public.posts(linkedin_urn) where linkedin_urn is not null;

-- ── Metriche dei post (snapshot, inserite a mano / CSV / API) ────
create table public.post_metrics (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts(id) on delete cascade,
  captured_at   timestamptz not null default now(),
  impressions   int check (impressions >= 0),
  members_reached int check (members_reached >= 0),
  reactions     int check (reactions >= 0),
  comments      int check (comments >= 0),
  reposts       int check (reposts >= 0),
  saves         int check (saves >= 0),
  clicks        int check (clicks >= 0),
  followers_gained int,
  fonte         text not null default 'manuale' check (fonte in ('manuale','csv','api','import_kit')),
  entered_by    text,
  created_at    timestamptz not null default now()
);
create index post_metrics_post_idx on public.post_metrics(post_id, captured_at desc);

-- ── Metriche dei profili (follower ecc.) ────────────────────────
create table public.member_metrics (
  id            uuid primary key default gen_random_uuid(),
  member_id     text not null references public.team_members(id) on delete cascade,
  captured_on   date not null default current_date,
  followers     int,
  connections   text,
  profile_views_7d int,
  search_appearances_7d int,
  fonte         text not null default 'manuale',
  entered_by    text,
  created_at    timestamptz not null default now(),
  unique (member_id, captured_on)
);

-- ── Helper di sicurezza ─────────────────────────────────────────
create or replace function public.current_member_id()
returns text language sql stable security definer set search_path = public as $$
  select id from public.team_members where lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;

create or replace function public.is_team()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.team_members where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.team_members where lower(email) = lower(auth.jwt() ->> 'email')), false)
$$;

-- Blocca la creazione di account per email non presenti nel team
create or replace function public.guard_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.team_members where lower(email) = lower(new.email)) then
    raise exception 'Email non autorizzata: chiedi a un admin di aggiungerti al team';
  end if;
  return new;
end $$;
create trigger guard_new_user before insert on auth.users
  for each row execute function public.guard_new_user();

-- updated_at / updated_by automatici
create or replace function public.touch_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(public.current_member_id(), new.updated_by);
  return new;
end $$;
create trigger touch_post before insert or update on public.posts
  for each row execute function public.touch_post();

-- Un non-admin non può promuoversi admin né cambiare email/id
create or replace function public.guard_member_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() in ('authenticated','anon') and not public.is_admin() then
    if new.is_admin is distinct from old.is_admin or new.email is distinct from old.email or new.id is distinct from old.id then
      raise exception 'Solo un admin può cambiare email o ruolo admin';
    end if;
  end if;
  if old.is_admin and not new.is_admin and (select count(*) from public.team_members where is_admin) <= 1 then
    raise exception 'Deve restare almeno un admin';
  end if;
  return new;
end $$;
create trigger guard_member_update before update on public.team_members
  for each row execute function public.guard_member_update();

-- ── RLS ─────────────────────────────────────────────────────────
alter table public.team_members  enable row level security;
alter table public.posts         enable row level security;
alter table public.post_metrics  enable row level security;
alter table public.member_metrics enable row level security;

-- lettura: tutto il team vede tutto
create policy tm_read on public.team_members for select to authenticated using (public.is_team());
create policy po_read on public.posts        for select to authenticated using (public.is_team());
create policy pm_read on public.post_metrics for select to authenticated using (public.is_team());
create policy mm_read on public.member_metrics for select to authenticated using (public.is_team());

-- membri: ognuno modifica il proprio profilo, admin tutti
create policy tm_update on public.team_members for update to authenticated
  using (id = public.current_member_id() or public.is_admin())
  with check (id = public.current_member_id() or public.is_admin());
create policy tm_insert on public.team_members for insert to authenticated with check (public.is_admin());
create policy tm_delete on public.team_members for delete to authenticated using (public.is_admin());

-- post: ognuno i propri, admin tutti
create policy po_insert on public.posts for insert to authenticated
  with check (member_id = public.current_member_id() or public.is_admin());
create policy po_update on public.posts for update to authenticated
  using (member_id = public.current_member_id() or public.is_admin())
  with check (member_id = public.current_member_id() or public.is_admin());
create policy po_delete on public.posts for delete to authenticated
  using (member_id = public.current_member_id() or public.is_admin());

-- metriche post: autore del post o admin
create policy pm_write on public.post_metrics for insert to authenticated
  with check (public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.member_id = public.current_member_id()));
create policy pm_update on public.post_metrics for update to authenticated
  using (public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.member_id = public.current_member_id()));
create policy pm_delete on public.post_metrics for delete to authenticated
  using (public.is_admin() or exists (select 1 from public.posts p where p.id = post_id and p.member_id = public.current_member_id()));

-- metriche profilo: il diretto interessato o admin
create policy mm_write on public.member_metrics for insert to authenticated
  with check (member_id = public.current_member_id() or public.is_admin());
create policy mm_update on public.member_metrics for update to authenticated
  using (member_id = public.current_member_id() or public.is_admin());
create policy mm_delete on public.member_metrics for delete to authenticated
  using (member_id = public.current_member_id() or public.is_admin());

-- ── Realtime ────────────────────────────────────────────────────
alter publication supabase_realtime add table public.posts, public.post_metrics, public.member_metrics, public.team_members;
