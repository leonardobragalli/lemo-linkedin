/* ───────────────────────────────────────────────────────────────────────────
   Regia LinkedIn · integrazione nel Pannello di Matteo (accodato al suo codice, stesso scope).
   Sostituisce SOLO il trasporto:
     - sincronizzazione del team: MQTT pubblico  →  Supabase (tabella pannello_stato, tempo reale)
     - statistiche LinkedIn:      demone locale 127.0.0.1:18765  →  dati dello userscript/DB su Supabase
   Neutralizza inoltre qualsiasi chiamata HTTP residua verso 127.0.0.1:18765 per evitare
   avvisi Private Network Access su Chrome/Safari quando il sito è ospitato online.
   ─────────────────────────────────────────────────────────────────────────── */

(function interceptLocalhostTelemetryCalls() {
  const origFetch = window.fetch;
  if (!origFetch || origFetch.__lemoWrapped) return;
  const wrapped = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.includes('127.0.0.1:18765') || url.includes('localhost:18765')) {
      return Promise.resolve(new Response(JSON.stringify({ ok: true, intercepted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    }
    return origFetch.apply(this, arguments);
  };
  wrapped.__lemoWrapped = true;
  window.fetch = wrapped;
})();

function salvaStatoCloudTeam(motivo){
  if (isApplyingRemoteSync) return;
  const ts = Date.now();
  lastCloudTs = ts;
  const state = raccogliStatoCondivisibile();
  lastStateHash = JSON.stringify(state);
  const payload = { updatedAt: ts, clientId: CLOUD_CLIENT_ID, updatedBy: activeProfId, reason: motivo || 'update', state: state };
  if (CLOUD_BC) { try { CLOUD_BC.postMessage(payload); } catch (e) {} }
  LEMO.salvaStato(state, motivo || 'update');
}

function avviaCloudSyncTeam(){
  lastStateHash = JSON.stringify(raccogliStatoCondivisibile());
  if (CLOUD_BC) {
    CLOUD_BC.onmessage = ev => { if (ev && ev.data) applicaStatoRemoto(ev.data); };
  }
  LEMO.ascoltaStato(state => applicaStatoRemoto({ updatedAt: Date.now(), clientId: 'supabase', updatedBy: 'team', state: state }));
}

function avviaPollingTelemetriaLocale(){
  iniettaTelemetriaIniziale();
  const tira = () => LEMO.telemetria().then(tel => {
    if (!tel) return;
    if (tel.network && window.INITIAL_LINKEDIN_TELEMETRY) {
      window.INITIAL_LINKEDIN_TELEMETRY.network = tel.network;
      try { if (typeof renderStrategiaEDeontologiaLive === 'function') renderStrategiaEDeontologiaLive(); } catch (e) {}
    }
    applicaTelemetriaAutomatica(tel, true);
  }).catch(() => {});
  setTimeout(tira, 600);
  setInterval(tira, 120000);
}

async function forzaSyncTelemetriaLive(btn, targetScope){
  if (btn) { btn.disabled = true; btn.textContent = 'Sincronizzazione…'; }
  try {
    const tel = await LEMO.telemetria();
    if (tel) {
      if (tel.network && window.INITIAL_LINKEDIN_TELEMETRY) {
        window.INITIAL_LINKEDIN_TELEMETRY.network = tel.network;
        try { if (typeof renderStrategiaEDeontologiaLive === 'function') renderStrategiaEDeontologiaLive(); } catch (e) {}
      }
      applicaTelemetriaAutomatica(tel, true);
    }
  } catch (e) {}
  if (btn) {
    btn.disabled = false;
    ok(btn, 'Aggiornato ✓');
    setTimeout(() => { btn.textContent = 'Sincronizza ora ↻'; }, 2200);
  }
}

window.__lemoPannello = {
  profiloAttivo: () => activeProfId,
  profili: () => window.TEAM_PROFILES_LIST || [],
  stato: (profId, prefisso, pid) => { try { return localStorage.getItem(chiaveStorageProf(profId, prefisso, pid)); } catch (e) { return null; } },
  mettiInSlot: (profId, pid, testo) => {
    const pulito = normalizzaTestoPuro(testo).replace(/\s*[—–]\s*/g, ' - ').replace(/[\u200B-\u200D\uFEFF]/g, '');
    localStorage.setItem(chiaveStorageProf(profId, 'testo-post', pid), pulito);
    selezionaProfilo(profId, true, true);
    salvaStatoCloudTeam('ai:' + profId + ':' + pid);
    cambiaTab('post', document.querySelector('.tab-btn[data-tab=post]'));
    try { selezionaPost(pid); } catch (e) {}
  },
  vaiAlCalendario: () => cambiaTab('post', document.querySelector('.tab-btn[data-tab=post]')),
  cambiaTabPannello: (tabId) => {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (typeof cambiaTab === 'function') cambiaTab(tabId, btn);
  },
};
