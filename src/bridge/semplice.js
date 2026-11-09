// Vista semplice del Pannello: rinomina e riordina le schede, semplifica la pagina iniziale,
// aggiunge ai post del calendario «Rigenera testo», «Versione precedente», «Grafica nuova» e «Altro».
// Le azioni vere stanno in Extra.jsx (window.__lemoApp), qui solo il DOM del Pannello.
import './semplice.css';

const NOMI = { post: 'Calendario', ai: 'Nuovo post', storico: 'Statistiche', impostazioni: '⚙ Impostazioni' };
const NOMI_MOB = { post: 'Calendario', ai: 'Nuovo', storico: 'Statistiche', impostazioni: '⚙' };

export function vistaSemplice() {
  try { return localStorage.getItem('lemo-vista') !== 'completa'; } catch { return true; }
}
export function impostaVista(semplice) {
  try { localStorage.setItem('lemo-vista', semplice ? 'semplice' : 'completa'); } catch { /* niente */ }
  location.reload();
}

const app = () => window.__lemoApp;
const pan = () => window.__lemoPannello;

function rinominaSchede() {
  const nav = document.querySelector('.nav-seg');
  if (nav) {
    for (const [id, nome] of Object.entries(NOMI)) {
      const b = nav.querySelector(`.tab-btn[data-tab="${id}"]`);
      if (b && b.textContent !== nome) b.textContent = nome;
    }
    const ai = nav.querySelector('.tab-btn[data-tab="ai"]'), sto = nav.querySelector('.tab-btn[data-tab="storico"]');
    if (ai && sto && ai.nextElementSibling !== sto) nav.insertBefore(ai, sto);
    const imp = nav.querySelector('.tab-btn[data-tab="impostazioni"]');
    if (imp && imp !== nav.lastElementChild) nav.appendChild(imp);
  }
  const mob = document.querySelector('.mob-nav');
  if (mob) {
    for (const [id, nome] of Object.entries(NOMI_MOB)) {
      const sp = mob.querySelector(`[data-tab="${id}"] span`);
      if (sp && sp.textContent !== nome) sp.textContent = nome;
    }
    const ai = mob.querySelector('[data-tab="ai"]'), sto = mob.querySelector('[data-tab="storico"]');
    if (ai && sto && ai.nextElementSibling !== sto) mob.insertBefore(ai, sto);
  }
}

function bottone(testo, titolo, onClick, cls = '') {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'lemo-btn-pan ' + cls; b.textContent = testo; if (titolo) b.title = titolo;
  b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(b); });
  return b;
}

// Pulsanti della piattaforma dentro un post del calendario (il Pannello ridisegna i post: si rimettono ogni volta)
function sistemaPost(sec) {
  const pid = sec.id.slice(1);
  const prof = pan()?.profiloAttivo();
  if (!prof || !app()) return;
  const puo = app().puo(prof);

  const dock = sec.querySelector('.action-dock');
  if (dock) {
    for (const b of dock.querySelectorAll('button.sm')) {
      const oc = b.getAttribute('onclick') || '';
      if (/scartaPostNonMiPiace|archiviaPostSubito/.test(oc)) b.classList.add('lemo-in-altro');
    }
    const main = dock.querySelector('button.main');
    if (main && main.textContent !== 'Copia e pubblica ↗') { main.textContent = 'Copia e pubblica ↗'; main.title = 'Copia il testo, scarica le immagini e apre LinkedIn'; }
    if (!dock.querySelector('[data-lemo="altro"]')) {
      const b = bottone('Altro ▾', 'Aperture alternative, «Non mi piace», «Già pubblicato», coordinamento con i colleghi', () => {
        sec.classList.toggle('lemo-altro-aperto');
        b.textContent = sec.classList.contains('lemo-altro-aperto') ? 'Altro ▴' : 'Altro ▾';
      });
      b.dataset.lemo = 'altro';
      dock.appendChild(b);
    }
  }

  const ed = sec.querySelector('.li-ed-btns');
  if (ed && puo && !ed.querySelector('[data-lemo="rigenera"]')) {
    const msg = document.createElement('span'); msg.className = 'lemo-msg-pan'; msg.dataset.lemo = 'msg';
    const rig = bottone('🔄 Rigenera testo', "L'AI riscrive il post sullo stesso tema; la versione attuale resta recuperabile", async b => {
      if (!confirm('Riscrivere questo post con l\'AI? La versione attuale resta recuperabile con «↩ Precedente».')) return;
      b.disabled = true; b.textContent = 'Riscrivo… (10-40 s)'; msg.textContent = ''; msg.className = 'lemo-msg-pan';
      const r = await app().rigeneraTesto(prof, pid);
      b.disabled = false; b.textContent = '🔄 Rigenera testo';
      if (r?.errore) { msg.textContent = r.errore; msg.className = 'lemo-msg-pan err'; }
    });
    rig.dataset.lemo = 'rigenera';
    const n = app().quantePrecedenti(prof, pid);
    const prec = bottone(`↩ Precedente${n ? ` (${n})` : ''}`, 'Torna alla versione precedente del testo (premendo di nuovo si torna avanti)', async () => {
      const r = await app().versionePrecedente(prof, pid);
      if (r?.errore) { msg.textContent = r.errore; msg.className = 'lemo-msg-pan err'; }
    });
    prec.dataset.lemo = 'precedente';
    if (!n) prec.style.display = 'none';
    ed.append(rig, prec, msg);
  }

  const mh = sec.querySelector('.media-head');
  if (mh && !mh.querySelector('[data-lemo="grafica"]')) {
    const g = bottone('🎨 Grafiche nuove', 'Stile vecchio, Friendly e Scientifico, rigenerabili', () => app().apriGrafica(prof, pid), 'pri');
    g.dataset.lemo = 'grafica';
    mh.appendChild(g);
  }
}

