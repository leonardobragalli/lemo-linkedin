// Restituisce un URL firmato per caricare la nuova versione del Pannello nello spazio privato.
// Autenticazione: codice di pubblicazione (x-lemo-token) confrontato con script_tokens (nome 'pubblica-pannello').
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'solo POST' }, 405);
  const tok = req.headers.get('x-lemo-token') || '';
  if (tok.length < 20) return json({ error: 'codice mancante' }, 401);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: t } = await db.from('script_tokens').select('id,nome,revoked_at').eq('token_hash', await sha(tok)).maybeSingle();
  if (!t || t.revoked_at || t.nome !== 'pubblica-pannello') return json({ error: 'codice non valido' }, 401);
  await db.from('script_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', t.id);
  const { data, error } = await db.storage.from('pannello').createSignedUploadUrl('pannello.html.gz', { upsert: true });
  if (error) return json({ error: error.message }, 500);
  await db.from('sync_log').insert({ job: 'pubblica-pannello', ok: true, dettagli: {} });
  return json({ ok: true, path: data.path, token: data.token, signedUrl: data.signedUrl });
});
