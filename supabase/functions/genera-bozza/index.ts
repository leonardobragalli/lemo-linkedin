// Genera una bozza di post per un membro del team (v3, 5 nov 2026).
// Parte dalla SCHEDA della persona (ruolo, lingua, temi, voce, cosa evitare) e dalle regole LinkedIn 2025-2026:
// apertura entro 140 caratteri, 1.300-2.500 caratteri, niente grassetto unicode, 0-3 hashtag, niente chiusure fisse,
// niente frasi già usate dal team, stesso studio non usato da un collega nella stessa settimana.
// Numeri: solo dalle fonti (base di conoscenza + Europe PMC) o dalla tabella dei numeri aziendali (confermati o provvisori).
// La bozza entra come "da rivedere": non viene mai pubblicata senza l'autore.
import { createClient } from 'npm:@supabase/supabase-js@2';

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

const VINCOLI = `VINCOLI NON NEGOZIABILI (tutti gli autori):
- LEMO è un dispositivo medico marcato CE in Classe I (MDR UE 2017/745). Destinazione d'uso: comfort e benessere emotivo durante ricoveri e procedure. Mai claim terapeutici attribuiti a LEMO ("cura", "tratta", "riduce il dolore/l'ansia" come effetto del dispositivo, "senza farmaci", "nessun effetto collaterale", "sostituisce la sedazione", "clinicamente provato", "scientificamente validato").
- Le evidenze si riportano come risultati di QUELLO studio, nella popolazione studiata (i bambini restano bambini), mai come proprietà di LEMO. Mai gonfiare: riporta il numero esatto della fonte e il contesto esatto (procedura, popolazione).
- Medici (Codice FNOMCeO artt. 55-57): informazione prudente, nessuna promozione commerciale.
- Nessun dato di pazienti; nomi di ospedali solo se presenti nelle fonti fornite.
- Numeri: SOLO quelli presenti nelle FONTI o nei NUMERI AZIENDALI forniti. Se un numero non c'è, non scriverlo. Ogni affermazione fattuale va in "claim" con la fonte.
- Il nome dell'azienda si scrive "Lemons in the room" (r minuscola).
- NON INVENTARE NULLA: niente episodi, dialoghi, domande ricevute, citazioni di persone, aneddoti, procedure interne, strumenti, tempi o processi aziendali che non siano scritti nella SCHEDA dell'autore, nelle ISTRUZIONI o nelle FONTI. Se mancano, scrivi una riflessione o un'osservazione generale, senza fingere che sia successo qualcosa.
- Mai citazioni numeriche tra parentesi quadre ([1], [3, 5]).
- Il paragrafo dopo la prima riga non ripete la prima riga con altre parole: la porta avanti.
- Numeri aziendali: al massimo 2 per post (MAI 3 o più), solo se servono al tema; mai elenchi di numeri; mai nella prima riga, mai combinati tra loro o con luoghi non indicati (es. non scrivere "75 visori tra Italia e Spagna" se il dato dice solo "75 visori"), riportali esattamente come sono scritti.`;

const REGOLE_LINKEDIN = `REGOLE LINKEDIN (studi 2025-2026 su centinaia di migliaia di post):
- Prima riga: massimo 130 caratteri, deve reggersi da sola (su mobile LinkedIn taglia a ~140 con "vedi altro"). Concreta, vera, senza preamboli.
- Lunghezza totale 1.300-2.200 caratteri. Paragrafi di 1-3 righe, a capo frequenti.
- Testo semplice: NIENTE grassetto o corsivo unicode, niente markdown, niente em dash (—).
- Elenchi solo se servono, con ▸ o →.
- Chiusura: una domanda specifica e vera per chi lavora nel settore, oppure una frase che chiude. NON una formula fissa, NON "commenta se sei d'accordo" o simili.
- Hashtag: da 0 a 3, scelti per QUESTO post (non sempre gli stessi). Niente emoji in serie; al massimo una.
- Nessun paragrafo riciclato: niente slogan o chiusure ricorrenti dell'autore o del team.
- Il testo è il post finale: nessuna istruzione, nessun segnaposto, nessuna nota tra parentesi quadre.`;

