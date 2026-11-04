// Genera una bozza di post per un membro del team, guidata da playbook + esempi + base di conoscenza.
// La bozza entra come "da rivedere": non viene mai pubblicata senza l'autore.
import { createClient } from 'npm:@supabase/supabase-js@2';
// Documento di tono: letto dal repo pubblico (docs/kit/voice.md), così si aggiorna senza ridistribuire la funzione
const VOICE_URL = 'https://raw.githubusercontent.com/leonardobragalli/lemo-linkedin/main/docs/kit/voice.md';
let VOICE_CACHE: { t: number; s: string } | null = null;
async function leggiVoice() {
  if (VOICE_CACHE && Date.now() - VOICE_CACHE.t < 36e5) return VOICE_CACHE.s;
  try { const r = await fetch(VOICE_URL); if (r.ok) VOICE_CACHE = { t: Date.now(), s: await r.text() }; } catch { /* resta la cache */ }
  return VOICE_CACHE?.s || '';
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const MAX_AL_GIORNO = 20;
const APERTURE = ['domanda', 'dato numerico', 'storia', 'contrasto/definizione', 'citazione', 'affermazione'];

const VINCOLI = `VINCOLI NON NEGOZIABILI (valgono per tutti gli autori):
- LEMO è un dispositivo medico marcato CE in Classe I (MDR UE 2017/745). Destinazione d'uso: comfort e benessere emotivo durante ricoveri e procedure. Mai claim terapeutici (curare, trattare, ridurre il dolore come effetto del dispositivo), mai "scientificamente validato/provato" senza studio, popolazione ed esito.
- Le evidenze di letteratura si riportano come risultati di quello studio (autore, anno, popolazione), non come proprietà di LEMO.
- Per i medici (Codice deontologico FNOMCeO artt. 55-57): informazione prudente, niente promozione commerciale diretta.
- Nessun dato di pazienti, nessun nome di ospedale o reparto partner se non presente nelle fonti fornite.
- Usa SOLO numeri presenti nelle FONTI o nei FATTI CONFERMATI forniti. Se un numero ti sembra utile ma non c'è, non scriverlo. Ogni affermazione fattuale va elencata in "claim" con la fonte (url) o con fonte null.
- Niente hashtag inventati in eccesso: massimo 3 alla fine.
- Testo semplice: LinkedIn non supporta markdown (niente **, niente #titoli).`;

function togliGrassetto(s: string) {
  return [...(s || '')].map(ch => {
    const c = ch.codePointAt(0)!;
    if (c >= 0x1d5d4 && c < 0x1d5ee) return String.fromCharCode(65 + c - 0x1d5d4);
    if (c >= 0x1d5ee && c < 0x1d608) return String.fromCharCode(97 + c - 0x1d5ee);
    if (c >= 0x1d7ec && c < 0x1d7f6) return String.fromCharCode(48 + c - 0x1d7ec);
    if (c >= 0x1d608 && c < 0x1d622) return String.fromCharCode(65 + c - 0x1d608);
    if (c >= 0x1d622 && c < 0x1d63c) return String.fromCharCode(97 + c - 0x1d622);
    return ch;
  }).join('').replace(/\u2800/g, '');
}
function grassetto(s: string) {
  return [...s].map(ch => {
    const c = ch.codePointAt(0)!;
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d5d4 + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d5ee + c - 97);
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ec + c - 48);
    return ch;
  }).join('');
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    tema: { type: 'STRING' },
    aperture: { type: 'ARRAY', items: { type: 'OBJECT', properties: { tipo: { type: 'STRING' }, testo: { type: 'STRING' } }, required: ['tipo', 'testo'] } },
    corpo: { type: 'STRING', description: 'Il post dopo la riga di apertura, con a capo reali, elenchi con ▸ o →, chiusura, massimo 3 hashtag' },
    primo_commento: { type: 'STRING' },
    fonti: { type: 'ARRAY', items: { type: 'OBJECT', properties: { testo: { type: 'STRING' }, url: { type: 'STRING' } }, required: ['testo'] } },
    claim: { type: 'ARRAY', items: { type: 'OBJECT', properties: { frase: { type: 'STRING' }, fonte_url: { type: 'STRING', nullable: true } }, required: ['frase'] } },
    immagine: {
      type: 'OBJECT',
      properties: {
        kicker: { type: 'STRING' }, titolo: { type: 'STRING' }, sottotitolo: { type: 'STRING' },
        metrica_val: { type: 'STRING' }, metrica_lbl: { type: 'STRING' }, citazione: { type: 'STRING' },
        punti: { type: 'ARRAY', items: { type: 'STRING' } },
        kpi: { type: 'ARRAY', items: { type: 'OBJECT', properties: { tag: { type: 'STRING' }, val: { type: 'STRING' }, desc: { type: 'STRING' } }, required: ['tag', 'val', 'desc'] } },
        brief_foto: { type: 'STRING' },
      },
      required: ['kicker', 'titolo', 'sottotitolo', 'punti'],
    },
  },
  required: ['tema', 'aperture', 'corpo', 'fonti', 'claim', 'immagine'],
};

