// Prepara il Pannello di Matteo per la piattaforma condivisa.
// Parte dal file ORIGINALE (pannello/Pannello_originale.html) e applica solo interventi minimi,
// ognuno verificato (deve trovare il punto esatto una sola volta). Output: privato/pannello.html
// (NON pubblico: contiene email del team, rete clinica e motore inviti → va nello spazio privato con scripts/pubblica-pannello.mjs)
//
//  1. carica il "ponte" (login, sincronizzazione Supabase, statistiche, schede aggiuntive)
//  2. il codice principale del Pannello parte DOPO il login e dopo aver caricato lo stato condiviso
//  3. schede aggiuntive nella barra: Bozze AI, Cosa sta imparando, Collega LinkedIn, Impostazioni
//  4. "Lemons in the room" con la r minuscola
//  5. ruoli aggiornati (Leonardo, Sofia, Alessandro Romagnosi) come sui loro profili LinkedIn
//  6. nel comando .command scaricato, tolta la chiamata al demone locale 127.0.0.1:18765 (correzione di Matteo)
// Tutto il resto del Pannello resta identico.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(root, 'pannello', 'Pannello_originale.html');
const OUT = path.join(root, 'privato', 'pannello.html');

let s = fs.readFileSync(SRC, 'utf8');

function sostituisci(cerca, metti, descr) {
  const n = s.split(cerca).length - 1;
  if (n !== 1) throw new Error(`[prepara-pannello] "${descr}": trovato ${n} volte (atteso 1). Il Pannello originale è cambiato?`);
  s = s.replace(cerca, () => metti);
}

// 1. Ponte
sostituisci('</head>',
  '<meta name="robots" content="noindex, nofollow">\n<link rel="stylesheet" href="assets/lemo-bridge.css">\n<script src="assets/lemo-bridge.js"></script>\n</head>',
  'fine head');

// 2. Codice principale: non parte subito, lo avvia il ponte dopo login + stato condiviso
sostituisci('<script>\nconst MESI', '<script type="text/plain" id="lemo-main">\nconst MESI', 'inizio codice principale');
sostituisci('<script>inizializzaMultiProfilo();collegaAssetStore();</script>', '<script>LEMO.avvia();</script>', 'avvio');

// 3. Schede aggiuntive
const EXTRA = [
  ['ai', 'Bozze AI', 'AI'],
  ['impara', 'Cosa sta imparando', 'Impara'],
  ['collega', 'Collega LinkedIn', 'Collega'],
  ['impostazioni', 'Impostazioni', 'Admin'],
];
sostituisci(
  `onclick="cambiaTab('strategia', this)">Rete &amp; Collegamenti</button>`,
  `onclick="cambiaTab('strategia', this)">Rete &amp; Collegamenti</button>\n` +
    EXTRA.map(([id, l]) => `      <button class="tab-btn lemo-tab" data-tab="${id}" onclick="cambiaTab('${id}', this)">${l}</button>`).join('\n'),
  'barra schede');
sostituisci(
  `onclick="cambiaTab('strategia', this)"><span>Rete</span></button>`,
  `onclick="cambiaTab('strategia', this)"><span>Rete</span></button>` +
    EXTRA.map(([id, , breve]) => `<button class="lemo-tab" data-tab="${id}" onclick="cambiaTab('${id}', this)"><span>${breve}</span></button>`).join(''),
  'barra mobile');
sostituisci('<nav class="mob-nav">',
  EXTRA.map(([id]) => `    <div id="tab-${id}" class="tab-pane"><div class="lemo-x lemo-pane" id="lemo-pane-${id}"></div></div>`).join('\n') + '\n    <nav class="mob-nav">',
  'pannelli schede');

// 5. Ruoli aggiornati (profili LinkedIn, 5 nov 2026). Nel file i "·" sono scritti come ·
function sostituisciTutte(cerca, metti, descr, attese) {
  const n = s.split(cerca).length - 1;
  if (n !== attese) throw new Error(`[prepara-pannello] "${descr}": trovato ${n} volte (atteso ${attese}). Il Pannello originale è cambiato?`);
  s = s.split(cerca).join(metti);
}
const P = '\\u00b7';
sostituisci(`"ruolo": "Ingegnere ${P} Operations & Hospital Fleet Management @ Lemons in the Room", "reparto": "Operations & Fleet Logistics"`,
  `"ruolo": "BizOps Engineer @ Lemons in the Room", "reparto": "BizOps & Operations"`, 'ruolo Leonardo');
sostituisci(`"headline_it": "Ingegnere ${P} Operations @ Lemons in the Room`, `"headline_it": "BizOps Engineer @ Lemons in the Room`, 'headline IT Leonardo');
sostituisci(`"headline_en": "Engineer ${P} Operations @ Lemons in the Room`, `"headline_en": "BizOps Engineer @ Lemons in the Room`, 'headline EN Leonardo');
sostituisciTutte('Social Media & PR Manager @ Lemons in the Room', 'Marketing Manager @ Lemons in the Room', 'ruolo Sofia', 3);
sostituisci(`"ruolo": "Dottore in Economia ${P} Customer Success & Hospital Onboarding @ Lemons in the Room", "reparto": "Customer Success & Formazione"`,
  `"ruolo": "Dottore in Economia ${P} Growth & International Expansion @ Lemons in the Room", "reparto": "Growth & International Expansion"`, 'ruolo A. Romagnosi');
sostituisci(`"headline_it": "Dottore in Economia ${P} Customer Success @ Lemons in the Room`, `"headline_it": "Dottore in Economia ${P} Growth & International Expansion @ Lemons in the Room`, 'headline IT A. Romagnosi');
sostituisci(`"headline_en": "Economics Graduate ${P} Customer Success @ Lemons in the Room`, `"headline_en": "Economics Graduate ${P} Growth & International Expansion @ Lemons in the Room`, 'headline EN A. Romagnosi');

// 6. Comando .command: niente chiamata al demone locale
sostituisci(`'curl -s "http://127.0.0.1:18765/api/prepare-command?cat=all&open=0" >/dev/null 2>&1 || true',`, `'# Telemetria su Supabase (piattaforma online)',`, 'curl demone nel .command');

// 4. Nome azienda
const prima = s.split('Lemons in the Room').length - 1;
s = s.split('Lemons in the Room').join('Lemons in the room');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, s);
console.log(`[prepara-pannello] ok · ${(s.length / 1e6).toFixed(1)} MB · "Room"→"room": ${prima}`);
