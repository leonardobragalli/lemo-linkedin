// Grafiche nuove (Brandbook Lemons, dic 2025) disegnate nel browser con <canvas>.
// Due stili: «friendly» (arancio/crema + limone) e «scientifico» (lilla/nero/viola, logo nero, niente limone).
// Modelli: frase, numero, carosello (copertina + slide + chiusura facoltativa), foto cornice, foto piena (solo friendly, solo con foto caricata).
// Regole fisse: mai nome/foto/ruolo dell'autore, logo grande in basso a destra, punti del carosello in basso a sinistra,
// numero grande nelle slide solo se TUTTE le slide sono numerate.
import { asset } from './util.js';

const W = 1080, H = 1350, SCALA = 2;            // 4:5, esportato a 2160×2700
const C = { arancio: '#FF8731', marrone: '#4F1D00', crema: '#FFF5EE', lilla: '#F8F6FF', viola: '#8756FA', nero: '#03091B', bianco: '#FFFFFF' };
const RECO = 'LemoReco', RUNDE = 'LemoRunde';

let pronti = null;
const IMG = {};
function carica(src) {
  return new Promise((ok, ko) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = ko; im.src = src; });
}
export function caricaBrand() {
  if (!pronti) {
    const fonti = [[RECO, '700', 'reco-700'], [RECO, '600', 'reco-600'], [RUNDE, '400', 'runde-400'], [RUNDE, '500', 'runde-500'], [RUNDE, '600', 'runde-600'], [RUNDE, '700', 'runde-700']];
    pronti = Promise.all([
      ...fonti.map(([fam, w, f]) => new FontFace(fam, `url(${asset(`brand/${f}.woff2`)})`, { weight: w }).load().then(ff => document.fonts.add(ff))),
      ...['logo_white', 'logo_black', 'logo_orange', 'limone_saluto', 'limone_poltrona'].map(n => carica(asset(`brand/${n}.png`)).then(im => { IMG[n] = im; })),
    ]);
  }
  return pronti;
}

