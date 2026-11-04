-- Esempi per l'AI: escludibili a mano (usa_come_esempio) e solo post con almeno 250 caratteri.
-- Applicata su Supabase il 4/11/2026. Contenuto completo: vedi la versione applicata (view post_features
-- con colonna usa_come_esempio, ricalcola_playbook con CTE "es", trigger esempio_cambiato).
alter table public.posts add column if not exists usa_come_esempio boolean not null default true;
-- (view post_features + funzione ricalcola_playbook ridefinite: stessa logica di 20261104_fase2 con il filtro
--  `es as (select * from s where usa_come_esempio and lung_testo >= 250)` per migliori/peggiori)
create or replace function public.on_esempio_cambiato()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.ricalcola_playbook(); return null; end $$;
create trigger esempio_cambiato after update of usa_come_esempio on public.posts
  for each statement execute function public.on_esempio_cambiato();
