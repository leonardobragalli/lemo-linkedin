// Riceve le statistiche lette dallo userscript nel browser di ognuno.
// Autenticazione: codice personale (x-lemo-token), mai la sessione LinkedIn né password.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ORIGINI = ['https://www.linkedin.com', 'https://linkedin.com'];
function cors(req: Request) {
  const o = req.headers.get('origin') || '';
  return {
    'Access-Control-Allow-Origin': ORIGINI.includes(o) ? o : ORIGINI[0],
    'Access-Control-Allow-Headers': 'content-type, x-lemo-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const NUMERI = ['impressions', 'members_reached', 'reactions', 'comments', 'reposts', 'saves', 'clicks', 'followers_gained'] as const;
const ORE_MIN = 11;   // al massimo una rilevazione per post ogni 11 ore
const GIORNI_MAX = 120;

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function togliGrassetto(s: string) {
  return [...(s || '')].map(ch => {
    const c = ch.codePointAt(0)!;
    if (c >= 0x1d5d4 && c < 0x1d5ee) return String.fromCharCode(65 + c - 0x1d5d4);
    if (c >= 0x1d5ee && c < 0x1d608) return String.fromCharCode(97 + c - 0x1d5ee);
    if (c >= 0x1d7ec && c < 0x1d7f6) return String.fromCharCode(48 + c - 0x1d7ec);
    if (c >= 0x1d608 && c < 0x1d622) return String.fromCharCode(65 + c - 0x1d608);
    if (c >= 0x1d622 && c < 0x1d63c) return String.fromCharCode(97 + c - 0x1d622);
    return ch;
  }).join('');
}
const norm = (s: string) => togliGrassetto(s).replace(/\u2800/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().toLowerCase().slice(0, 70);
const dataDaUrn = (urn: string) => { const m = urn.match(/(\d{15,})$/); return m ? new Date(Number(BigInt(m[1]) >> 22n)).toISOString() : null; };
const intOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

Deno.serve(async req => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  if (req.method !== 'POST') return json({ error: 'metodo non ammesso' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const tok = req.headers.get('x-lemo-token') || '';
  if (!/^lemo_[0-9a-f]{48}$/.test(tok)) return json({ error: 'codice mancante o non valido' }, 401);
  const { data: t } = await db.from('member_tokens').select('id,member_id,revoked_at').eq('token_hash', await sha(tok)).maybeSingle();
  if (!t || t.revoked_at) return json({ error: 'codice non riconosciuto o revocato' }, 401);
  await db.from('member_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', t.id);
  const me = t.member_id as string;

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'JSON non valido' }, 400); }

  // ── 1. Piano: quali post rileggere ──────────────────────────
  if (body.azione === 'piano') {
    const urns: string[] = (body.urns || []).filter((u: string) => /^urn:li:(activity|share|ugcPost):\d{15,}$/.test(u)).slice(0, 60);
    const limite = Date.now() - GIORNI_MAX * 864e5;
    const recenti = urns.filter(u => { const d = dataDaUrn(u); return d && new Date(d).getTime() > limite; });
    const { data: noti } = await db.from('posts').select('id,linkedin_urn').in('linkedin_urn', recenti.length ? recenti : ['-']);
    const ids = (noti || []).map(p => p.id);
    const { data: ult } = ids.length ? await db.from('post_metrics').select('post_id,captured_at').in('post_id', ids).gte('captured_at', new Date(Date.now() - ORE_MIN * 36e5).toISOString()) : { data: [] };
    const freschi = new Set((ult || []).map(m => (noti || []).find(p => p.id === m.post_id)?.linkedin_urn));
    return json({ da_leggere: recenti.filter(u => !freschi.has(u)).slice(0, 15), membro: me });
  }

  // ── 2. Dati ─────────────────────────────────────────────────
  if (body.azione !== 'dati') return json({ error: 'azione sconosciuta' }, 400);
  const posts: any[] = Array.isArray(body.posts) ? body.posts.slice(0, 40) : [];
  const log = { member_id: me, fonte: 'estensione', parser_version: String(body.parser_version || '').slice(0, 20), post_visti: posts.length, post_abbinati: 0, post_nuovi: 0, metriche_scritte: 0, followers: intOrNull(body.followers), errori: (body.errori || []).slice(0, 20), user_agent: (req.headers.get('user-agent') || '').slice(0, 200) };

  const { data: miei } = await db.from('posts').select('id,linkedin_urn,testo,stato,origine').eq('member_id', me);
  for (const p of posts) {
    const urn = String(p.urn || '');
    if (!/^urn:li:(activity|share|ugcPost):\d{15,}$/.test(urn)) { log.errori.push('urn non valido'); continue; }
    let post = (miei || []).find(x => x.linkedin_urn === urn);
    const quando = dataDaUrn(urn);
    if (!post && p.testo) {
      // abbina un post della piattaforma non ancora segnato come pubblicato (stesso inizio di testo)
      const n = norm(p.testo);
      const cand = (miei || []).find(x => !x.linkedin_urn && x.stato !== 'scartato' && n.length > 20 && norm(x.testo).slice(0, 50) === n.slice(0, 50));
      if (cand) {
        const { error } = await db.from('posts').update({ stato: 'pubblicato', linkedin_urn: urn, linkedin_url: `https://www.linkedin.com/feed/update/${urn}/`, published_at: quando, updated_by: me }).eq('id', cand.id);
        if (!error) { post = { ...cand, linkedin_urn: urn }; log.post_abbinati++; }
      } else {
        // post pubblicato fuori dalla piattaforma: lo registro come storico, conta per l'analisi
        const { data: nuovo, error } = await db.from('posts').insert({ member_id: me, origine: 'storico', stato: 'pubblicato', testo: String(p.testo).slice(0, 5000), titolo: togliGrassetto(String(p.testo)).split('\n')[0].slice(0, 120), formato: p.formato || 'altro', linkedin_urn: urn, linkedin_url: `https://www.linkedin.com/feed/update/${urn}/`, published_at: quando, scheduled_at: quando, updated_by: me }).select('id,linkedin_urn,testo,stato,origine').single();
        if (error) { log.errori.push('nuovo post: ' + error.message); continue; }
        post = nuovo; (miei || []).push(nuovo); log.post_nuovi++;
      }
    }
    if (!post) continue;
    const m = p.metriche || {};
    const riga: Record<string, unknown> = { post_id: post.id, fonte: 'estensione', entered_by: me };
    let qualcosa = false;
    for (const k of NUMERI) { const v = intOrNull(m[k]); if (v != null) { riga[k] = v; qualcosa = true; } }
    if (!qualcosa) continue;
    const { data: recente } = await db.from('post_metrics').select('id').eq('post_id', post.id).gte('captured_at', new Date(Date.now() - ORE_MIN * 36e5).toISOString()).limit(1);
    if (recente?.length) continue;
    const { error } = await db.from('post_metrics').insert(riga);
    if (error) log.errori.push('metriche: ' + error.message); else log.metriche_scritte++;
  }
  if (log.followers != null) {
    const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
    await db.from('member_metrics').upsert({ member_id: me, captured_on: oggi, followers: log.followers, fonte: 'estensione', entered_by: me }, { onConflict: 'member_id,captured_on' });
  }
  await db.from('ingest_log').insert(log);
  return json({ ok: true, ...log, errori: log.errori.length });
});
