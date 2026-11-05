// Prepara il Pannello di Matteo per la piattaforma condivisa.
// Parte dal file ORIGINALE (pannello/Pannello_originale.html) e applica solo interventi minimi,
// ognuno verificato (deve trovare il punto esatto una sola volta). Output: privato/pannello.html
// (NON pubblico: contiene email del team, rete clinica e motore inviti → va nello spazio privato con scripts/pubblica-pannello.mjs)
//
//  1. carica il "ponte" (login, sincronizzazione Supabase, statistiche, schede aggiuntive)
//  2. il codice principale del Pannello parte DOPO il login e dopo aver caricato lo stato condiviso
//  3. schede aggiuntive nella barra: Bozze AI, Cosa sta imparando, Collega LinkedIn, Impostazioni
//  4. "Lemons in the room" con la r minuscola
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

// 4. Nome azienda
const prima = s.split('Lemons in the Room').length - 1;
s = s.split('Lemons in the Room').join('Lemons in the room');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, s);
console.log(`[prepara-pannello] ok · ${(s.length / 1e6).toFixed(1)} MB · "Room"→"room": ${prima}`);
