-- Il Pannello (contiene email del team, rete clinica e motore inviti) NON è pubblico:
-- sta in uno spazio privato e si scarica solo dopo il login.
insert into storage.buckets (id, name, public, file_size_limit)
values ('pannello', 'pannello', false, 52428800)
on conflict (id) do update set public = false;

create policy pannello_lettura on storage.objects for select to authenticated
  using (bucket_id = 'pannello' and public.is_team());
-- scrittura solo tramite URL firmato generato dalla funzione pannello-upload-url (codice di pubblicazione)
