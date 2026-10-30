// Analisi guidata dai dati. Regola: nessuna conclusione sotto la soglia minima di post.
import { partiRoma, GIORNI_LUNGHI } from './util.js';

export const MIN_GRUPPO = 5;   // post minimi per gruppo per dare un giudizio
export const MIN_BASELINE = 3; // post minimi per calcolare la media di un autore

export function ultimaMetrica(metrics, postId) {
  let best = null;
  for (const m of metrics) if (m.post_id === postId && (!best || m.captured_at > best.captured_at)) best = m;
  return best;
}

export const interazioni = m => (m ? (m.reactions || 0) + (m.comments || 0) + (m.reposts || 0) : null);

function mediana(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const k = Math.floor(s.length / 2);
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}
const media = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function fascia(hh) {
  const h = +hh;
  if (h < 11) return 'Mattina (prima delle 11)';
  if (h < 15) return 'Pranzo (11–15)';
  if (h < 19) return 'Pomeriggio (15–19)';
  return 'Sera (dopo le 19)';
}

// Costruisce una riga per ogni post pubblicato con metriche.
export function righePubblicate(posts, metrics) {
  const rows = [];
  for (const p of posts) {
    if (p.stato !== 'pubblicato') continue;
    const m = ultimaMetrica(metrics, p.id);
    if (!m) continue;
    const when = p.published_at || p.scheduled_at;
    const r = partiRoma(when);
    rows.push({
      post: p, m, member_id: p.member_id,
      eng: interazioni(m),
      impr: m.impressions || null,
      rate: m.impressions ? interazioni(m) / m.impressions : null,
      giorno: r ? GIORNI_LUNGHI[r.dow] : '—',
      dow: r ? r.dow : null,
      fascia: r ? fascia(r.hh) : '—',
      formato: p.formato || '—',
      hook: p.hook_formula || (p.origine === 'storico' ? 'Post precedenti al piano' : '—'),
      origine: p.origine,
    });
  }
  // indice rispetto alla mediana dell'autore (follower molto diversi tra noi)
  const perAutore = {};
  for (const r of rows) (perAutore[r.member_id] ||= []).push(r.eng);
  const base = {};
  for (const [k, v] of Object.entries(perAutore)) base[k] = v.length >= MIN_BASELINE ? mediana(v) : null;
  for (const r of rows) r.indice = base[r.member_id] ? r.eng / base[r.member_id] : null;
  return { rows, base };
}

// Raggruppa per dimensione e dice se c'è abbastanza materiale per un giudizio.
export function perDimensione(rows, dim) {
  const g = {};
  for (const r of rows) if (r.indice != null) (g[r[dim]] ||= []).push(r);
  const gruppi = Object.entries(g).map(([k, v]) => ({
    chiave: k,
    n: v.length,
    indice: media(v.map(x => x.indice)),
    eng: media(v.map(x => x.eng)),
    rate: media(v.filter(x => x.rate != null).map(x => x.rate)),
    nRate: v.filter(x => x.rate != null).length,
    affidabile: v.length >= MIN_GRUPPO,
  })).sort((a, b) => b.indice - a.indice);
  const affidabili = gruppi.filter(x => x.affidabile);
  return { gruppi, giudizio: affidabili.length >= 2 ? { migliore: affidabili[0], peggiore: affidabili[affidabili.length - 1] } : null };
}

export const DIMENSIONI = [
  { key: 'giorno', label: 'Giorno della settimana' },
  { key: 'fascia', label: 'Fascia oraria' },
  { key: 'formato', label: 'Formato' },
  { key: 'hook', label: 'Tipo di apertura (gancio)' },
];

export function suggerimenti(rows) {
  const out = [];
  for (const d of DIMENSIONI) {
    const { giudizio } = perDimensione(rows, d.key);
    if (!giudizio) continue;
    const { migliore, peggiore } = giudizio;
    if (migliore.indice - peggiore.indice < 0.25) continue;
    out.push(`${d.label}: «${migliore.chiave}» rende ${migliore.indice.toFixed(2)}× la media dell'autore (${migliore.n} post) contro ${peggiore.indice.toFixed(2)}× di «${peggiore.chiave}» (${peggiore.n} post).`);
  }
  return out;
}
