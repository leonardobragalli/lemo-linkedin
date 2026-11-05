// Ponte tra il Pannello di Matteo e la piattaforma condivisa:
// login → stato del team da Supabase → avvio del Pannello originale → schede aggiuntive.
import { createRoot } from 'react-dom/client';
import { supabase, supabaseUrl, supabaseKey } from '../supabase.js';
import { caricaStatoIniziale, salvaStato, ascoltaStato, telemetria } from './sync.js';
import OVERRIDE from './override.pannello.js?raw';
import Login from '../components/Login.jsx';
import Extra from './Extra.jsx';
import './lemo-x.css';

function schermo(html) {
  let el = document.getElementById('lemo-gate');
  if (!el) { el = document.createElement('div'); el.id = 'lemo-gate'; el.className = 'lemo-x'; document.body.appendChild(el); }
  if (html != null) el.innerHTML = html;
  return el;
}

async function sessione() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function avvia() {
  document.documentElement.classList.add('lemo-attesa');
  schermo('<div class="center muted">Caricamento…</div>');
  let s = await sessione();
  if (!s) {
    const root = createRoot(schermo(''));
    root.render(<Login />);
    supabase.auth.onAuthStateChange((_e, nuova) => { if (nuova) location.reload(); });
    return;
  }
  const email = (s.user.email || '').toLowerCase();
  const { data: me } = await supabase.from('team_members').select('*').ilike('email', email).maybeSingle();
  if (!me) {
    schermo(`<div class="center col"><p>L'email ${email} non è nel team.</p><button class="btn" id="lemo-esci">Esci</button></div>`);
    document.getElementById('lemo-esci').onclick = () => supabase.auth.signOut().then(() => location.reload());
    return;
  }
  // Pagina leggera pubblica: scarica il Pannello dallo spazio privato e lo apre
  if (!document.getElementById('lemo-main')) { await apriPannello(s); return; }

  try {
    await caricaStatoIniziale(me.id);
  } catch (e) {
    schermo(`<div class="center col"><p>Non riesco a caricare i dati del team: ${String(e.message || e)}</p><button class="btn" id="lemo-retry">Riprova</button></div>`);
    const btn = document.getElementById('lemo-retry');
    if (btn) btn.onclick = () => location.reload();
    return;
  }
  try { if (!localStorage.getItem('lemons-active-prof')) localStorage.setItem('lemons-active-prof', me.id); } catch { /* niente */ }

  const main = document.getElementById('lemo-main').textContent;
  const ver = main.match(/const TELEMETRY_SCHEMA_VER = '([^']+)'/)?.[1];
  if (ver) { try { localStorage.setItem('lemons-telemetry-ver', ver); } catch { /* niente */ } }
  const sc = document.createElement('script');
  sc.text = main + '\n;\n' + OVERRIDE + '\ninizializzaMultiProfilo();collegaAssetStore();\n';
  document.body.appendChild(sc);

  document.getElementById('lemo-gate')?.remove();
  document.documentElement.classList.remove('lemo-attesa');
  if (!me.is_admin) document.querySelectorAll('[data-tab="impostazioni"]').forEach(b => b.remove());

  const top = document.querySelector('.topbar');
  if (top && !top.querySelector('.lemo-account')) {
    const box = document.createElement('div');
    box.className = 'lemo-x lemo-account';
    box.innerHTML = `<span class="lemo-live" title="Aggiornamento in tempo reale"></span><span class="lemo-chi"></span><button class="lemo-esci" type="button">Esci</button>`;
    box.querySelector('.lemo-chi').textContent = me.nome_breve || me.nome;
    box.querySelector('.lemo-esci').onclick = () => supabase.auth.signOut().then(() => location.reload());
    top.appendChild(box);
  }
  if (!document.getElementById('lemo-avviso')) {
    const av = document.createElement('div');
    av.id = 'lemo-avviso'; av.className = 'lemo-x lemo-avviso'; av.hidden = true;
    document.body.appendChild(av);
  }

  const host = document.createElement('div');
  host.className = 'lemo-x';
  document.body.appendChild(host);
  createRoot(host).render(<Extra session={s} />);
}

async function decodificaPannelloBlob(blob) {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  const isGzip = head.length === 2 && head[0] === 0x1f && head[1] === 0x8b;
  if (isGzip && typeof DecompressionStream !== 'undefined') {
    return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  return blob.text();
}

async function apriPannello(s) {
  const FILE = 'pannello.html.gz';
  const el = schermo('<div class="center col"><div class="big">🍋</div><p class="muted" id="lemo-prog">Apro il Pannello…</p></div>');
  const prog = t => { const p = el.querySelector('#lemo-prog'); if (p) p.textContent = t; };
  try {
    const { data: info, error: e1 } = await supabase.storage.from('pannello').list('', { search: FILE });
    if (e1) throw e1;
    const meta = (info || []).find(x => x.name === FILE);
    if (!meta) throw new Error('Pannello non ancora pubblicato');
    const versione = (meta.metadata?.eTag || '') + (meta.updated_at || '');
    const chiave = `${location.origin}/__lemo_pannello/${encodeURIComponent(versione)}`;
    let blob = null;
    let cache = null;
    try { cache = await caches.open('lemo-pannello'); const hit = await cache.match(chiave); if (hit) blob = await hit.blob(); } catch { /* niente cache */ }
    if (!blob) {
      const r = await fetch(`${supabaseUrl}/storage/v1/object/authenticated/pannello/${FILE}`, { headers: { Authorization: 'Bearer ' + s.access_token, apikey: supabaseKey } });
      if (!r.ok) throw new Error(`download ${r.status}`);
      const tot = Number(r.headers.get('content-length')) || meta.metadata?.size || 0;
      const reader = r.body.getReader(); const parti = []; let letti = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parti.push(value); letti += value.length;
        prog(`Scarico il Pannello${tot ? ` · ${Math.round(letti / tot * 100)}%` : ''} (solo alla prima apertura o quando viene aggiornato)`);
      }
      blob = new Blob(parti);
      if (cache) {
        try {
          for (const k of await cache.keys()) await cache.delete(k);
          await cache.put(chiave, new Response(blob));
        } catch { /* spazio pieno */ }
      }
    }
    prog('Apro il Pannello…');
    const html = await decodificaPannelloBlob(blob);
    try { supabase.removeAllChannels(); } catch { /* niente */ }
    document.open(); document.write(html); document.close();
  } catch (e) {
    schermo(`<div class="center col"><p>Non riesco ad aprire il Pannello: ${String(e.message || e)}</p><button class="btn" id="lemo-retry-dl">Riprova</button></div>`);
    const btn = document.getElementById('lemo-retry-dl');
    if (btn) btn.onclick = () => location.reload();
  }
}

window.LEMO = { avvia, salvaStato, ascoltaStato, telemetria };