// ── testo ──────────────────────────────────────────────────────────────────
const pulisci = s => String(s || '').replace(/\s+/g, ' ').trim();
// parole con il flag "accento" per la parola chiave (case-insensitive, prima occorrenza)
function parole(testo, chiave) {
  const t = pulisci(testo); const k = pulisci(chiave);
  const i = k ? t.toLowerCase().indexOf(k.toLowerCase()) : -1;
  const out = [];
  let pos = 0;
  for (const w of t.split(' ').filter(Boolean)) {
    const a = t.indexOf(w, pos); pos = a + w.length;
    out.push({ t: w, acc: i >= 0 && a < i + k.length && a + w.length > i });
  }
  return out;
}
function righe(ctx, ws, maxW) {
  const out = []; let cur = [];
  for (const w of ws) {
    const prova = [...cur, w];
    if (cur.length && ctx.measureText(prova.map(x => x.t).join(' ')).width > maxW) { out.push(cur); cur = [w]; } else cur = prova;
  }
  if (cur.length) out.push(cur);
  return out;
}
// sceglie la dimensione più grande che fa stare il testo in maxW × maxH (e al massimo maxRighe)
function adatta(ctx, ws, { font, peso, da, a = 28, maxW, maxH, maxRighe = 99, lh = 1.06 }) {
  for (let s = da; s >= a; s -= 2) {
    ctx.font = `${peso} ${s}px ${font}`;
    const r = righe(ctx, ws, maxW);
    const largaOk = r.every(l => ctx.measureText(l.map(x => x.t).join(' ')).width <= maxW);
    if (r.length <= maxRighe && r.length * s * lh <= maxH && largaOk) return { s, r, lh };
  }
  ctx.font = `${peso} ${a}px ${font}`;
  return { s: a, r: righe(ctx, ws, maxW).slice(0, maxRighe), lh };
}
// scrive il blocco e restituisce la y sotto l'ultima riga
function scrivi(ctx, testo, chiave, x, y, opz) {
  const ws = parole(testo, chiave);
  if (!ws.length) return y;
  const { s, r, lh } = adatta(ctx, ws, opz);
  ctx.font = `${opz.peso} ${s}px ${opz.font}`;
  ctx.textBaseline = 'alphabetic';
  let yy = y + s * 0.86;
  for (const l of r) {
    let xx = x;
    for (let i = 0; i < l.length; i++) {
      const w = l[i].t + (i < l.length - 1 ? ' ' : '');
      ctx.fillStyle = l[i].acc ? (opz.accento || opz.colore) : opz.colore;
      ctx.fillText(w, xx, yy);
      xx += ctx.measureText(w).width;
    }
    yy += s * lh;
  }
  return yy - s * lh + s * 0.25;
}
function rett(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ── elementi fissi ─────────────────────────────────────────────────────────
function logo(ctx, colore, larg = 380) {
  const im = IMG['logo_' + colore]; if (!im) return;
  const h = larg * im.height / im.width;
  ctx.drawImage(im, W - 80 - larg, H - 72 - h, larg, h);
}
function punti(ctx, n, on, accesoCol, spentoCol) {
  let x = 90; const y = H - 108 - 22;
  for (let i = 0; i < n; i++) {
    const w = i === on ? 66 : 22;
    ctx.fillStyle = i === on ? accesoCol : spentoCol; rett(ctx, x, y, w, 22, 11); ctx.fill();
    x += w + 14;
  }
}
function limone(ctx, nome, x, y, larg) {
  const im = IMG[nome]; if (!im) return;
  ctx.drawImage(im, x, y, larg, larg * im.height / im.width);
}
function etichetta(ctx, testo, x, y, colore) {
  ctx.font = `700 26px ${RUNDE}`; ctx.fillStyle = colore;
  let t = pulisci(testo).toUpperCase();
  if (t.length > 42) t = t.slice(0, 42).replace(/\s+\S*$/, '').replace(/[\s,;:·-]+$/, '').replace(/\s+(AND|OR|THE|OF|TO|FOR|IN|E|O|DI|DEL|DELLA|DEI|DEGLI|PER|CON|NEI|NEL|NELLA|A|IL|LA|LE|GLI|UN|UNA)$/, '');
  let xx = x; for (const ch of t) { ctx.fillText(ch, xx, y + 22); xx += ctx.measureText(ch).width + 3.6; }
}
function riferimento(ctx, testo, x, yBase, maxW, colore, righeMax = 3) {
  ctx.font = `500 25px ${RUNDE}`; ctx.fillStyle = colore;
  const r = righe(ctx, parole(testo, ''), maxW).slice(0, righeMax);
  r.forEach((l, i) => ctx.fillText(l.map(x => x.t).join(' '), x, yBase - (r.length - 1 - i) * 36));
}
function fondo(ctx, col) { ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); }
function coprenteFoto(ctx, im, x, y, w, h, fy = 0.3) {
  const s = Math.max(w / im.width, h / im.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(im, (im.width - sw) * 0.5, (im.height - sh) * fy, sw, sh, x, y, w, h);
}

// ── stile ─────────────────────────────────────────────────────────────────
function tema(stile) {
  return stile === 'scientifico'
    ? { sfondo: C.lilla, testo: C.nero, accento: C.viola, logo: 'black', puntoOn: C.viola, puntoOff: 'rgba(3,9,27,.18)', rif: 'rgba(3,9,27,.7)', limone: false }
    : { sfondo: C.crema, testo: C.marrone, accento: C.arancio, logo: 'orange', puntoOn: C.arancio, puntoOff: 'rgba(79,29,0,.22)', rif: 'rgba(79,29,0,.75)', limone: true };
}

// ── modelli ───────────────────────────────────────────────────────────────
function frase(ctx, g, st, ctxPost) {
  const T = tema(st);
  fondo(ctx, T.sfondo);
  let y = 150;
  if (st === 'scientifico') { etichetta(ctx, g.etichetta || ctxPost.tema, 90, 96, T.accento); y = 190; }
  y = scrivi(ctx, g.titolo, g.parola_chiave, 90, y, { font: RECO, peso: 700, da: 118, a: 64, maxW: 900, maxH: 520, maxRighe: 5, colore: T.testo, accento: T.accento });
  if (g.sottotitolo) scrivi(ctx, g.sottotitolo, '', 90, y + 50, { font: RUNDE, peso: 500, da: 44, a: 32, maxW: 840, maxH: 260, maxRighe: 5, lh: 1.38, colore: T.testo });
  if (T.limone) limone(ctx, 'limone_saluto', 70, H - 40 - 300, 300);
  else if (ctxPost.riferimento) riferimento(ctx, ctxPost.riferimento, 90, H - 200, 560, T.rif);
  logo(ctx, T.logo);
}

function numero(ctx, g, st, ctxPost) {
  if (st === 'scientifico') {
    const T = tema(st);
    fondo(ctx, T.sfondo);
    etichetta(ctx, g.etichetta || ctxPost.tema, 90, 96, T.accento);
    const y = scrivi(ctx, g.numero, g.numero, 90, 170, { font: RECO, peso: 700, da: 300, a: 140, maxW: 900, maxH: 300, maxRighe: 1, lh: 0.9, colore: T.accento, accento: T.accento });
    scrivi(ctx, g.etichetta_numero || g.titolo, '', 90, y + 50, { font: RECO, peso: 700, da: 76, a: 44, maxW: 900, maxH: 420, maxRighe: 5, colore: T.testo });
    if (ctxPost.riferimento) riferimento(ctx, ctxPost.riferimento, 90, H - 200, 560, T.rif);
    logo(ctx, T.logo, 330);
    return;
  }
  fondo(ctx, C.arancio);
  const y = scrivi(ctx, g.numero, '', 90, 150, { font: RECO, peso: 700, da: 400, a: 160, maxW: 900, maxH: 380, maxRighe: 1, lh: 0.9, colore: C.bianco });
  const y2 = scrivi(ctx, g.etichetta_numero || g.titolo, g.parola_chiave, 90, y + 60, { font: RECO, peso: 700, da: 80, a: 46, maxW: 880, maxH: 380, maxRighe: 5, colore: C.marrone, accento: C.bianco });
  if (g.fonte_breve || ctxPost.riferimento) scrivi(ctx, g.fonte_breve || ctxPost.riferimento, '', 90, y2 + 40, { font: RUNDE, peso: 500, da: 28, a: 22, maxW: 520, maxH: 130, maxRighe: 3, lh: 1.4, colore: 'rgba(79,29,0,.85)' });
  logo(ctx, 'white');
}

function caroselloCopertina(ctx, g, st, ctxPost, n) {
  const T = tema(st);
  fondo(ctx, T.sfondo);
  let y = 70;
  if (st === 'scientifico') { etichetta(ctx, g.etichetta || ctxPost.tema, 90, 96, T.accento); y = 230; }
  y = scrivi(ctx, g.titolo, g.parola_chiave, 90, y, { font: RECO, peso: 700, da: 110, a: 60, maxW: 900, maxH: T.limone ? 470 : 560, maxRighe: 5, colore: T.testo, accento: T.accento });
  if (g.sottotitolo) scrivi(ctx, T.limone ? `(${g.sottotitolo.replace(/^\(|\)$/g, '')})` : g.sottotitolo, '', 90, y + 34, { font: RUNDE, peso: 500, da: 40, a: 30, maxW: T.limone ? 470 : 820, maxH: 300, maxRighe: 6, lh: 1.38, colore: T.limone ? 'rgba(79,29,0,.8)' : 'rgba(3,9,27,.75)' });
  if (T.limone) limone(ctx, 'limone_poltrona', W - 70 - 420, H - 210 - 430, 420);
  punti(ctx, n, 0, T.puntoOn, T.puntoOff);
  logo(ctx, T.logo, st === 'scientifico' ? 330 : 380);
}
function caroselloSlide(ctx, s, i, numerate, st, ctxPost, n) {
  const T = tema(st);
  fondo(ctx, T.sfondo);
  let y = st === 'scientifico' ? 150 : 110;
  if (st === 'scientifico') etichetta(ctx, ctxPost.tema, 90, 96, T.accento);
  if (numerate) y = scrivi(ctx, String(s.numero || i + 1), '', 90, y - 20, { font: RECO, peso: 700, da: 300, a: 200, maxW: 600, maxH: 260, maxRighe: 1, lh: 0.85, colore: T.accento }) + 30;
  else if (s.numero) y = scrivi(ctx, s.numero, '', 90, y, { font: RECO, peso: 700, da: 220, a: 120, maxW: 900, maxH: 230, maxRighe: 1, lh: 0.9, colore: T.accento }) + 30;
  y = scrivi(ctx, s.titolo, '', 90, y, { font: RECO, peso: 700, da: 104, a: 56, maxW: 900, maxH: 420, maxRighe: 4, colore: T.testo });
  if (s.testo) scrivi(ctx, s.testo, '', 90, y + 50, { font: RUNDE, peso: 500, da: 48, a: 30, maxW: 860, maxH: H - 260 - (y + 50), maxRighe: 8, lh: 1.38, colore: T.testo });
  const rifSlide = st === 'scientifico' && (ctxPost.riferimenti || []).find(r => r.autore && `${s.titolo} ${s.testo}`.includes(r.autore));
  if (rifSlide) riferimento(ctx, rifSlide.breve, 90, H - 175, 560, T.rif, 2);
  punti(ctx, n, i + 1, T.puntoOn, T.puntoOff);
  logo(ctx, T.logo, st === 'scientifico' ? 330 : 380);
}
function caroselloChiusura(ctx, g, st, n, en) {
  const T = tema(st);
  fondo(ctx, C.lilla);
  const y = scrivi(ctx, g.domanda_finale, '', 90, 150, { font: RECO, peso: 700, da: 100, a: 56, maxW: T.limone ? 900 : 900, maxH: 560, maxRighe: 6, colore: st === 'scientifico' ? C.nero : C.marrone, accento: T.accento });
  scrivi(ctx, en ? 'Tell us in the comments.' : 'Scrivetelo nei commenti.', '', 90, y + 50, { font: RUNDE, peso: 500, da: 44, a: 36, maxW: 600, maxH: 120, maxRighe: 2, lh: 1.38, colore: st === 'scientifico' ? C.nero : C.marrone });
  if (T.limone) limone(ctx, 'limone_saluto', W - 90 - 330, H - 200 - 330, 330);
  punti(ctx, n, n - 1, T.puntoOn, T.puntoOff);
  logo(ctx, T.logo, st === 'scientifico' ? 330 : 380);
}

function fotoCornice(ctx, g, foto) {
  fondo(ctx, C.arancio);
  ctx.save();
  ctx.translate(540, 440); ctx.rotate(-2 * Math.PI / 180); ctx.translate(-450, -350);
  ctx.shadowColor = 'rgba(79,29,0,.55)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 40;
  rett(ctx, 0, 0, 900, 700, 56); ctx.fillStyle = C.crema; ctx.fill();
  ctx.shadowColor = 'transparent';
  rett(ctx, 0, 0, 900, 700, 56); ctx.clip();
  coprenteFoto(ctx, foto, 0, 0, 900, 700);
  ctx.restore();
  const grande = g.numero || '';
  let y = 850;
  if (grande) y = scrivi(ctx, grande, '', 90, y, { font: RECO, peso: 700, da: 170, a: 100, maxW: 900, maxH: 170, maxRighe: 1, lh: 0.9, colore: C.bianco }) + 22;
  y = scrivi(ctx, grande ? (g.etichetta_numero || g.titolo) : g.titolo, grande ? '' : g.parola_chiave, 90, y, { font: RECO, peso: 700, da: grande ? 62 : 84, a: 40, maxW: 900, maxH: grande ? 220 : 330, maxRighe: 4, colore: C.marrone, accento: C.bianco });
  if (g.fonte_breve) scrivi(ctx, g.fonte_breve, '', 90, y + 18, { font: RUNDE, peso: 500, da: 28, a: 22, maxW: 520, maxH: 90, maxRighe: 2, lh: 1.4, colore: 'rgba(79,29,0,.85)' });
  logo(ctx, 'white', 320);
}
function fotoPiena(ctx, g, foto) {
  coprenteFoto(ctx, foto, 0, 0, W, H, 0);
  const gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0.5, 'rgba(79,29,0,0)'); gr.addColorStop(0.7, 'rgba(79,29,0,.8)'); gr.addColorStop(1, 'rgba(50,18,0,.96)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // il testo sta nel terzo inferiore: misuro prima l'altezza e lo appoggio sopra il logo
  const grande = g.numero || '';
  const blocchi = [];
  if (grande) blocchi.push([grande, '', { font: RECO, peso: 700, da: 190, a: 110, maxW: 900, maxH: 190, maxRighe: 1, lh: 0.9, colore: C.arancio }, 18]);
  blocchi.push([grande ? (g.etichetta_numero || g.titolo) : g.titolo, grande ? '' : g.parola_chiave, { font: RECO, peso: 700, da: grande ? 60 : 80, a: 40, maxW: 900, maxH: 260, maxRighe: 4, colore: C.bianco, accento: C.arancio }, 20]);
  if (g.fonte_breve) blocchi.push([g.fonte_breve, '', { font: RUNDE, peso: 500, da: 28, a: 22, maxW: 560, maxH: 90, maxRighe: 2, lh: 1.4, colore: 'rgba(255,255,255,.85)' }, 0]);
  let alt = 0;
  for (const [t, k, o, gap] of blocchi) { const r = adatta(ctx, parole(t, k), o); alt += r.r.length * r.s * r.lh + gap; }
  let y = H - 170 - alt;
  for (const [t, k, o, gap] of blocchi) y = scrivi(ctx, t, k, 90, y, o) + gap;
  logo(ctx, 'white', 340);
}

// ── API ───────────────────────────────────────────────────────────────────
function tela() {
  const c = document.createElement('canvas'); c.width = W * SCALA; c.height = H * SCALA;
  const ctx = c.getContext('2d'); ctx.scale(SCALA, SCALA);
  return [c, ctx];
}
const blob = (c, mime) => new Promise(r => c.toBlob(r, mime, 0.92));

// riferimenti brevi per lo stile scientifico, dal primo commento (fonti già verificate su PubMed)
export function riferimentiDa(post) {
  return String(post.commento || '').split('\n').map(s => s.trim()).filter(s => s && !/^(fonti|sources):?$/i.test(s)).map(riga => {
    const doi = riga.match(/doi:\s*(\S+?)\.?(\s|$)/i)?.[1];
    const primo = riga.split(/\.\s/)[0].split(',')[0].trim();
    const autore = primo.split(' ')[0];
    const anno = riga.match(/\b(19|20)\d\d\b/)?.[0];
    const rivista = (riga.match(/\.\s([^.]{3,40})\.\s(?:19|20)\d\d/)?.[1] || '').trim();
    return { autore, breve: [primo && `${primo} et al.`, rivista, anno].filter(Boolean).join(', ') + (doi ? ` · doi:${doi}` : '') };
  });
}
export function riferimentoDa(post) {
  return riferimentiDa(post)[0]?.breve || post.vis?.grafica?.fonte_breve || '';
}

// Restituisce [{nome, url, blob}] per uno stile. modello: frase|numero|carosello|foto
export async function grafichePost(post, { stile, modello, foto, conChiusura = true } = {}) {
  await caricaBrand();
  const g = { ...(post.vis?.grafica || {}) };
  if (!g.titolo) g.titolo = post.vis?.titolo || post.titolo || '';
  let m = modello || g.modello || 'frase';
  if (m === 'numero' && !g.numero) m = 'frase';
  if (m === 'carosello' && !(g.slide || []).length) m = 'frase';
  if (m === 'foto' && !foto) m = g.numero ? 'numero' : 'frase';
  if (m === 'foto' && stile === 'scientifico') m = g.numero ? 'numero' : 'frase';   // la foto è solo nello stile friendly
  const riferimenti = riferimentiDa(post);
  // riferimento della tavola singola: lo studio citato nel titolo/numero, altrimenti il primo
  const testoTavola = `${g.titolo} ${g.etichetta_numero || ''} ${g.fonte_breve || ''}`;
  const ctxPost = { tema: g.etichetta || post.tema || '', riferimenti, riferimento: riferimenti.find(r => r.autore && testoTavola.includes(r.autore))?.breve || g.fonte_breve || '' };
  const pref = stile === 'scientifico' ? 'Scientifico' : 'Friendly';
  const out = [];
  const aggiungi = async (nome, disegna, mime = 'image/png') => {
    const [c, ctx] = tela(); disegna(ctx);
    const b = await blob(c, mime);
    out.push({ nome: `${pref}_${nome}.${mime === 'image/png' ? 'png' : 'jpg'}`, url: URL.createObjectURL(b), blob: b });
  };
  if (m === 'frase') await aggiungi('frase', ctx => frase(ctx, g, stile, ctxPost));
  else if (m === 'numero') await aggiungi('numero', ctx => numero(ctx, g, stile, ctxPost));
  else if (m === 'foto') {
    await aggiungi('foto_cornice', ctx => fotoCornice(ctx, g, foto), 'image/jpeg');
    await aggiungi('foto_piena', ctx => fotoPiena(ctx, g, foto), 'image/jpeg');
  } else {
    let sl = (g.slide || []).slice(0, 8).map(x => ({ ...x }));
    // elenco numerato «1. Titolo» su TUTTE le slide → numero grande; altrimenti nessun numero
    if (sl.length > 1 && sl.every(x => /^\s*\d{1,2}[.)]\s+/.test(x.titolo || ''))) sl = sl.map(x => ({ ...x, numero: x.titolo.match(/\d{1,2}/)[0], titolo: x.titolo.replace(/^\s*\d{1,2}[.)]\s+/, '') }));
    const numerate = sl.length > 1 && sl.every(s => /^\d{1,2}$/.test(String(s.numero || '').trim()));
    const finale = conChiusura && g.domanda_finale;
    const n = 1 + sl.length + (finale ? 1 : 0);
    await aggiungi('01_copertina', ctx => caroselloCopertina(ctx, g, stile, ctxPost, n));
    for (let i = 0; i < sl.length; i++) await aggiungi(`${String(i + 2).padStart(2, '0')}_slide`, ctx => caroselloSlide(ctx, sl[i], i, numerate, stile, ctxPost, n));
    if (finale) await aggiungi(`${String(n).padStart(2, '0')}_chiusura_facoltativa`, ctx => caroselloChiusura(ctx, g, stile, n, post.generazione?.lingua === 'en'));
  }
  return { modello: m, immagini: out };
}

