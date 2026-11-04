// Lettura di Notion (solo database in whitelist) → pezzi di conoscenza.
// Plain TS compatibile con Deno (Edge Function) e con Node ≥ 22 (test locale).

export type Chunk = {
  fonte: string; source_id: string; url: string | null; titolo: string;
  testo: string; area: string | null; meta: Record<string, unknown>;
};

// Fonti Notion: configurate nella tabella `fonti_notion` (modificabile dal sito da un admin).
export type FonteNotion = {
  db_id: string; nome: string; corpo: boolean; campi_esclusi: string[];
  filtro_campo?: string | null; filtro_regex?: string | null; escludi_campo?: string | null; escludi_regex?: string | null;
};
function passaFiltri(f: FonteNotion, props: Record<string, string>) {
  if (f.filtro_campo && f.filtro_regex && !new RegExp(f.filtro_regex, 'i').test(props[f.filtro_campo] || '')) return false;
  if (f.escludi_campo && f.escludi_regex && new RegExp(f.escludi_regex, 'i').test(props[f.escludi_campo] || '')) return false;
  return true;
}

const NV = '2022-06-28';
// Righe dei modelli di pagina Notion, senza contenuto reale
const TEMPLATE = new Set(['Request Overview', 'Basic information about who is requesting the social media post and their objective.',
  'Content Description', 'Detailed description of what needs to be posted and any specific messaging requirements.',
  'Resource Needs', 'Required assets, copy approval contacts, and other resources needed to fulfill this request.',
  'Request Status', 'Current status of the request, next steps, and completion timeline.',
  'Background', 'Context, objectives, and scope of the document', 'Analysis', 'Research findings, data insights, and key considerations',
  'Recommendations', 'Proposed solutions, strategies, and next steps', 'Implementation', 'Action items, timeline, and resource requirements']);

function valore(p: any): string {
  const t = p?.type; const v = p?.[t];
  if (v == null) return '';
  switch (t) {
    case 'title': case 'rich_text': return v.map((x: any) => x.plain_text).join('');
    case 'select': case 'status': return v?.name || '';
    case 'multi_select': return v.map((x: any) => x.name).join(', ');
    case 'number': return String(v);
    case 'date': return v?.start || '';
    case 'url': case 'email': case 'phone_number': return v || '';
    case 'checkbox': return v ? 'sì' : 'no';
    case 'formula': return v?.string ?? (v?.number != null ? String(v.number) : '');
    default: return '';   // people, relation, files, rollup: esclusi (dati personali/relazioni interne)
  }
}

async function nfetch(token: string, path: string, body?: unknown) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch('https://api.notion.com/v1/' + path, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Notion-Version': NV, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 429) { await new Promise(res => setTimeout(res, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`Notion ${r.status} su ${path.split('?')[0]}: ${(await r.text()).slice(0, 160)}`);
    return r.json();
  }
  throw new Error('Notion: troppe richieste');
}

async function testoPagina(token: string, id: string, max = 120): Promise<string> {
  const out: string[] = [];
  let cur: string | undefined;
  do {
    const r: any = await nfetch(token, `blocks/${id}/children?page_size=100${cur ? `&start_cursor=${cur}` : ''}`);
    for (const b of r.results) {
      const rt = b[b.type]?.rich_text;
      if (Array.isArray(rt)) { const s = rt.map((x: any) => x.plain_text).join('').trim(); if (s && !TEMPLATE.has(s)) out.push(s); }
      if (out.length >= max) return out.join('\n');
    }
    cur = r.has_more ? r.next_cursor : undefined;
  } while (cur);
  return out.join('\n');
}

