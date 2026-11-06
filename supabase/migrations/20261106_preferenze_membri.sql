-- Preferenze personali di ogni membro del team (es. quali stili grafici vedere nelle bozze AI).
-- Esempio di valore: {"stili": {"vecchio": false, "friendly": true, "scientifico": true}}
-- Ognuno può modificare solo la propria riga (regola già esistente tm_update).
alter table public.team_members add column if not exists preferenze jsonb not null default '{}'::jsonb;
