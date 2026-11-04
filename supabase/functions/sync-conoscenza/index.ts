// Aggiorna la base di conoscenza: Lemons Insights + fonti Notion (tabella fonti_notion) + numeri calcolati.
// Invocata dal cron notturno o dal pulsante "Aggiorna ora".
import { createClient } from 'npm:@supabase/supabase-js@2';
import { leggiInsights, leggiNotion, calcolaFatti } from '../_shared/fonti.ts';

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

  // anti-abuso: al massimo un giro ogni 3 minuti (le pagine Notion si leggono a lotti)
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

  // 2. Notion (fonti attive in tabella) + numeri calcolati
  let token = Deno.env.get('NOTION_TOKEN') || '';
  if (!token) { const { data } = await db.rpc('leggi_segreto', { nome: 'NOTION_TOKEN' }); token = data || ''; }
  if (!token) report.notion = 'Chiave Notion non configurata: saltato';
  else {
    try {
      const { data: fonti } = await db.from('fonti_notion').select('*').eq('attivo', true).order('ordine');
      const { data: noti } = await db.from('knowledge_chunks').select('source_id,meta').eq('fonte', 'notion');
      const visti: Record<string, string> = {};
      for (const n of noti || []) if ((n.meta as any)?.last_edited) visti[n.source_id] = (n.meta as any).last_edited;
      const r = await leggiNotion(token, fonti || [], visti, 70);
      errori.push(...r.errori);
      report.notion = await salva(r.chunks.map(({ last_edited, ...c }) => ({ ...c, meta: { ...c.meta, last_edited } })));
      report.notion_completo = r.completo;
      if (r.errori.length === 0) {   // pagine sparite o fonti disattivate → via dalla base
        const pres = new Set(r.presenti);
        const via = (noti || []).filter(n => !pres.has(n.source_id)).map(n => n.source_id);
        for (let i = 0; i < via.length; i += 100) await db.from('knowledge_chunks').delete().eq('fonte', 'notion').in('source_id', via.slice(i, i + 100));
        report.notion_rimossi = via.length;
      }
    } catch (e) { errori.push('Notion: ' + e); }
    try {
      const fatti = await calcolaFatti(token);
      const ora = new Date().toISOString();
      const { error } = await db.from('facts').upsert(fatti.map(f => ({ ...f, automatico: true, calcolato_il: ora, confermato_da: 'automatico', confermato_il: ora, note: null })), { onConflict: 'chiave' });
      if (error) errori.push('fatti: ' + error.message); else report.fatti = fatti.map(f => `${f.etichetta}: ${f.valore}`);
    } catch (e) { errori.push('Fatti: ' + e); }
  }

  const ok = errori.length === 0;
  await db.from('sync_log').insert({ job: 'conoscenza', ok, dettagli: { ...report, errori } });
  return json({ ok, ...report, errori });
});
