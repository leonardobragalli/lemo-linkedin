// Utility di testo, date e immagini condivise.

export const BASE = import.meta.env.BASE_URL || '/';
export const asset = p => BASE + String(p).replace(/^[/]+/, '');
export const avatar = id => asset(`avatars/${id}.jpg`);

export const TZ = 'Europe/Rome';
export const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const GIORNI_LUNGHI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const STATI = {
  da_rivedere: { label: 'Da rivedere', color: '#B45309', bg: '#FEF3C7' },
  approvato:   { label: 'Approvato',   color: '#1D4ED8', bg: '#DBEAFE' },
  pubblicato:  { label: 'Pubblicato',  color: '#047857', bg: '#D1FAE5' },
  scartato:    { label: 'Scartato',    color: '#6B7280', bg: '#F3F4F6' },
};

// ── Testo per LinkedIn (dal pannello originale) ──────────────────
export function normalizzaTestoPuro(t) {
  return (t || '').replace(/\r\n/g, '\n').replace(/\u2800/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
export function formattaPerLinkedIn(t) {
  const puro = normalizzaTestoPuro(t);
  if (!puro.includes('\n')) return puro;
  return puro.split('\n').map(r => (r.trim() === '' ? '\u2800' : r)).join('\n');
}

// Grassetto Unicode (LinkedIn non supporta il markdown)
const BOLD_UP = 0x1d5d4, BOLD_LO = 0x1d5ee, BOLD_DG = 0x1d7ec;
export function toBold(s) {
  return [...s].map(ch => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(BOLD_UP + c - 65);
    if (c >= 97 && c <= 122) return String.fromCodePoint(BOLD_LO + c - 97);
    if (c >= 48 && c <= 57) return String.fromCodePoint(BOLD_DG + c - 48);
    return ch;
  }).join('');
}
export function fromBold(s) {
  return [...s].map(ch => {
    const c = ch.codePointAt(0);
    if (c >= BOLD_UP && c < BOLD_UP + 26) return String.fromCharCode(65 + c - BOLD_UP);
    if (c >= BOLD_LO && c < BOLD_LO + 26) return String.fromCharCode(97 + c - BOLD_LO);
    if (c >= BOLD_DG && c < BOLD_DG + 10) return String.fromCharCode(48 + c - BOLD_DG);
    // corsivo sans (𝘢…) usato in alcuni post
    if (c >= 0x1d608 && c < 0x1d608 + 26) return String.fromCharCode(65 + c - 0x1d608);
    if (c >= 0x1d622 && c < 0x1d622 + 26) return String.fromCharCode(97 + c - 0x1d622);
    return ch;
  }).join('');
}
export const isBold = s => [...s].some(ch => { const c = ch.codePointAt(0); return c >= BOLD_UP && c < BOLD_DG + 10; });

export function primaRiga(t) {
  return fromBold(normalizzaTestoPuro(t).split('\n')[0] || '');
}

// ── Date (sempre ora di Roma) ───────────────────────────────────
export function partiRoma(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('it-IT', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  const dow = new Date(Date.UTC(+p.year, +p.month - 1, +p.day)).getUTCDay();
  return { y: +p.year, m: +p.month, d: +p.day, hh: p.hour === '24' ? '00' : p.hour, mm: p.minute, dow, ymd: `${p.year}-${p.month}-${p.day}` };
}
export function fmtData(iso, conOra = true) {
  const p = partiRoma(iso);
  if (!p) return '—';
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${GIORNI[p.dow]} ${p.d} ${mesi[p.m - 1]}${conOra ? ` · ${p.hh}:${p.mm}` : ''}`;
}
// "2026-10-30" + "14:30" (ora di Roma) → ISO UTC
export function romaToIso(ymd, hm) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, mi] = (hm || '09:00').split(':').map(Number);
  let guess = Date.UTC(y, m - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const p = partiRoma(new Date(guess).toISOString());
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, +p.hh, +p.mm);
    guess += Date.UTC(y, m - 1, d, h, mi) - asUtc;
  }
  return new Date(guess).toISOString();
}
export function lunediDi(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() - ((dow + 6) % 7));
  return dt.toISOString().slice(0, 10);
}
export function addGiorni(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export const oggiYmd = () => partiRoma(new Date().toISOString()).ymd;

// ── URN LinkedIn ─────────────────────────────────────────────────
export function estraiUrn(url) {
  const m = String(url || '').match(/urn:li:(activity|share|ugcPost):\d+/) || String(url || '').match(/(activity|share|ugcPost)[-:](\d{15,})/);
  if (!m) return null;
  if (m[0].startsWith('urn:')) return m[0];
  return `urn:li:${m[1]}:${m[2]}`;
}
export function dataDaUrn(urn) {
  const m = String(urn || '').match(/(\d{15,})$/);
  if (!m) return null;
  const ms = Number(BigInt(m[1]) >> 22n);
  return new Date(ms).toISOString();
}

// ── Immagini di Matteo (pre-renderizzate) ───────────────────────
export function immaginiMatteo(post) {
  if (!post.immagine) return [];
  const base = post.immagine.replace(/\.png$/, '');
  if (post.slot === '04') {
    const slides = Array.from({ length: 7 }, (_, i) => ({ nome: `Post04_slide_${i + 1}.jpg`, url: asset(`img/matteo/04_slide_${i + 1}.jpg`) }));
    return [{ nome: 'Post04_carosello.pdf', url: asset('img/matteo/04_scala_carosello.pdf'), pdf: true }, ...slides];
  }
  return [
    { nome: `Post${post.slot}_1_copertina_UHD.jpg`, url: asset(`img/matteo/${base}_copertina.jpg`) },
    { nome: `Post${post.slot}_2_scheda_UHD.png`, url: asset(`img/matteo/${base}.png`) },
  ];
}

export function scaricaUrl(url, nome) {
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
}