const FRASI_VIETATE: [RegExp, string][] = [
  [/scientificamente validat|clinicamente provat|clinically proven|scientifically validated/i, 'claim "validato/provato"'],
  [/senza effetti collaterali|nessun effetto collaterale|side[- ]effect[- ]free|drug[- ]free|senza farmaci/i, 'claim fuori destinazione d\'uso'],
  [/sostituisce (?:i farmaci|la sedazione|l'anestesia)/i, 'claim "sostituisce"'],
  [/rivoluzionari|miracolos|game[- ]changer|breakthrough/i, 'parola promozionale'],
  [/Lemons in the Room/, '"Room" maiuscola'],
  [/—/, 'em dash'],
  [/\[[^\]]{1,40}\]|\bTODO\b|\bXXX\b/i, 'segnaposto o rimando [n] nel testo'],
  [/^(?:Metti|Scrivi|Inserisci|Aggiungi|Racconta|Descrivi|Spiega) /m, 'istruzione rimasta nel testo'],
];
const DIZ: [RegExp, string][] = [
  [/realt[àa] virtuale/gi, 'virtual reality'], [/bambin[ie]|pediatri\w*/gi, 'children pediatric'], [/aghi|ago\b/gi, 'needle'],
  [/prelievo|prelievi/gi, 'venipuncture blood draw'], [/dolore/gi, 'pain'], [/ansia/gi, 'anxiety'], [/paura/gi, 'fear'], [/ustion\w*/gi, 'burn'],
  [/chemioterapi\w*/gi, 'chemotherapy'], [/oncologi\w*|tumor\w*|cancro/gi, 'cancer oncology'], [/dialisi/gi, 'dialysis'],
  [/pronto soccorso/gi, 'emergency department'], [/preoperatori\w*|prima dell'intervento/gi, 'preoperative'], [/intervent\w*|chirurgi\w*/gi, 'surgery'],
  [/medicazion\w*/gi, 'dressing change'], [/demenza/gi, 'dementia'], [/anzian\w*/gi, 'older adults'], [/parto|travaglio/gi, 'labor childbirth'],
  [/vaccin\w*/gi, 'vaccination'], [/riabilitazion\w*|fisioterapi\w*/gi, 'rehabilitation'], [/terapia intensiva/gi, 'intensive care'],
  [/ricover\w*/gi, 'hospitalized'], [/infermier\w*/gi, 'nurses'], [/stress/gi, 'stress'], [/sedazion\w*/gi, 'sedation'],
];
function traduciTema(t: string) { let s = ' ' + t + ' '; const out: string[] = []; for (const [re, en] of DIZ) { re.lastIndex = 0; if (re.test(s)) { out.push(en); s = s.replace(re, ' '); } } return out.join(' ') || t; }
// accenti mancanti (solo italiano)
const SENZA_ACCENTO = /(puo|piu|perche|gia|cioe|realta|qualita|sanita|affidabilita|unita|modalita|attivita|citta|opportunita|criticita|necessita|identita|comunita|possibilita|capacita|novita|verra|avra|potra|dovra)/i;

function togliGrassetto(s: string) {
  return [...(s || '')].map(ch => {
    const c = ch.codePointAt(0)!;
    if (c >= 0x1d5d4 && c < 0x1d5ee) return String.fromCharCode(65 + c - 0x1d5d4);
    if (c >= 0x1d5ee && c < 0x1d608) return String.fromCharCode(97 + c - 0x1d5ee);
    if (c >= 0x1d7ec && c < 0x1d7f6) return String.fromCharCode(48 + c - 0x1d7ec);
    if (c >= 0x1d608 && c < 0x1d622) return String.fromCharCode(65 + c - 0x1d608);
    if (c >= 0x1d622 && c < 0x1d63c) return String.fromCharCode(97 + c - 0x1d622);
    return ch;
  }).join('').replace(/\u2800/g, '').normalize('NFC');
}
const parole = (t: string) => togliGrassetto(t).toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, ' ').trim().split(' ').filter(Boolean);
function ngrammi(t: string, n = 7) {
  const w = parole(t); const s = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' '));
  return s;
}

// Europe PMC (gratuito): studi peer-reviewed quando la base interna ha poco sul tema (idea di Matteo)
async function cercaEuropePmc(tema: string, limite = 5) {
  try {
    const clean = String(tema || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
    if (!clean) return [];
    const q = `("virtual reality" OR immersive) AND (${clean})`;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&resultType=core&format=json&pageSize=${limite}&sort=CITED%20desc`;
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const res: any[] = (await r.json())?.resultList?.result || [];
    return res.filter(it => it.abstractText).map(it => ({
      id: `epmc_${it.pmid || it.id}`, fonte: 'europe_pmc',
      titolo: `${it.title} (${(it.authorString || '').split(',')[0]} et al., ${it.journalTitle || ''} ${it.pubYear || ''})`,
      url: it.doi ? `https://doi.org/${it.doi}` : it.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${it.pmid}/` : null,
      testo: `PMID ${it.pmid || '-'}. Abstract: ${String(it.abstractText).replace(/<[^>]+>/g, ' ').slice(0, 1100)}`,
    }));
  } catch { return []; }
}

