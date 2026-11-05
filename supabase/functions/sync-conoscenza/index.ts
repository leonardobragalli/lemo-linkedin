// Pulsante «Aggiorna Insights ora»: rilegge solo Lemons Insights.
// Notion (e Insights ogni giorno) li aggiorna lo script sul Mac: script-mac/aggiorna_conoscenza.py.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { leggiInsights } from '../_shared/fonti.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sha(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let body: any = {};
  try { body = await req.json(); } catch { /* vuoto */ }

  // anti-abuso: al massimo un giro ogni 3 minuti
  const { data: ultimo } = await db.from('sync_log').select('created_at').eq('job', 'conoscenza').order('created_at', { ascending: false }).limit(1);
  if (!body.forza && ultimo?.[0] && Date.now() - new Date(ultimo[0].created_at).getTime() < 3 * 60e3) return json({ ok: true, saltato: 'eseguito meno di 3 minuti fa' });

  const report: Record<string, unknown> = {};
  const errori: string[] = [];

  async function salva(rows: any[]) {
    let scritti = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const lotto = await Promise.all(rows.slice(i, i + 200).map(async r => ({ ...r, hash: await sha(r.titolo + '\n' + r.testo + '\n' + (r.area || '')), letto_il: new Date().toISOString() })));
      const { error } = await db.from('knowledge_chunks').upsert(lotto, { onConflict: 'fonte,source_id' });
      if (error) errori.push(error.message); else scritti += lotto.length;
    }
    return scritti;
  }

  // 1. Lemons Insights
  try {
    const ins = await leggiInsights();
    errori.push(...ins.errori);
    report.insights = await salva(ins.chunks);
    if (ins.chunks.length > 50) {
      const ids = new Set(ins.chunks.map(c => c.source_id));
      const { data: vecchi } = await db.from('knowledge_chunks').select('id,source_id').eq('fonte', 'insights_studio');
      const via = (vecchi || []).filter(v => !ids.has(v.source_id)).map(v => v.id);
      if (via.length) await db.from('knowledge_chunks').delete().in('id', via);
      report.insights_rimossi = via.length;
    }
  } catch (e) { errori.push('Insights: ' + e); }

  // Notion: lo aggiorna lo script giornaliero sul Mac (script-mac/aggiorna_conoscenza.py), non il server.

  const ok = errori.length === 0;
  await db.from('sync_log').insert({ job: 'conoscenza', ok, dettagli: { ...report, errori } });
  return json({ ok, ...report, errori });
});
