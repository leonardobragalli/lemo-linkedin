// ==UserScript==
// @name         LEMO · Regia LinkedIn (statistiche dei miei post)
// @namespace    https://github.com/leonardobragalli/lemo-linkedin
// @version      0.1.0
// @description  Legge SOLO le statistiche dei tuoi post quando apri LinkedIn e le manda alla Regia LinkedIn del team. Nessuna azione su LinkedIn.
// @match        https://www.linkedin.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @connect      qpufcekagamvpubosisj.supabase.co
// @updateURL    https://leonardobragalli.github.io/lemo-linkedin/lemo-linkedin.user.js
// @downloadURL  https://leonardobragalli.github.io/lemo-linkedin/lemo-linkedin.user.js
// ==/UserScript==

(function () {
  'use strict';
  const PARSER = '0.1.0';
  const ENDPOINT = 'https://qpufcekagamvpubosisj.supabase.co/functions/v1/ingest-linkedin';
  const ORE_TRA_GIRI = 12;
  const MAX_POST = 12;

  // ── Compatibilità Tampermonkey (Chrome) / Userscripts (Safari) ──
  const gmGet = async (k, d) => (typeof GM !== 'undefined' && GM.getValue ? GM.getValue(k, d) : GM_getValue(k, d));
  const gmSet = async (k, v) => (typeof GM !== 'undefined' && GM.setValue ? GM.setValue(k, v) : GM_setValue(k, v));
  function post(body, token) {
    return new Promise((resolve, reject) => {
      const req = typeof GM !== 'undefined' && GM.xmlHttpRequest ? GM.xmlHttpRequest : GM_xmlhttpRequest;
      req({
        method: 'POST', url: ENDPOINT, data: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json', 'x-lemo-token': token },
        onload: r => { try { const j = JSON.parse(r.responseText); r.status < 300 ? resolve(j) : reject(new Error(j.error || r.status)); } catch (e) { reject(e); } },
        onerror: () => reject(new Error('rete')),
      });
    });
  }
  const pausa = (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

  // ── Parser (testato su pagine reali in italiano; inglese best-effort) ──
  const LABELS = {
    impressions: { prima: ['Impressioni', 'Impressions'] },
    members_reached: { prima: ['Membri raggiunti', 'Utenti raggiunti', 'Members reached'] },
    followers_gained: { prima: ['Follower acquisiti da questo post', 'Followers gained from this post'] },
    reactions: { dopo: ['Reazioni', 'Reactions'] },
    comments: { dopo: ['Commenti', 'Comments'] },
    reposts: { dopo: ['Diffusioni del post', 'Diffusioni', 'Reposts'] },
    saves: { dopo: ['Salvataggi', 'Saves'] },
    clicks: { dopo: ['Clic sul link', 'Link clicks'] },
  };
  const num = s => {
    const t = String(s || '').trim();
    if (!/^[\d.,\s]+(k|mila)?$/i.test(t)) return null;
    let v = t.replace(/\s/g, '');
    if (/k|mila/i.test(v)) return Math.round(parseFloat(v.replace(/k|mila/i, '').replace(',', '.')) * 1000);
    v = v.replace(/[.,](?=\d{3}(\D|$))/g, '');
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  function parseStatistiche(testo) {
    const righe = String(testo).split('\n').map(x => x.trim()).filter(Boolean);
    const out = {};
    for (const [k, def] of Object.entries(LABELS)) {
      for (const lab of [...(def.prima || []), ...(def.dopo || [])]) {
        const i = righe.findIndex(r => r === lab);
        if (i < 0) continue;
        const prima = def.prima && def.prima.includes(lab);
        const v = prima ? num(righe[i - 1]) : num(righe[i + 1]);
        if (v != null) { out[k] = v; break; }
      }
    }
    // autore e testo del post: "Ecco cosa ha pubblicato <Nome> • <tempo>" seguito dal testo
    const iAut = righe.findIndex(r => /^(Ecco cosa ha pubblicato|Here's what .* posted)/i.test(r));
    let testoPost = '';
    if (iAut >= 0) {
      const fine = righe.findIndex((r, j) => j > iAut && /^(Scoperta|Discovery)$/.test(r));
      testoPost = righe.slice(iAut + 1, fine > 0 ? fine : iAut + 30).join('\n');
    }
    return { metriche: out, testo: testoPost, autore_ok: iAut >= 0 };
  }
  function parseFollower(testo) {
    const righe = String(testo).split('\n').map(x => x.trim()).filter(Boolean);
    const i = righe.findIndex(r => r === 'Follower' || r === 'Followers');
    return i >= 0 ? num(righe[i + 1]) : null;
  }
  const verificaRichiesta = (url, testo) => /checkpoint|challenge|authwall|login/.test(url) || /captcha|verifica di sicurezza|security verification/i.test(testo.slice(0, 3000));

  // Carica una pagina LinkedIn in un iframe nascosto (stessa sessione, nessuna azione) e ne legge il testo.
  function leggiPagina(url, attesa = 7000) {
    return new Promise(resolve => {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-3000px;top:0;width:1300px;height:900px;opacity:0;pointer-events:none;';
      f.src = url;
      let fatto = false;
      const chiudi = (r) => { if (fatto) return; fatto = true; setTimeout(() => f.remove(), 50); resolve(r); };
      f.onload = async () => {
        await pausa(attesa, attesa + 2500);
        try {
          const d = f.contentDocument;
          for (let i = 0; i < 3; i++) { d.defaultView.scrollBy(0, 1400); await pausa(900, 1500); }
          chiudi({ url: d.location.href, testo: d.body.innerText || '', html: d.documentElement.innerHTML || '' });
        } catch (e) { chiudi({ url, testo: '', html: '', errore: String(e) }); }
      };
      setTimeout(() => chiudi({ url, testo: '', html: '', errore: 'timeout' }), 45000);
      document.body.appendChild(f);
    });
  }

  // ── Codice di collegamento (una volta sola) ──
  async function chiediCodice() {
    if (document.getElementById('lemo-codice')) return;
    const box = document.createElement('div');
    box.id = 'lemo-codice';
    box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;background:#FFF4ED;border:1px solid #F0DCCB;border-radius:12px;padding:12px;font:13px system-ui;color:#2A1407;box-shadow:0 6px 24px rgba(0,0,0,.15);width:300px';
    box.innerHTML = '<b>🍋 Regia LinkedIn</b><div style="margin:6px 0">Incolla il codice di collegamento (lo trovi nella Regia → «Collega LinkedIn»).</div><input style="width:100%;padding:6px;border:1px solid #ccc;border-radius:6px" placeholder="lemo_…"><div style="display:flex;gap:6px;margin-top:8px"><button>Salva</button><button>Più tardi</button></div><div class="m" style="margin-top:6px;color:#B91C1C"></div>';
    const [salva, dopo] = box.querySelectorAll('button');
    salva.onclick = async () => {
      const v = box.querySelector('input').value.trim();
      if (!/^lemo_[0-9a-f]{48}$/.test(v)) { box.querySelector('.m').textContent = 'Codice non valido'; return; }
      await gmSet('lemo_token', v); box.remove(); avvia(true);
    };
    dopo.onclick = async () => { await gmSet('lemo_rimanda', Date.now()); box.remove(); };
    document.body.appendChild(box);
  }

  async function avvia(forza = false) {
    const token = await gmGet('lemo_token', '');
    if (!token) {
      const rim = await gmGet('lemo_rimanda', 0);
      if (Date.now() - rim > 24 * 36e5) chiediCodice();
      return;
    }
    const ultimo = await gmGet('lemo_ultimo_giro', 0);
    if (!forza && Date.now() - ultimo < ORE_TRA_GIRI * 36e5) return;
    if (await gmGet('lemo_in_corso', 0) > Date.now() - 10 * 60e3) return;   // un'altra scheda sta già lavorando
    await gmSet('lemo_in_corso', Date.now());
    const errori = [];
    try {
      await pausa(15000, 30000);   // lascia lavorare la persona: si parte dopo un po'
      const att = await leggiPagina('https://www.linkedin.com/in/me/recent-activity/all/');
      if (verificaRichiesta(att.url, att.testo)) throw new Error('LinkedIn chiede una verifica: mi fermo');
      const followers = parseFollower(att.testo);
      const urns = [...new Set([...att.html.matchAll(/urn:li:activity:(\d{15,})/g)].map(m => 'urn:li:activity:' + m[1]))];
      const piano = await post({ azione: 'piano', urns }, token);
      const posts = [];
      for (const urn of (piano.da_leggere || []).slice(0, MAX_POST)) {
        await pausa(4000, 9000);
        const p = await leggiPagina(`https://www.linkedin.com/analytics/post-summary/${urn}/`);
        if (verificaRichiesta(p.url, p.testo)) { errori.push('verifica richiesta: interrotto'); break; }
        if (p.errore) { errori.push(p.errore); continue; }
        if (!/post-summary/.test(p.url)) continue;             // non è un tuo post (diffusione o non accessibile)
        const s = parseStatistiche(p.testo);
        if (!s.autore_ok) continue;
        if (!Object.keys(s.metriche).length) { errori.push('nessun numero letto per ' + urn); continue; }
        posts.push({ urn, testo: s.testo.slice(0, 1500), metriche: s.metriche });
      }
      await post({ azione: 'dati', parser_version: PARSER, followers, posts, errori }, token);
      await gmSet('lemo_ultimo_giro', Date.now());
    } catch (e) {
      try { await post({ azione: 'dati', parser_version: PARSER, posts: [], errori: [...errori, String(e.message || e)] }, token); } catch { /* offline */ }
      if (/verifica/.test(String(e))) await gmSet('lemo_ultimo_giro', Date.now() + 36 * 36e5);   // pausa lunga
    } finally {
      await gmSet('lemo_in_corso', 0);
    }
  }

  if (typeof module !== 'undefined') { module.exports = { parseStatistiche, parseFollower, num }; return; }
  avvia();
})();