function riassumiPlaybook(pb: any, chi: string) {
  if (!pb) return `Playbook ${chi}: nessun dato.`;
  const c = pb.contenuto || {};
  const righe = [`Playbook ${chi} (v${pb.versione}, ${c.post_con_dati || 0} post con dati; un gruppo è affidabile da ${c.soglia_gruppo} post):`];
  for (const [dim, v] of Object.entries<any>(c.dimensioni || {})) {
    const gr = (v.gruppi || []).map((g: any) => `${g.valore}=${g.indice}× (${g.post} post)`).join(', ');
    righe.push(`- ${dim}${v.affidabile ? '' : ' [dati insufficienti, solo indicativo]'}: ${gr}`);
  }
  if (c.correzioni_autore?.n) righe.push(`- Correzioni dell'autore alle bozze AI: ${c.correzioni_autore.n} bozze modificate, lunghezza finale ≈ ${c.correzioni_autore.rapporto_lunghezza}× la bozza.`);
  return righe.join('\n');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const KEY = Deno.env.get('GEMINI_API_KEY');
  if (!KEY) return json({ error: 'Chiave Gemini non ancora configurata (GEMINI_API_KEY nei secrets delle Edge Functions).' }, 503);
  const MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest';

  const auth = req.headers.get('authorization') || '';
  const utente = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: meId } = await utente.rpc('current_member_id');
  const { data: isAdmin } = await utente.rpc('is_admin');
  if (!meId) return json({ error: 'Non sei nel team' }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* vuoto */ }
  const autoreId: string = body.member_id || meId;
  if (autoreId !== meId && !isAdmin) return json({ error: 'Puoi generare bozze solo per te' }, 403);

  const oggi = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from('posts').select('id', { count: 'exact', head: true }).not('testo_generato', 'is', null).eq('member_id', autoreId).gte('created_at', oggi);
  if ((count || 0) >= MAX_AL_GIORNO) return json({ error: `Limite di ${MAX_AL_GIORNO} bozze al giorno raggiunto` }, 429);

  const { data: autore } = await db.from('team_members').select('*').eq('id', autoreId).single();
  const { data: pbs } = await db.from('playbook').select('*').in('ambito', ['team', autoreId]).order('versione', { ascending: false });
  const pbTeam = pbs?.find(p => p.ambito === 'team');
  const pbMe = pbs?.find(p => p.ambito === autoreId);

  // esempi: migliori e peggiori dell'autore (o del team se l'autore ha pochi dati)
  const migliori: string[] = (pbMe?.contenuto?.migliori?.length >= 2 ? pbMe.contenuto.migliori : pbTeam?.contenuto?.migliori || []).slice(0, 3);
  const peggiori: string[] = (pbMe?.contenuto?.peggiori || pbTeam?.contenuto?.peggiori || []).slice(0, 2);
  const { data: es } = await db.from('posts').select('id,member_id,testo').in('id', [...migliori, ...peggiori].length ? [...migliori, ...peggiori] : ['00000000-0000-0000-0000-000000000000']);
  const testoDi = (id: string) => togliGrassetto(es?.find(e => e.id === id)?.testo || '').slice(0, 1800);
  const { data: scartati } = await db.from('posts').select('testo').eq('member_id', autoreId).eq('stato', 'scartato').order('updated_at', { ascending: false }).limit(3);
  const { data: correz } = await db.from('posts').select('testo,testo_generato').eq('member_id', autoreId).not('testo_generato', 'is', null).in('stato', ['approvato', 'pubblicato']).order('updated_at', { ascending: false }).limit(2);
  const { data: recenti } = await db.from('posts').select('titolo,tema').eq('member_id', autoreId).in('stato', ['approvato', 'pubblicato', 'da_rivedere']).order('scheduled_at', { ascending: false }).limit(12);

  // esplorazione: ~1 bozza su 5 prova l'apertura meno testata dall'autore
  const conteggi: Record<string, number> = Object.fromEntries(APERTURE.map(a => [a, 0]));
  for (const g of pbMe?.contenuto?.dimensioni?.tipo_apertura?.gruppi || []) conteggi[g.valore] = g.post;
  const esplorazione = body.esplorazione ?? Math.random() < 0.2;
  const aperturaDaProvare = Object.entries(conteggi).sort((a, b) => a[1] - b[1])[0][0];

  // base di conoscenza + fatti confermati
  const tema = String(body.tema || autore.angolo || '').slice(0, 300);
  const { data: fonti } = await db.rpc('cerca_conoscenza', { q: `${tema} ${body.istruzioni || ''}`, n: 8 });
  const { data: facts } = await db.from('facts').select('etichetta,valore').not('confermato_il', 'is', null);

  const prompt = [
    `AUTORE: ${autore.nome} — ${autore.ruolo}. Reparto: ${autore.reparto}. Angolo editoriale: ${autore.angolo}. ${autore.id === 'lazar' ? 'Scrive in INGLESE.' : 'Scrive in italiano.'}`,
    autore.headline_it ? `Headline: ${autore.headline_it}` : '',
    `TEMA RICHIESTO: ${tema || '(scegli tu un tema coerente con l\'angolo, diverso dai recenti)'}${body.istruzioni ? `\nISTRUZIONI DELL'AUTORE: ${String(body.istruzioni).slice(0, 800)}` : ''}`,
    `TEMI GIÀ USATI DI RECENTE (non ripeterli): ${(recenti || []).map(r => r.titolo || r.tema).filter(Boolean).join(' | ')}`,
    riassumiPlaybook(pbTeam, 'team'), riassumiPlaybook(pbMe, 'autore'),
    esplorazione ? `ESPLORAZIONE: questa bozza deve usare come prima apertura il tipo "${aperturaDaProvare}" (poco testato), per raccogliere dati.` : 'Usa come prima apertura il tipo che i dati indicano migliore (se affidabile), le altre due di tipo diverso.',
    `ESEMPI CHE HANNO RESO DI PIÙ (imita struttura e ritmo, non il contenuto):\n${migliori.map((id, i) => `--- esempio ${i + 1}\n${testoDi(id)}`).join('\n')}`,
    peggiori.length ? `ESEMPI CHE HANNO RESO MENO (evita questi schemi):\n${peggiori.map(id => `--- \n${testoDi(id).slice(0, 600)}`).join('\n')}` : '',
    scartati?.length ? `POST SCARTATI DALL'AUTORE (non riproporre):\n${scartati.map(s => '- ' + togliGrassetto(s.testo).split('\n')[0]).join('\n')}` : '',
    correz?.length ? `COME L'AUTORE CORREGGE LE BOZZE AI (adeguati):\n${correz.map(c => `BOZZA: ${togliGrassetto(c.testo_generato).slice(0, 500)}\nFINALE: ${togliGrassetto(c.testo).slice(0, 500)}`).join('\n---\n')}` : '',
    `FONTI DISPONIBILI (usa solo queste per fatti e numeri, cita l'url):\n${(fonti || []).map((f: any, i: number) => `[${i + 1}] ${f.titolo} — ${f.url || 's.u.'}\n${String(f.testo || '').slice(0, 900)}`).join('\n') || '(nessuna fonte pertinente trovata: scrivi senza numeri)'}`,
    `FATTI AZIENDALI CONFERMATI: ${(facts || []).map(f => `${f.etichetta}: ${f.valore}`).join('; ') || 'nessuno (non usare numeri aziendali)'}`,
    `Restituisci 3 aperture alternative (tipi diversi tra: ${APERTURE.join(', ')}), la prima è quella consigliata. Prima riga ≤ 140 caratteri. Corpo 120-260 parole, righe brevi. "immagine": testi per la tavola grafica 4:5 (titolo senza numeri; kpi solo con numeri presi dalle fonti, altrimenti lista vuota; brief_foto = descrizione di una foto senza volti di pazienti, visore Meta Quest 3 bianco senza controller).`,
  ].filter(Boolean).join('\n\n');

  const VOICE = await leggiVoice();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `Sei il ghostwriter LinkedIn del team di Lemons in the Room. Scrivi bozze nella voce dell'autore indicato.\n\n${VINCOLI}\n\nDOCUMENTO DI TONO E REGOLE SULLE EVIDENZE (scritto per Matteo Era: le regole su evidenze e "Off limits" valgono per tutti; la voce personale adattala all'autore):\n${VOICE}` }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.85 },
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    await db.from('sync_log').insert({ job: 'genera-bozza', ok: false, dettagli: { status: r.status, errore: t.slice(0, 500) } });
    return json({ error: r.status === 429 ? 'Limite del piano gratuito Gemini raggiunto: riprova tra qualche minuto' : `Errore Gemini ${r.status}` }, 502);
  }
  const out = await r.json();
  let g: any;
  try { g = JSON.parse(out.candidates?.[0]?.content?.parts?.[0]?.text || ''); } catch { return json({ error: 'Risposta AI non valida' }, 502); }
  if (!g?.aperture?.length || !g.corpo) return json({ error: 'Risposta AI incompleta' }, 502);

  const testo = `${grassetto(g.aperture[0].testo.trim())}\n\n${g.corpo.trim()}`;

  // verifica dei numeri: ogni numero deve comparire nelle fonti o nei fatti confermati
  const base = [(fonti || []).map((f: any) => `${f.titolo} ${f.testo}`).join(' '), (facts || []).map(f => f.valore).join(' ')].join(' ');
  const numeri = [...new Set((togliGrassetto(testo).match(/\d+(?:[.,]\d+)?\s?%?/g) || []).map(n => n.trim()))].filter(n => !/^20\d\d$/.test(n));
  const daVerificare = numeri.filter(n => !base.includes(n.replace('%', '').trim()));
  const claim = (g.claim || []).map((c: any) => ({ ...c, stato: c.fonte_url ? 'fonte citata' : 'DA VERIFICARE' }));

  // layout grafico: il migliore se affidabile, altrimenti rotazione
  const lay = pbTeam?.contenuto?.dimensioni?.layout_grafico;
  const layout = lay?.affidabile && !esplorazione ? Number(lay.gruppi[0].valore) : Math.floor(Math.random() * 4);

  const generazione = {
    modello: MODEL, esplorazione, apertura_provata: esplorazione ? aperturaDaProvare : null,
    playbook: { team: pbTeam?.versione || null, autore: pbMe?.versione || null },
    fonti_usate: (fonti || []).map((f: any) => ({ id: f.id, titolo: f.titolo, url: f.url })),
    claim, numeri_da_verificare: daVerificare, creato_da: meId, creato_il: new Date().toISOString(),
  };
  const nota = daVerificare.length || claim.some((c: any) => c.stato !== 'fonte citata')
    ? `DA VERIFICARE prima di pubblicare: ${[...daVerificare.map(n => `numero "${n}"`), ...claim.filter((c: any) => c.stato !== 'fonte citata').map((c: any) => `«${c.frase}»`)].join('; ')}`
    : null;

  const { data: post, error } = await db.from('posts').insert({
    member_id: autoreId, origine: 'nuovo', stato: 'da_rivedere',
    titolo: g.tema?.slice(0, 120) || g.aperture[0].testo.slice(0, 120), tema: g.tema,
    testo, testo_generato: testo, testo_originale: testo,
    commento: g.primo_commento || null,
    fonti: (g.fonti || []).map((f: any) => f.url ? `${f.testo} (${f.url})` : f.testo).join(' · '),
    hook_formula: g.aperture[0].tipo,
    ganci_opzioni: g.aperture.map((a: any) => ({ formula: a.tipo, md: a.testo, uni: grassetto(a.testo.trim()) })),
    vis: { ...g.immagine, tema_breve: (g.tema || '').toUpperCase().slice(0, 40), layout, kpi: g.immagine?.kpi || [] },
    formato: 'immagini', note: nota, generazione,
    scheduled_at: body.scheduled_at || null, updated_by: meId,
  }).select().single();
  if (error) return json({ error: error.message }, 500);
  await db.from('sync_log').insert({ job: 'genera-bozza', ok: true, dettagli: { post: post.id, autore: autoreId, esplorazione } });
  return json({ ok: true, post });
});