// PDF del carosello (LinkedIn «documento»): una pagina per immagine, scritto a mano per non aggiungere librerie.
export async function pdfDaImmagini(immagini) {
  const pagine = [];
  for (const im of immagini) {
    const bmp = await createImageBitmap(im.blob);
    const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    const j = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    pagine.push({ w: bmp.width, h: bmp.height, dati: new Uint8Array(await j.arrayBuffer()) });
  }
  const enc = new TextEncoder(); const parti = []; const offs = []; let len = 0;
  const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parti.push(b); len += b.length; };
  const obj = (id, corpo) => { offs[id] = len; push(`${id} 0 obj\n`); corpo(); push('\nendobj\n'); };
  const PW = 540, PH = 675;   // punti (4:5)
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = pagine.length; const kids = pagine.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
  pagine.forEach((p, i) => {
    const pid = 3 + i * 3, iid = pid + 1, cid = pid + 2;
    obj(pid, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im${i} ${iid} 0 R >> >> /Contents ${cid} 0 R >>`));
    obj(iid, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.dati.length} >>\nstream\n`); push(p.dati); push('\nendstream'); });
    const s = `q ${PW} 0 0 ${PH} 0 0 cm /Im${i} Do Q`;
    obj(cid, () => push(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`));
  });
  const xref = len; const tot = 3 + n * 3;
  push(`xref\n0 ${tot}\n0000000000 65535 f \n`);
  for (let i = 1; i < tot; i++) push(`${String(offs[i]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${tot} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const b = new Blob(parti, { type: 'application/pdf' });
  return { nome: 'carosello.pdf', url: URL.createObjectURL(b), blob: b, pdf: true };
}
