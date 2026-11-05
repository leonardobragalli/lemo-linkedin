// Stato condiviso del Pannello su Supabase (una riga per chiave) + statistiche per il formato del Pannello.
import { supabase } from '../supabase.js';

// Stessa regola del Pannello (isChiaveCondivisa)
export function isChiaveCondivisa(k) {
  return !!k && (
    k.startsWith('pubblicato-') || k.startsWith('archiviato-subito-') || k.startsWith('ripristinato-') ||
    k.startsWith('scartato-globale-') || k === 'feedback-negativo-generatore' || k.startsWith('slot-prog-') ||
    k.startsWith('testo-post-') || k.startsWith('stats-post-') || k.startsWith('stats-meta-') ||
    k.startsWith('rete-collegati-') || k.startsWith('chk-'));
}
const protetta = k => k.startsWith('stats-meta-') || k.startsWith('stats-post-');   // mai cancellate da remoto (come nel Pannello)

let remoto = {};          // copia completa dello stato condiviso sul server
let meId = null;
let codaSalva = null;
let ultimoStato = null;
let ultimoMotivo = '';

export async function caricaStatoIniziale(id) {
  meId = id;
  const tutte = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await supabase.from('pannello_stato').select('chiave,valore').range(da, da + 999);
    if (error) throw error;
    tutte.push(...data);
    if (data.length < 1000) break;
  }
  remoto = Object.fromEntries(tutte.map(r => [r.chiave, r.valore]));
  // allinea il localStorage di questo browser allo stato del team
  const via = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (isChiaveCondivisa(k) && !(k in remoto) && !protetta(k)) via.push(k);
  }
  via.forEach(k => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(remoto)) localStorage.setItem(k, v);
  return Object.keys(remoto).length;
}

// Chiamata dal Pannello a ogni modifica: invia solo le differenze (raggruppate in 400 ms)
export function salvaStato(state, motivo) {
  ultimoStato = state; ultimoMotivo = motivo;
  clearTimeout(codaSalva);
  codaSalva = setTimeout(invia, 400);
}

async function invia() {
  const state = ultimoStato; if (!state) return;
  const cambiate = Object.entries(state).filter(([k, v]) => remoto[k] !== v);
  let tolte = Object.keys(remoto).filter(k => !(k in state) && !protetta(k));
  // protezione: più cancellazioni insieme solo da un'azione esplicita di ripristino
  if (tolte.length > 3 && !/^reset|ripristin|dislike/.test(ultimoMotivo)) {
    console.warn('[Regia] cancellazione multipla bloccata', ultimoMotivo, tolte);
    tolte = [];
  }
  if (!cambiate.length && !tolte.length) return;
  for (const [k, v] of cambiate) remoto[k] = v;
  for (const k of tolte) delete remoto[k];
  const ora = new Date().toISOString();
  for (let i = 0; i < cambiate.length; i += 200) {
    const { error } = await supabase.from('pannello_stato').upsert(cambiate.slice(i, i + 200).map(([chiave, valore]) => ({ chiave, valore, updated_at: ora, updated_by: meId })));
    if (error) avviso('Salvataggio non riuscito: ' + error.message);
  }
  for (let i = 0; i < tolte.length; i += 200) {
    const { error } = await supabase.from('pannello_stato').delete().in('chiave', tolte.slice(i, i + 200));
    if (error) avviso('Salvataggio non riuscito: ' + error.message);
  }
}

// Modifiche dei colleghi in tempo reale → applicaStatoRemoto del Pannello (con lo stato completo)
export function ascoltaStato(cb) {
  let t = null;
  supabase.channel('pannello-stato')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pannello_stato' }, p => {
      if (p.eventType === 'DELETE') delete remoto[p.old.chiave];
      else remoto[p.new.chiave] = p.new.valore;
      clearTimeout(t);
      t = setTimeout(() => cb({ ...remoto }), 300);
    })
    .subscribe(st => document.documentElement.dataset.lemoLive = st === 'SUBSCRIBED' ? '1' : '0');
}

function avviso(msg) {
  console.warn('[Regia]', msg);
  const el = document.getElementById('lemo-avviso');
  if (el) { el.textContent = msg; el.hidden = false; setTimeout(() => { el.hidden = true; }, 6000); }
}

