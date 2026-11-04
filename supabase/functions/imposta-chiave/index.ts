// Salva o aggiorna la chiave Notion nel Vault. Solo admin del team.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const AMMESSE: Record<string, RegExp> = {
  NOTION_TOKEN: /^(ntn_|secret_)[A-Za-z0-9]{20,}$/,
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const auth = req.headers.get('authorization') || '';
  const utente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: admin } = await utente.rpc('is_admin');
  if (!admin) return json({ error: 'Solo un admin può modificare le chiavi' }, 403);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: 'JSON non valido' }, 400); }
  const nome = String(body.nome || ''); const valore = String(body.valore || '').trim();
  if (!AMMESSE[nome]) return json({ error: 'Chiave non prevista' }, 400);
  if (!AMMESSE[nome].test(valore)) return json({ error: 'Il valore non ha il formato atteso per questa chiave' }, 400);

  // prova la chiave prima di salvarla
  if (nome === 'NOTION_TOKEN') {
    const r = await fetch('https://api.notion.com/v1/users/me', { headers: { Authorization: 'Bearer ' + valore, 'Notion-Version': '2022-06-28' } });
    if (!r.ok) return json({ error: `Notion rifiuta la chiave (${r.status})` }, 400);
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await db.rpc('salva_segreto', { nome, valore });
  if (error) return json({ error: error.message }, 500);
  await db.from('sync_log').insert({ job: 'chiavi', ok: true, dettagli: { aggiornata: nome } });
  return json({ ok: true });
});