// Restituisce i pezzi delle pagine cambiate dopo `visti[id] = last_edited_time`.
export async function leggiNotion(token: string, fonti: FonteNotion[], visti: Record<string, string>, limitePagine = 80) {
  const chunks: (Chunk & { last_edited: string })[] = [];
  const presenti: string[] = [];
  const errori: string[] = [];
  let lette = 0;
  for (const db of fonti) {
    let cur: string | undefined;
    try {
      do {
        const r: any = await nfetch(token, `databases/${db.db_id}/query`, { page_size: 100, ...(cur ? { start_cursor: cur } : {}) });
        for (const p of r.results) {
          const props: Record<string, string> = {};
          let titolo = '';
          for (const [k, v] of Object.entries<any>(p.properties)) {
            if (v.type === 'title') titolo = valore(v);
            else if (!(db.campi_esclusi || []).includes(k)) { const s = valore(v); if (s) props[k] = s; }
          }
          if (!passaFiltri(db, props)) continue;
          presenti.push(p.id);
          if (visti[p.id] === p.last_edited_time) continue;
          if (lette >= limitePagine) continue;
          lette++;
          let corpo = '';
          if (db.corpo) { try { corpo = await testoPagina(token, p.id); } catch (e) { errori.push(String(e)); } }
          const testo = [Object.entries(props).map(([k, v]) => `${k}: ${v}`).join('\n'), corpo].filter(Boolean).join('\n\n').slice(0, 8000);
          chunks.push({ fonte: 'notion', source_id: p.id, url: p.url, titolo: titolo || '(senza titolo)', testo, area: db.nome, meta: { database: db.nome }, last_edited: p.last_edited_time });
        }
        cur = r.has_more ? r.next_cursor : undefined;
      } while (cur);
    } catch (e) { errori.push(`${db.nome}: ${e}`); }
  }
  return { chunks, presenti, errori, completo: lette < limitePagine };
}

// ── Lemons Insights (sito pubblico di Matteo, Supabase separato) ──
export async function leggiInsights() {
  const BASE = 'https://insights.lemonsintheroom.com';
  const html = await (await fetch(BASE)).text();
  const main = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
  if (!main) throw new Error('Insights: bundle principale non trovato');
  const mainJs = await (await fetch(BASE + main)).text();
  const nomi = [...new Set([...mainJs.matchAll(/assets\/([A-Za-z0-9_.-]+\.js)/g)].map(m => m[1]))];
  const client = nomi.find(n => n.startsWith('client-'));
  const hard = nomi.find(n => n.startsWith('hardcodedStudies-'));
  const chunks: Chunk[] = [];
  const errori: string[] = [];
  if (client) {
    const cjs = await (await fetch(`${BASE}/assets/${client}`)).text();
    const url = cjs.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
    const key = cjs.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
    if (url && key) {
      for (let from = 0; from < 5000; from += 500) {
        const r = await fetch(`${url}/rest/v1/studies?select=id,title,authors,keywords,url,study_design&order=created_at&offset=${from}&limit=500`, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
        if (!r.ok) { errori.push(`Insights studies ${r.status}`); break; }
        const rows: any[] = await r.json();
        for (const s of rows) chunks.push({
          fonte: 'insights_studio', source_id: s.id, url: s.url, titolo: s.title,
          testo: [s.authors && `Autori: ${s.authors}`, s.study_design && `Disegno: ${s.study_design}`].filter(Boolean).join('\n'),
          area: (s.keywords || []).join(', '), meta: { study_design: s.study_design },
        });
        if (rows.length < 500) break;
      }
    } else errori.push('Insights: chiave pubblica non trovata');
  } else errori.push('Insights: modulo client non trovato');
  if (hard) {
    const hjs = await (await fetch(`${BASE}/assets/${hard}`)).text();
    const pezzi = hjs.split(/source:"hardcoded"/);
    const str = (seg: string, k: string) => { const m = seg.match(new RegExp(k + ':"((?:[^"\\\\]|\\\\.)*)"')); return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : ''; };
    for (const seg0 of pezzi) {
      const seg = seg0.slice(seg0.lastIndexOf('{title:'));
      const title = str(seg, 'title'); const url = str(seg, 'url');
      if (!title) continue;
      const kw = seg.match(/keywords:\[([^\]]*)\]/)?.[1]?.replace(/"/g, '') || '';
      chunks.push({
        fonte: 'insights_studio', source_id: 'hc:' + (url || title).slice(0, 180), url: url || null, titolo: title,
        testo: [str(seg, 'authors') && `Autori: ${str(seg, 'authors')}`, str(seg, 'studyDesign') && `Disegno: ${str(seg, 'studyDesign')}`, str(seg, 'abstract')].filter(Boolean).join('\n'),
        area: kw, meta: { study_design: str(seg, 'studyDesign'), con_abstract: !!str(seg, 'abstract') },
      });
    }
  }
  return { chunks, errori };
}