let tPost = null;
function sistemaTuttiIPost() {
  clearTimeout(tPost);
  tPost = setTimeout(() => {
    document.querySelectorAll('#posts-container section.post').forEach(sec => { try { sistemaPost(sec); } catch (e) { console.warn('[Regia] post', e); } });
  }, 120);
}

// Pagina iniziale: ruoli aggiornati, data del prossimo post, apertura diretta del proprio profilo
export function aggiornaSplash() {
  const a = app(); if (!a) return;
  document.querySelectorAll('.prof-sel-card[data-prof]').forEach(card => {
    const id = card.dataset.prof;
    const ruolo = a.ruolo(id);
    const r = card.querySelector('.ps-role');
    if (r && ruolo && r.textContent !== ruolo) r.textContent = ruolo;
    if (!document.documentElement.classList.contains('lemo-semplice')) return;
    const cta = card.querySelector('.ps-cta');
    if (!cta) return;
    let p = cta.querySelector('.lemo-prossimo');
    if (!p) { p = document.createElement('span'); p.className = 'lemo-prossimo'; cta.insertBefore(p, cta.firstChild); }
    const t = a.prossimo(id);
    p.textContent = t ? `Prossimo post: ${t}` : 'Nessun post in programma';
    const go = card.querySelector('.ps-cta-go');
    if (go && go.textContent !== 'Apri →') go.textContent = 'Apri →';
  });
}

let apertoProprio = false;
function apriProprioProfilo(me) {
  if (apertoProprio) return;
  apertoProprio = true;
  const card = document.querySelector(`.prof-sel-card[data-prof="${me.id}"]`);
  const splash = document.getElementById('splash');
  if (card && splash && typeof window.scegliProfiloDaSplash === 'function') {
    try { window.scegliProfiloDaSplash(me.id); } catch (e) { console.warn('[Regia] apertura profilo', e); }
  }
}

export function attivaSemplice(me) {
  if (!vistaSemplice()) return;
  document.documentElement.classList.add('lemo-semplice');
  rinominaSchede();
  const nav = document.querySelector('.nav-seg');
  if (nav) new MutationObserver(() => rinominaSchede()).observe(nav, { childList: true, subtree: true, characterData: true });
  const pc = document.getElementById('posts-container');
  if (pc) new MutationObserver(muts => {
    // ignoro le modifiche fatte da me (pulsanti aggiunti) per non entrare in un ciclo
    if (muts.every(m => [...m.addedNodes].every(n => n.nodeType === 1 && (n.dataset?.lemo || n.classList?.contains('lemo-btn-pan'))))) return;
    sistemaTuttiIPost();
  }).observe(pc, { childList: true, subtree: true });
  sistemaTuttiIPost();
  // la vista elenco del Pannello mostra la colonna con tutti i post: in vista semplice si usa la striscia in alto
  setTimeout(() => apriProprioProfilo(me), 300);
}

export function aggiornaPulsantiPost() { sistemaTuttiIPost(); }
// i pulsanti «Precedente» mostrano il numero di versioni: li ricreo quando cambiano i dati
export function rinfrescaPulsantiPost() {
  document.querySelectorAll('#posts-container [data-lemo="rigenera"],#posts-container [data-lemo="precedente"],#posts-container [data-lemo="msg"]').forEach(x => x.remove());
  sistemaTuttiIPost();
}