// dati bibliografici veri da PubMed (eutils, gratuito): autore, rivista, anno, DOI. Il modello non deve inventarli.
async function datiPubmed(ids: string[]) {
  const out: Record<string, any> = {};
  if (!ids.length) return out;
  try {
    const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`, { signal: AbortSignal.timeout(8000) });
    const d = (await r.json())?.result || {};
    for (const id of d.uids || []) {
      const x = d[id]; const primo = String(x.authors?.[0]?.name || '').split(' ')[0];
      const doi = (x.articleids || []).find((a: any) => a.idtype === 'doi')?.value;
      out[id] = { primo, anno: String(x.pubdate || '').slice(0, 4), rivista: x.source, titolo: x.title, doi,
        citazione: `${(x.authors || []).slice(0, 3).map((a: any) => a.name).join(', ')}${(x.authors || []).length > 3 ? ' et al.' : ''} ${x.title} ${x.source}. ${x.pubdate}.${doi ? ' doi:' + doi + '.' : ''} PMID: ${id}` };
    }
  } catch { /* PubMed non raggiungibile: niente dati verificati */ }
  return out;
}
const pmidDi = (f: any) => String(f?.url || '').match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1] || String(f?.id || '').match(/^epmc_(\d+)$/)?.[1] || null;

const SCHEMA_GRAFICA = {
  type: 'OBJECT',
  description: 'Testi per la grafica 4:5. modello: frase | numero | carosello | foto. stile: scientifico (studi clinici) | friendly (tutto il resto).',
  properties: {
    modello: { type: 'STRING' }, stile: { type: 'STRING' },
  etichetta: { type: 'STRING', maxLength: 40, description: 'tema in 2-4 parole, nella lingua del post, va in alto in maiuscoletto' },
    titolo: { type: 'STRING', maxLength: 70, description: 'max 9 parole. Frase ad effetto che ribalta un\'aspettativa comune (es. «La paura dell\'ago non è una cosa da bambini»), vera e coerente col post, mai uno slogan vuoto' },
    parola_chiave: { type: 'STRING', maxLength: 40, description: 'parte del titolo da colorare: quella che ribalta l\'aspettativa (es. «non è una cosa da bambini»); mai il solo numero' },
    sottotitolo: { type: 'STRING', maxLength: 130, description: 'una frase breve' },
    numero: { type: 'STRING', maxLength: 12, description: 'solo se preso dalle fonti o dai numeri aziendali' },
    etichetta_numero: { type: 'STRING', maxLength: 80, description: 'cosa misura il numero, 3-8 parole; il titolo deve dire perché conta' },
    fonte_breve: { type: 'STRING', maxLength: 90, description: 'es. Autore et al., Rivista Anno' },
    slide: { type: 'ARRAY', maxItems: 7, items: { type: 'OBJECT', properties: { titolo: { type: 'STRING', maxLength: 70 }, testo: { type: 'STRING', maxLength: 220 }, numero: { type: 'STRING', maxLength: 12 } }, required: ['titolo', 'testo'] }, description: 'solo per carosello: 3-7 slide interne, una idea ciascuna' },
    domanda_finale: { type: 'STRING', maxLength: 140 },
  },
  required: ['modello', 'stile', 'titolo'],
};

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    tema: { type: 'STRING' },
    aperture: { type: 'ARRAY', maxItems: 3, items: { type: 'OBJECT', properties: { tipo: { type: 'STRING', maxLength: 30 }, testo: { type: 'STRING', maxLength: 180 } }, required: ['tipo', 'testo'] } },
    corpo: { type: 'STRING', maxLength: 2600, description: 'Il post dopo la prima riga, a capo reali, chiusura, 0-3 hashtag' },
    primo_commento: { type: 'STRING', description: 'Fonti complete (autore, rivista, anno, DOI/PMID) se il post cita studi; altrimenti stringa vuota' },
    fonti: { type: 'ARRAY', items: { type: 'OBJECT', properties: { testo: { type: 'STRING' }, url: { type: 'STRING' } }, required: ['testo'] } },
    claim: { type: 'ARRAY', items: { type: 'OBJECT', properties: { frase: { type: 'STRING' }, fonte_url: { type: 'STRING', nullable: true } }, required: ['frase'] } },
    numeri_aziendali_usati: { type: 'ARRAY', items: { type: 'STRING' }, description: 'chiavi dei NUMERI AZIENDALI usati nel testo' },
    grafica: SCHEMA_GRAFICA,
  },
  required: ['tema', 'aperture', 'corpo', 'fonti', 'claim', 'grafica'],
};

function riassumiPlaybook(pb: any, chi: string) {
  if (!pb) return '';
  const c = pb.contenuto || {};
  const righe = [`Dati di rendimento (${chi}, ${c.post_con_dati || 0} post con dati; un gruppo vale da ${c.soglia_gruppo} post):`];
  for (const [dim, v] of Object.entries<any>(c.dimensioni || {})) {
    if (!v.affidabile) continue;
    righe.push(`- ${dim}: ${(v.gruppi || []).map((g: any) => `${g.valore}=${g.indice}×`).join(', ')}`);
  }
  return righe.length > 1 ? righe.join('\n') : '';
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const KEY = Deno.env.get('GEMINI_API_KEY');
  if (!KEY) return json({ error: 'Chiave Gemini non configurata (GEMINI_API_KEY nei secrets).' }, 503);
  let MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';

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
  if (isAdmin && /^gemini-[a-z0-9.-]+$/.test(String(body.modello || ''))) MODEL = body.modello;  // solo per le prove

  // ── azioni su una bozza esistente: traduzione e nuova versione della grafica ──
  if (body.azione === 'traduci' || body.azione === 'grafica') {
    const { data: orig } = await db.from('posts').select('*').eq('id', body.post_id).single();
    if (!orig) return json({ error: 'Bozza non trovata' }, 404);
    if (orig.member_id !== meId && !isAdmin) return json({ error: 'Puoi modificare solo le tue bozze' }, 403);
    const linguaOrig = orig.generazione?.lingua || 'it';
    const chiamaSemplice = async (sistema: string, testo: string, schema: any, tentativo = 1): Promise<any> => {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, signal: AbortSignal.timeout(90000),
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: testo }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 1.0, maxOutputTokens: 6000, thinkingConfig: { thinkingBudget: 512 } } }),
      });
      if (!r.ok) throw new Error(r.status === 429 ? 'Limite del piano gratuito Gemini raggiunto: riprova tra qualche minuto' : `Errore Gemini ${r.status}`);
      const out = await r.json();
      const txt = (out.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
      try { return JSON.parse(txt); }
      catch {
        // a volte il modello si inceppa ripetendo parole fino al limite: registro e riprovo una volta
        await db.from('sync_log').insert({ job: 'genera-bozza', ok: false, dettagli: { azione: body.azione, fine: out.candidates?.[0]?.finishReason, coda: txt.slice(-300) } });
        if (tentativo < 2) return chiamaSemplice(sistema, testo, schema, tentativo + 1);
        throw new Error("Risposta dell'AI non valida: riprova");
      }
    };
    const visDa = (gr: any, base: any = {}) => ({
      ...base, grafica: gr, titolo: gr.titolo, sottotitolo: gr.sottotitolo || '',
      punti: (gr.slide || []).map((x: any) => x.titolo).concat(['', '', '']).slice(0, Math.max(3, (gr.slide || []).length)),
      metrica_val: gr.numero || '', metrica_lbl: gr.etichetta_numero || '', citazione: gr.fonte_breve || '',
    });
    try {
      if (body.azione === 'grafica') {
        const vis = orig.vis || {};
        const prec = [...(vis.versioni || (vis.grafica ? [vis.grafica] : []))];
        const en = linguaOrig === 'en';
        const sistemaGrafica = `Sei il grafico LinkedIn di Lemons in the room. Scrivi SOLO i testi di una grafica 4:5 per il post dato, in ${en ? 'INGLESE' : 'ITALIANO'}.\n${VINCOLI}\nRegole: titolo max 9 parole, una sola idea, scritto come frase ad effetto che ribalta un'aspettativa comune (modello: «La paura dell'ago non è una cosa da bambini»), vero e coerente col post; parola_chiave = la parte che ribalta l'aspettativa; numeri SOLO se presenti nel post (copiali identici, con la fonte in fonte_breve); per il carosello 3-7 slide, una idea ciascuna; se il post è un elenco numerato, titoli delle slide che iniziano con "1. ", "2. "...; domanda_finale specifica e vera. Fai una versione DIVERSA dalle precedenti: altro taglio, altro titolo, altra parola chiave.`;
        const utenteGrafica = `POST:\n${orig.testo}\n\nFONTI (primo commento):\n${orig.commento || '-'}\n\nVERSIONI PRECEDENTI DA NON RIPETERE:\n${prec.map((x: any) => `- ${x.titolo} | ${(x.slide || []).map((y: any) => y.titolo).join(' / ')}`).join('\n')}\n\nModello da usare: ${body.modello || vis.grafica?.modello || 'scegli tu'}.`;
        const gr = await chiamaSemplice(sistemaGrafica, utenteGrafica,
          SCHEMA_GRAFICA);
        const sporco = (x: any) => /[\n\t\r]/.test(`${x?.titolo || ''}${x?.parola_chiave || ''}${x?.sottotitolo || ''}${(x?.slide || []).map((y: any) => y.titolo + y.testo).join('')}`);
        let grOk = gr;
        if (sporco(gr)) grOk = await chiamaSemplice(sistemaGrafica, utenteGrafica, SCHEMA_GRAFICA);
        if (sporco(grOk)) return json({ error: "La grafica è uscita con dei caratteri sbagliati: riprova" }, 502);
        Object.assign(gr, grOk);
        const nuova = { ...gr, stile: ['scientifico', 'friendly'].includes(gr.stile) ? gr.stile : (vis.grafica?.stile || 'friendly'), modello: body.modello || gr.modello || vis.grafica?.modello };
        const versioni = [...prec, nuova].slice(-12);
        const { data: post, error } = await db.from('posts').update({ vis: { ...visDa(nuova, vis), versioni }, updated_by: meId }).eq('id', orig.id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true, post });
      }
      // traduzione: nuova bozza collegata all'originale
      const verso = body.lingua === 'it' || body.lingua === 'en' ? body.lingua : (linguaOrig === 'en' ? 'it' : 'en');
      const SCHEMA_TRAD = { type: 'OBJECT', properties: { aperture: SCHEMA.properties.aperture, corpo: SCHEMA.properties.corpo, tema: { type: 'STRING', description: 'tema tradotto, max 6 parole' }, grafica: SCHEMA_GRAFICA }, required: ['aperture', 'corpo', 'tema', 'grafica'] };
      const tr = await chiamaSemplice(
        `Traduci un post LinkedIn di Lemons in the room in ${verso === 'en' ? 'INGLESE naturale (non letterale), registro professionale' : 'ITALIANO naturale, con tutti gli accenti'}. Mantieni struttura, a capo, numeri, nomi di studi e autori identici; non aggiungere né togliere contenuti. Hashtag adattati alla lingua (0-3).\n${VINCOLI}`,
        `APERTURE (la prima è quella usata nel post):\n${(orig.ganci_opzioni || []).map((x: any) => `${x.formula}: ${x.md}`).join('\n')}\n\nPOST COMPLETO:\n${orig.testo}\n\nTESTI DELLA GRAFICA (JSON):\n${JSON.stringify(orig.vis?.grafica || {})}\n\nRestituisci aperture (stessi tipi), corpo (il post SENZA la prima riga), tema e grafica tradotti.`,
        SCHEMA_TRAD);
      const ap = togliGrassetto(String(tr.aperture?.[0]?.testo || '')).trim();
      let corpo = togliGrassetto(String(tr.corpo || '')).trim();
      if (ap && corpo.startsWith(ap)) corpo = corpo.slice(ap.length).trim();
      const testoTr = `${ap}\n\n${corpo}`.replace(/\n{3,}/g, '\n\n');
      const grT = { ...(orig.vis?.grafica || {}), ...(tr.grafica || {}), stile: orig.vis?.grafica?.stile || 'friendly', modello: orig.vis?.grafica?.modello };
      const commentoTr = orig.commento ? String(orig.commento).replace(/^(Fonti|Sources):/, verso === 'en' ? 'Sources:' : 'Fonti:') : null;
      const temaTr = String(tr.tema || orig.tema || '');
      const { data: post, error } = await db.from('posts').insert({
        member_id: orig.member_id, origine: 'nuovo', stato: 'da_rivedere',
        titolo: `[${verso.toUpperCase()}] ${temaTr.slice(0, 110)}`, tema: temaTr,
        testo: testoTr, testo_generato: testoTr, testo_originale: testoTr, commento: commentoTr, fonti: orig.fonti, note: orig.note,
        hook_formula: tr.aperture?.[0]?.tipo || orig.hook_formula,
        ganci_opzioni: (tr.aperture || []).map((a: any) => { const t = togliGrassetto(a.testo).trim(); return { formula: a.tipo, md: t, uni: t }; }),
        vis: { ...visDa(grT, orig.vis || {}), versioni: [grT], kicker: temaTr.toUpperCase().slice(0, 40), tema_breve: temaTr.toUpperCase().slice(0, 40) },
        formato: orig.formato, generazione: { ...(orig.generazione || {}), lingua: verso, traduzione_di: orig.id, creato_da: meId, creato_il: new Date().toISOString() },
        updated_by: meId,
      }).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, post });
    } catch (e) {
      return json({ error: /timeout|abort/i.test(String(e)) ? "L'AI ci sta mettendo troppo: riprova" : String((e as Error).message || e) }, 502);
    }
  }

  const ieri = new Date(Date.now() - 864e5).toISOString();
  const { count } = await db.from('posts').select('id', { count: 'exact', head: true }).not('testo_generato', 'is', null).eq('member_id', autoreId).gte('created_at', ieri);
  if ((count || 0) >= MAX_AL_GIORNO) return json({ error: `Limite di ${MAX_AL_GIORNO} bozze al giorno raggiunto` }, 429);

  const { data: autore } = await db.from('team_members').select('*').eq('id', autoreId).single();
  const inglese = autore.lingua === 'en' && body.lingua !== 'it' || body.lingua === 'en';
  const { data: pbs } = await db.from('playbook').select('*').in('ambito', ['team', autoreId]).order('versione', { ascending: false });
  const pbTeam = pbs?.find(p => p.ambito === 'team');
  const pbMe = pbs?.find(p => p.ambito === autoreId);

  // esempi dell'autore (migliori / peggiori) e sue correzioni
  const migliori: string[] = (pbMe?.contenuto?.migliori || []).slice(0, 2);
  const { data: es } = await db.from('posts').select('id,testo').in('id', migliori.length ? migliori : ['00000000-0000-0000-0000-000000000000']);
  const { data: correz } = await db.from('posts').select('testo,testo_generato').eq('member_id', autoreId).not('testo_generato', 'is', null).in('stato', ['approvato', 'pubblicato']).order('updated_at', { ascending: false }).limit(2);
  const { data: scartati } = await db.from('posts').select('testo').eq('member_id', autoreId).eq('stato', 'scartato').order('updated_at', { ascending: false }).limit(3);

  // anti-ripetizione: testi del team degli ultimi 60 giorni + temi recenti dell'autore + studi usati dai colleghi in settimana
  const da60 = new Date(Date.now() - 60 * 864e5).toISOString();
  const { data: teamTesti } = await db.from('posts').select('member_id,testo,tema,titolo,generazione,created_at,scheduled_at,stato')
    .or(`scheduled_at.gte.${da60},created_at.gte.${da60}`).neq('stato', 'scartato').limit(400);
  const recentiAutore = (teamTesti || []).filter(p => p.member_id === autoreId).map(p => p.tema || p.titolo).filter(Boolean).slice(0, 15);
  const settimana = Date.now() - 7 * 864e5;
  const studiColleghi = new Set<string>();
  for (const p of teamTesti || []) {
    if (p.member_id === autoreId || new Date(p.created_at).getTime() < settimana) continue;
    for (const f of p.generazione?.fonti_usate || []) if (f?.titolo) studiColleghi.add(String(f.titolo).slice(0, 90));
  }
  const righeRicorrenti = new Map<string, number>();
  for (const p of (teamTesti || []).filter(p => p.member_id === autoreId)) {
    for (const r of new Set(togliGrassetto(p.testo || '').split('\n').map(x => x.trim()).filter(x => x.length > 40))) righeRicorrenti.set(r, (righeRicorrenti.get(r) || 0) + 1);
  }
  const frasiDaEvitare = [...righeRicorrenti.entries()].filter(([, n]) => n >= 3).map(([r]) => r).slice(0, 8);

  // feedback "Non mi piace" del Pannello
  const { data: fbRow } = await db.from('pannello_stato').select('valore').eq('chiave', 'feedback-negativo-generatore').maybeSingle();
  let feedback = '';
  try { const fb = JSON.parse(fbRow?.valore || '{}'); const tr = fb?.traits || fb || {}; const att = Object.entries(tr).filter(([, n]) => Number(n) > 0).map(([k, n]) => `${k} (${n}×)`); if (att.length) feedback = `DIFETTI SEGNALATI DAL TEAM CON "NON MI PIACE" (evitali): ${att.join(', ')}.`; } catch { /* niente */ }

  // apertura: esplorazione ~1 su 5 o scelta dell'autore
  const conteggi: Record<string, number> = Object.fromEntries(APERTURE.map(a => [a, 0]));
  for (const g of pbMe?.contenuto?.dimensioni?.tipo_apertura?.gruppi || []) conteggi[g.valore] = g.post;
  const esplorazione = body.tipo_apertura ? false : (body.esplorazione ?? Math.random() < 0.2);
  const aperturaDaProvare = body.tipo_apertura || Object.entries(conteggi).sort((a, b) => a[1] - b[1])[0][0];

  // fonti: base interna (sigle corte comprese) + Europe PMC se servono; numeri aziendali utilizzabili
  const tema = String(body.tema || '').slice(0, 300);
  // studi (Insights + Europe PMC): unica fonte per numeri scientifici. Gli studi sono in inglese: traduco le parole cliniche del tema.
  // Materiale interno Notion (blog, guide): solo contesto, MAI numeri scientifici (contiene cifre non verificate, es. il -44%).
  const qIt = `${tema} ${body.istruzioni || ''}`;
  const qEn = inglese ? qIt : traduciTema(qIt);
  const giaUsato = (f: any) => [...studiColleghi].some(s => s.startsWith(String(f.titolo).slice(0, 60)));
  const [{ data: studiDb }, { data: interniDb }] = await Promise.all([
    db.rpc('cerca_conoscenza', { q: qEn, n: 12 }), db.rpc('cerca_conoscenza', { q: qIt, n: 8 })]);
  let studi: any[] = (studiDb || []).filter((f: any) => f.fonte !== 'notion' && !giaUsato(f)).slice(0, 6);
  if (tema && studi.length < 3) studi = [...studi, ...(await cercaEuropePmc(qEn, 5))].slice(0, 7);
  const interni: any[] = (interniDb || []).filter((f: any) => f.fonte === 'notion').slice(0, 3);
  const pm = await datiPubmed(studi.map(pmidDi).filter(Boolean) as string[]);
  for (const f of studi) { const d = pm[pmidDi(f) || '']; if (d) f.verificato = d; }
  const fonti = [...studi, ...interni];
  const { data: facts } = await db.from('facts').select('chiave,etichetta,valore,fonte,stato,automatico').or('stato.in.(confermato,provvisorio),automatico.eq.true');

  const prompt = [
    `AUTORE: ${autore.nome}, ${autore.ruolo}. LINGUA DEL POST: ${inglese ? 'INGLESE' : 'ITALIANO'}.`,
    `SCHEDA DELL'AUTORE (ruolo, temi, voce, cosa evitare: è la guida principale):\n${autore.scheda || '(nessuna scheda)'}`,
    `TEMA RICHIESTO: ${tema || '(scegli uno dei temi della scheda, diverso dai recenti)'}${body.istruzioni ? `\nISTRUZIONI DELL'AUTORE: ${String(body.istruzioni).slice(0, 800)}` : ''}`,
    recentiAutore.length ? `TEMI GIÀ USATI DALL'AUTORE (non ripeterli): ${recentiAutore.join(' | ')}` : '',
    frasiDaEvitare.length ? `FRASI CHE L'AUTORE HA GIÀ RIPETUTO TROPPO (vietato riusarle, anche parafrasate):\n${frasiDaEvitare.map(f => '- ' + f.slice(0, 200)).join('\n')}` : '',
    studiColleghi.size ? `STUDI GIÀ USATI DAI COLLEGHI QUESTA SETTIMANA (non usarli):\n${[...studiColleghi].slice(0, 12).map(s => '- ' + s).join('\n')}` : '',
    riassumiPlaybook(pbMe, 'autore') || riassumiPlaybook(pbTeam, 'team'),
    esplorazione ? `La prima apertura deve essere di tipo "${aperturaDaProvare}" (poco provato: raccogliamo dati).` : '',
    migliori.length ? `POST DELL'AUTORE CHE HANNO RESO DI PIÙ (imita ritmo e struttura, NON frasi e chiusure):\n${migliori.map(id => '---\n' + togliGrassetto(es?.find(e => e.id === id)?.testo || '').slice(0, 1400)).join('\n')}` : '',
    correz?.length ? `COME L'AUTORE HA CORRETTO LE BOZZE AI (adeguati):\n${correz.map(c => `BOZZA: ${togliGrassetto(c.testo_generato).slice(0, 450)}\nFINALE: ${togliGrassetto(c.testo).slice(0, 450)}`).join('\n---\n')}` : '',
    scartati?.length ? `POST SCARTATI DALL'AUTORE (non riproporre):\n${scartati.map(s => '- ' + togliGrassetto(s.testo).split('\n')[0].slice(0, 160)).join('\n')}` : '',
    feedback,
    `STUDI SCIENTIFICI (unica base per numeri e risultati clinici; nel testo cita autore e anno a parole, mai [1] o [2]; dettagli completi nel primo commento):\n${studi.map(f => `- ${f.verificato ? `[${f.verificato.primo} et al., ${f.verificato.rivista}, ${f.verificato.anno}] ` : ''}${f.titolo} — ${f.url || 's.u.'}\n${String(f.testo || '').slice(0, 1000)}`).join('\n') || '(nessuno studio pertinente: niente numeri clinici)'}`,
    interni.length ? `MATERIALE INTERNO DI LEMONS IN THE ROOM (solo per contesto e tono: NON prendere da qui numeri o percentuali, non sono verificati):\n${interni.map(f => `- ${f.titolo}\n${String(f.testo || '').slice(0, 600)}`).join('\n')}` : '',
    `NUMERI AZIENDALI UTILIZZABILI (al massimo 2 per post e solo se servono al tema; usa la chiave in numeri_aziendali_usati):\n${(facts || []).map(f => `- ${f.chiave} [${f.stato}]: ${f.etichetta} = ${f.valore}`).join('\n') || '(nessuno: non usare numeri aziendali)'}`,
    `Restituisci 3 aperture alternative di tipi diversi (tra: ${APERTURE.join(', ')}); la prima è la consigliata. "grafica": scegli il modello più adatto (numero se c'è un dato forte con fonte, carosello se il post è un elenco o un percorso a passi, frase altrimenti; foto solo se l'autore lo chiede) il titolo della grafica come frase ad effetto che ribalta un'aspettativa comune (modello: «La paura dell'ago non è una cosa da bambini»), con la parte che ribalta come parola_chiave; e lo stile (scientifico se il post riporta uno studio clinico, altrimenti ${autore.stile_grafico || 'friendly'}).`,
  ].filter(Boolean).join('\n\n');

  const VOICE = await leggiVoice();
  const sistema = `Sei il ghostwriter LinkedIn del team di Lemons in the room. Scrivi nella voce dell'autore indicato, seguendo la sua SCHEDA.\n\n${VINCOLI}\n\n${REGOLE_LINKEDIN}\n\nREGOLE SULLE EVIDENZE (dal documento di Matteo Era: valgono per tutti; la parte sulla voce personale vale solo per Matteo):\n${VOICE.slice(0, 7000)}`;
  const chiama = async (testoUtente: string, ms: number) => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY }, signal: AbortSignal.timeout(ms),
      body: JSON.stringify({ systemInstruction: { parts: [{ text: sistema }] }, contents: [{ role: 'user', parts: [{ text: testoUtente }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 1.0, maxOutputTokens: 6000, thinkingConfig: { thinkingBudget: 1024 } } }),
    });
    if (!r.ok) { const t = await r.text(); await db.from('sync_log').insert({ job: 'genera-bozza', ok: false, dettagli: { status: r.status, errore: t.slice(0, 500) } }); throw new Error(r.status === 429 ? 'Limite del piano gratuito Gemini raggiunto: riprova tra qualche minuto' : `Errore Gemini ${r.status}`); }
    const out = await r.json();
    const txt = (out.candidates?.[0]?.content?.parts || []).filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
    try { return JSON.parse(txt); }
    catch { await db.from('sync_log').insert({ job: 'genera-bozza', ok: false, dettagli: { fine: out.candidates?.[0]?.finishReason, uso: out.usageMetadata, caratteri: txt.length, inizio: txt.slice(0, 3500), coda: txt.slice(-400) } }); throw new Error('Risposta AI non valida (' + (out.candidates?.[0]?.finishReason || '?') + '): riprova'); }
  };

  // controlli automatici sul risultato
  const ngTeam = new Set<string>();
  for (const p of teamTesti || []) for (const g of ngrammi(p.testo || '')) ngTeam.add(g);
  const controlla = (g: any) => {
    const ap = togliGrassetto(String(g.aperture?.[0]?.testo || '')).trim();
    let corpo = togliGrassetto(String(g.corpo || '')).trim();
    if (ap && corpo.startsWith(ap)) corpo = corpo.slice(ap.length).trim();  // il modello a volte ripete la prima riga
    const testo = `${ap}\n\n${corpo}`;
    const problemi: string[] = [];
    if (ap.length > 140) problemi.push(`prima riga di ${ap.length} caratteri (massimo 140)`);
    if (testo.length < 1100) problemi.push(`testo corto (${testo.length} caratteri, obiettivo 1.300-2.200)`);
    if (testo.length > 2600) problemi.push(`testo lungo (${testo.length} caratteri)`);
    const tags = testo.match(/#[\p{L}\p{N}_]+/gu) || [];
    if (tags.length > 3) problemi.push(`${tags.length} hashtag (massimo 3)`);
    for (const [re, nome] of FRASI_VIETATE) if (re.test(testo)) problemi.push(nome);
    const sec = corpo.split('\n').find(r => r.trim())?.trim() || '';
    const wa = new Set(parole(ap)), ws = parole(sec); if (ws.length && ws.filter(w => wa.has(w)).length / ws.length > 0.6) problemi.push('il secondo paragrafo ripete la prima riga');
    if (!inglese) { const m = testo.match(SENZA_ACCENTO); if (m) problemi.push(`accenti mancanti (es. "${m[0]}")`); }
    const ripetuti = [...ngrammi(testo)].filter(x => ngTeam.has(x));
    if (/\*\*|__|^#+ /m.test(testo)) problemi.push('formattazione markdown (** o #) nel testo');
    for (const f of studi) { const v = f.verificato; if (!v?.primo) continue;
      for (const m of testo.matchAll(new RegExp(v.primo + '[^()\n]{0,25}?[(,]\s*(\d{4})', 'g'))) if (m[1] !== v.anno) problemi.push(`anno sbagliato per ${v.primo}: ${m[1]} invece di ${v.anno}`); }
    if (ripetuti.length >= 3) problemi.push(`frasi già usate dal team: «${ripetuti[0]}»`);
    for (const f of (facts || []).filter(f => (g.numeri_aziendali_usati || []).includes(f.chiave))) {
      const num = String(f.valore).match(/\d[\d.,]*/)?.[0]; if (!num) continue;
      const base = `${f.valore} ${f.etichetta}`.toLowerCase();
      for (const m of testo.matchAll(new RegExp('(?<![\\d.,])' + num.replace(/[.,]/g, '[.,]?') + '(?![.,]?\\d)', 'g'))) {
        const intorno = testo.slice(Math.max(0, m.index! - 70), m.index! + 70).toLowerCase();
        const extra = ['reparto', 'ward', 'contemporaneamente', 'simultaneously', 'al giorno', 'per day', 'italia', 'spagna', 'italy', 'spain', 'europa', 'europe'].find(w => intorno.includes(w) && !base.includes(w));
        if (extra) { problemi.push(`numero aziendale «${num}» usato in un contesto che il dato non contiene («${extra}»): riportalo com'è`); break; }
      }
    }
    if ((g.numeri_aziendali_usati || []).length > 2) problemi.push(`${g.numeri_aziendali_usati.length} numeri aziendali (massimo 2)`);
    // episodi non forniti: domande ricevute, feedback, "oggi siamo a…" (ammessi solo se l'autore li ha scritti nelle istruzioni)
    const ep = testo.match(/(una delle domande più frequenti|spesso ci (?:chiedono|domandano)|mi (?:chiedono|domandano) spesso|quel feedback|ci porta oggi|oggi siamo a|often (?:asked|ask|encounter|hear)|a question I (?:often|frequently)|comes up (?:consistently|again and again|every time)|I always (?:share|tell|say|answer)|every time we (?:meet|present|talk)|quell'esperienza|ci chiedono sempre|ci viene chiest[oa] spesso|last week we|ieri (?:in|al|a) reparto)/i);
    if (ep && !String(body.istruzioni || '').trim()) problemi.push(`episodio non presente nelle fonti («${ep[0]}»): scrivi una riflessione, non un fatto accaduto`);
    return { problemi, testo };
  };

  let g: any = null, esito: any = null;
  const inizio = Date.now();
  try {
    try { g = await chiama(prompt, 70000); }
    catch (e1) { if (!/non valida/.test(String(e1))) throw e1; g = await chiama(prompt, 60000); }
    if (!g?.aperture?.length || !g.corpo) return json({ error: 'Risposta AI incompleta' }, 502);
    esito = controlla(g);
    if (esito.problemi.length && Date.now() - inizio < 60000) {
      // un secondo tentativo con i problemi da correggere
      const g2 = await chiama(`${prompt}\n\nLA VERSIONE PRECEDENTE AVEVA QUESTI PROBLEMI, CORREGGILI:\n- ${esito.problemi.join('\n- ')}\n\nVERSIONE PRECEDENTE:\n${esito.testo}`, 135000 - (Date.now() - inizio));
      if (g2?.aperture?.length && g2.corpo) { const e2 = controlla(g2); if (e2.problemi.length <= esito.problemi.length) { g = g2; esito = e2; } }
    }
  } catch (e) {
    await db.from('sync_log').insert({ job: 'genera-bozza', ok: false, dettagli: { fase: g ? 'secondo tentativo' : 'primo tentativo', secondi: Math.round((Date.now() - inizio) / 1000), errore: String(e).slice(0, 300), prompt_caratteri: prompt.length, sistema_caratteri: sistema.length, problemi: esito?.problemi } });
    if (!(g?.aperture?.length && g.corpo && esito)) // se è scaduto solo il secondo tentativo, tengo il primo
      return json({ error: /timeout|abort/i.test(String(e)) ? "L'AI ci sta mettendo troppo: riprova" : String((e as Error).message || e) }, 502);
  }

  let testo = esito.testo.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (inglese) testo = testo.replace(/(\d)\.(\d{3})(?!\d)/g, '$1,$2');   // 30.000 → 30,000 nei post in inglese

  // numeri: ognuno deve stare nelle fonti o nei numeri aziendali
  const base = [studi.map(f => `${f.titolo} ${f.testo}`).join(' '), (facts || []).map(f => f.valore).join(' ')].join(' ').replace(/(\d)[.,](\d{3})/g, '$1$2');
  const numeri = [...new Set((testo.match(/\d+(?:[.,]\d+)?\s?%?/g) || []).map(n => n.trim()))].filter(n => !/^(19|20)\d\d$/.test(n));
  const daVerificare = numeri.filter(n => { const x = n.replace('%', '').trim(); return !base.includes(x) && !base.includes(x.replace(',', '.')) && !base.includes(x.replace('.', ',')) && !base.includes(x.replace(/[.,]/g, '')); });
  const claim = (g.claim || []).map((c: any) => ({ ...c, stato: c.fonte_url ? 'fonte citata' : 'DA VERIFICARE' }));
  const usati = (g.numeri_aziendali_usati || []).filter((k: string) => (facts || []).some(f => f.chiave === k));
  const provvisori = (facts || []).filter(f => usati.includes(f.chiave) && f.stato === 'provvisorio');

  const avvisi = [
    ...esito.problemi.map(p => `controllo: ${p}`),
    ...daVerificare.map(n => `numero "${n}" senza fonte`),
    ...claim.filter((c: any) => c.stato !== 'fonte citata').map((c: any) => `«${c.frase}»`),
    ...provvisori.map(f => `numero provvisorio: ${f.etichetta} = ${f.valore}`),
  ];
  const nota = avvisi.length ? `DA VERIFICARE prima di pubblicare: ${avvisi.join('; ')}` : null;

  const generazione = {
    versione: 3, modello: MODEL, lingua: inglese ? 'en' : 'it', esplorazione, apertura_provata: esplorazione ? aperturaDaProvare : null,
    fonti_usate: fonti.map(f => ({ id: f.id, titolo: f.titolo, url: f.url })),
    numeri_aziendali_usati: usati, numeri_valori: Object.fromEntries(usati.map((k: string) => [k, (facts || []).find(f => f.chiave === k)?.valore])), controlli: esito.problemi, claim, numeri_da_verificare: daVerificare,
    creato_da: meId, creato_il: new Date().toISOString(),
  };
  if (g.grafica?.modello === 'carosello' && (g.grafica.slide || []).length < 3) g.grafica.modello = g.grafica.numero ? 'numero' : 'frase';   // carosello senza slide: non è un carosello
  const grafica = { ...(g.grafica || {}), stile: ['scientifico', 'friendly'].includes(g.grafica?.stile) ? g.grafica.stile : (autore.stile_grafico || 'friendly') };

  const { data: post, error } = await db.from('posts').insert({
    member_id: autoreId, origine: 'nuovo', stato: 'da_rivedere',
    titolo: (g.tema || g.aperture[0].testo).slice(0, 120), tema: g.tema,
    testo, testo_generato: testo, testo_originale: testo,
    commento: (() => {
      const citati = studi.filter(f => f.verificato && (testo.includes(f.verificato.primo) || (g.fonti || []).some((x: any) => x.url && x.url === f.url)));
      return citati.length ? (inglese ? 'Sources:\n' : 'Fonti:\n') + citati.map(f => f.verificato.citazione).join('\n') : (g.primo_commento || null);
    })(),
    fonti: (g.fonti || []).map((f: any) => f.url ? `${f.testo} (${f.url})` : f.testo).join(' · '),
    hook_formula: g.aperture[0].tipo,
    ganci_opzioni: g.aperture.map((a: any) => { const t = togliGrassetto(a.testo).trim(); return { formula: a.tipo, md: t, uni: t }; }),
    vis: { grafica, versioni: [grafica], titolo: grafica.titolo, sottotitolo: grafica.sottotitolo || '', kicker: (g.tema || '').toUpperCase().slice(0, 40), tema_breve: (g.tema || '').toUpperCase().slice(0, 40), punti: (grafica.slide || []).map((s: any) => s.titolo).concat(['', '', '']).slice(0, Math.max(3, (grafica.slide || []).length)), metrica_val: grafica.numero || '', metrica_lbl: grafica.etichetta_numero || '', citazione: grafica.fonte_breve || '', kpi: [] },
    formato: grafica.modello === 'carosello' ? 'carosello' : 'immagini', note: nota, generazione,
    scheduled_at: body.scheduled_at || null, updated_by: meId,
  }).select().single();
  if (error) return json({ error: error.message }, 500);
  await db.from('sync_log').insert({ job: 'genera-bozza', ok: true, dettagli: { post: post.id, autore: autoreId, controlli: esito.problemi.length } });
  return json({ ok: true, post });
});
