// Invita un collega: salva la sua email sul profilo e gli manda il link d'accesso. Solo admin.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const SITO = 'https://leonardobragalli.github.io/lemo-linkedin/';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const auth = req.headers.get('authorization') || '';
  const URL_ = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const utente = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
  const { data: admin } = await utente.rpc('is_admin');
  if (!admin) return json({ error: 'Solo un admin può invitare' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: 'JSON non valido' }, 400); }
  const memberId = String(body.member_id || '');
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@lemonsintheroom\.com$/.test(email)) return json({ error: "Serve un'email @lemonsintheroom.com" }, 400);

  const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: altro } = await db.from('team_members').select('id').ilike('email', email).neq('id', memberId).maybeSingle();
  if (altro) return json({ error: `Email già usata dal profilo «${altro.id}»` }, 400);
  const { data: m, error: e1 } = await db.from('team_members').update({ email }).eq('id', memberId).select('id,nome,email').single();
  if (e1 || !m) return json({ error: e1?.message || 'Profilo non trovato' }, 400);

  // utente nuovo → mail di invito; già registrato → link d'accesso normale
  const { error: e2 } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: SITO });
  let tipo = 'invito';
  if (e2) {
    if (!/already|registered|exists/i.test(e2.message)) return json({ error: 'Invio non riuscito: ' + e2.message }, 500);
    const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
    const { error: e3 } = await anon.auth.signInWithOtp({ email, options: { emailRedirectTo: SITO, shouldCreateUser: false } });
    if (e3) return json({ error: 'Invio non riuscito: ' + e3.message }, 500);
    tipo = 'link';
  }
  await db.from('team_members').update({ invitato_il: new Date().toISOString() }).eq('id', memberId);
  await db.from('sync_log').insert({ job: 'invito', ok: true, dettagli: { membro: memberId, tipo } });
  return json({ ok: true, tipo, membro: m });
});
