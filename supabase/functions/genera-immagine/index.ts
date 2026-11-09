// genera-immagine: genera un'immagine con Cloudflare Workers AI (FLUX). Solo utenti del team.
// body: { prompt, modello?: 'schnell'|'klein'|'dev', riferimento?: url immagine (es. il limone), larghezza?, altezza?, seed? }
// risposta: { ok, immagine: base64 (jpeg/png), modello }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const MODELLI: Record<string, string> = {
  schnell: '@cf/black-forest-labs/flux-1-schnell',
  klein: '@cf/black-forest-labs/flux-2-klein-4b',
  dev: '@cf/black-forest-labs/flux-2-dev',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: 'Non autenticato' }, 401);
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: m } = await db.from('team_members').select('id').eq('email', u.user.email).maybeSingle();
    if (!m) return json({ error: 'Solo per il team' }, 403);

    const TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN'), ACC = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    if (!TOKEN || !ACC) return json({ error: 'Chiavi Cloudflare mancanti nei secrets' }, 500);
    const body = await req.json();
    const prompt = String(body.prompt || '').slice(0, 2000);
    if (!prompt) return json({ error: 'prompt mancante' }, 400);
    const chiave = String(body.modello || (body.riferimento || body.riferimenti ? 'klein' : 'schnell'));
    const modello = MODELLI[chiave];
    if (!modello) return json({ error: 'modello non valido' }, 400);
    const url = `https://api.cloudflare.com/client/v4/accounts/${ACC}/ai/run/${modello}`;
    const W = Math.min(Number(body.larghezza) || 1024, 1440), H = Math.min(Number(body.altezza) || 1280, 1440);

    let r: Response;
    if (chiave === 'schnell') {
      r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, steps: 8 }) });
    } else {
      const fd = new FormData();
      fd.append('prompt', prompt);
      fd.append('width', String(W)); fd.append('height', String(H));
      if (body.seed) fd.append('seed', String(body.seed));
      // fino a 4 immagini di riferimento: url https oppure data:image/...;base64
      const rif = (Array.isArray(body.riferimenti) ? body.riferimenti : body.riferimento ? [body.riferimento] : []).slice(0, 4);
      for (let i = 0; i < rif.length; i++) {
        const r0 = String(rif[i]);
        let blob: Blob;
        if (r0.startsWith('data:image/')) {
          const b64 = r0.split(',')[1] || '';
          if (b64.length > 8_000_000) return json({ error: 'immagine di riferimento troppo grande' }, 400);
          blob = new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: r0.slice(5, r0.indexOf(';')) });
        } else if (/^https:\/\//.test(r0)) {
          const ref = await fetch(r0);
          if (!ref.ok) return json({ error: 'immagine di riferimento non scaricabile' }, 400);
          blob = await ref.blob();
        } else return json({ error: 'riferimento non valido' }, 400);
        fd.append('input_image_' + i, blob, 'riferimento' + i + '.png');
      }
      r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: fd });
    }
    const t = await r.text();
    let j: any; try { j = JSON.parse(t); } catch { j = null; }
    if (!r.ok || !j?.result?.image) return json({ error: 'Cloudflare: ' + (j?.errors?.map((e: any) => e.message).join('; ') || t.slice(0, 300)), stato: r.status }, 502);
    await db.from('sync_log').insert({ job: 'genera-immagine', ok: true, dettagli: { autore: m.id, modello: chiave } });
    return json({ ok: true, immagine: j.result.image, modello: chiave });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