// ── Statistiche dallo userscript, nel formato che il Pannello legge (INITIAL_LINKEDIN_TELEMETRY) ──
const n = v => (v == null ? 0 : Number(v) || 0);
const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MM = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function quando(iso) {
  if (!iso) return {};
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(d);
  const g = t => p.find(x => x.type === t)?.value;
  const y = g('year'), m = +g('month'), dd = +g('day'), hh = g('hour'), mi = g('minute');
  const dow = new Date(Date.UTC(+y, m - 1, dd)).getUTCDay();
  const data = `${GG[dow]} ${dd} ${MM[m - 1]} ${y}`;
  return { iso: `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, data, ora: `${hh}:${mi}`, when: `${data} · ore ${hh}:${mi}` };
}

export async function telemetria() {
  const [{ data: posts }, { data: mm }] = await Promise.all([
    supabase.from('posts').select('id,member_id,slot,origine,titolo,tema,testo,linkedin_url,linkedin_urn,published_at').eq('stato', 'pubblicato').not('linkedin_urn', 'is', null),
    supabase.from('member_metrics').select('*').order('captured_on', { ascending: false }),
  ]);
  const ids = (posts || []).map(p => p.id);
  const ultime = {};
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await supabase.from('post_metrics').select('*').in('post_id', ids.slice(i, i + 150)).order('captured_at', { ascending: false });
    for (const m of data || []) if (!ultime[m.post_id]) ultime[m.post_id] = m;
  }
  const ora = Date.now();
  const slots_by_prof = {};
  const profiles_meta = {};
  const conDati = new Set();
  for (const p of posts || []) {
    const m = ultime[p.id];
    if (!m || m.fonte !== 'estensione') continue;      // solo dati arrivati dallo script (i vecchi del kit sono già nel Pannello)
    conDati.add(p.member_id);
    const urn = p.linkedin_urn;
    const st = {
      urn, url: p.linkedin_url || `https://www.linkedin.com/feed/update/${urn}/`, analytics_url: `https://www.linkedin.com/analytics/post-summary/${urn}/`,
      impr: n(m.impressions), reach: n(m.members_reached), in_net_pct: 0, out_net_pct: 0, react: n(m.reactions), comm: n(m.comments),
      saves: n(m.saves), saves_only: n(m.saves), reposts_only: n(m.reposts), sends: 0, clicks: n(m.clicks), followers_gained: n(m.followers_gained),
      interazioni_tot: n(m.reactions) + n(m.comments) + n(m.reposts), demographics: [], visitors: [], note: '', updatedAt: new Date(m.captured_at).getTime(),
    };
    if (p.slot && p.origine === 'piano') {
      (slots_by_prof[p.member_id] ||= {})[p.slot] = { ...st, slot_id: p.slot };
    } else {
      const meta = (profiles_meta[p.member_id] ||= { live_posts: [] });
      meta.live_posts.push({ ...st, id: 'R' + p.id.slice(0, 6), titolo: p.titolo || '', tema: p.tema || 'ATTIVITÀ LINKEDIN LIVE', testo: p.testo || '', ...quando(p.published_at) });
    }
  }
  const ultimoPer = {};
  for (const r of mm || []) if (r.fonte === 'estensione' && !ultimoPer[r.member_id]) ultimoPer[r.member_id] = r;
  for (const [id, r] of Object.entries(ultimoPer)) {
    conDati.add(id);
    const meta = (profiles_meta[id] ||= { live_posts: [] });
    Object.assign(meta, { followers: n(r.followers), connections: r.connections ? String(r.connections) : '', profile_views_7d: n(r.profile_views_7d), search_appearances_7d: n(r.search_appearances_7d), syncedAt: new Date(r.created_at).getTime() });
  }
  if (!conDati.size) return null;
  // il Pannello sovrascrive stats-meta: per chi non ha follower nuovi tengo quelli che ha già
  for (const [id, meta] of Object.entries(profiles_meta)) {
    if (meta.followers == null) {
      try { const prev = JSON.parse(localStorage.getItem('stats-meta-' + id) || '{}'); Object.assign(meta, { followers: prev.followers || 0, connections: prev.connections || '', profile_views_7d: prev.profile_views_7d || 0 }); } catch { /* niente */ }
    }
  }
  return { syncedAt: ora, syncedIso: new Date(ora).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }), slots_by_prof, profiles_meta };
}
