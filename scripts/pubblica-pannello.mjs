// Pubblica la versione preparata del Pannello (privato/pannello.html) nello spazio privato di Supabase.
// Uso:  npm run pubblica-pannello        (prepara + pubblica)
// Serve il codice di pubblicazione: variabile LEMO_PUBBLICA_TOKEN, oppure LEMO_PUBBLICA_ENV=<file .env che la contiene>.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const URL_SB = 'https://qpufcekagamvpubosisj.supabase.co';
let token = process.env.LEMO_PUBBLICA_TOKEN || '';
if (!token && process.env.LEMO_PUBBLICA_ENV) token = (fs.readFileSync(process.env.LEMO_PUBBLICA_ENV, 'utf8').match(/LEMO_PUBBLICA_TOKEN=(.+)/) || [])[1]?.trim() || '';
if (!token) { console.error('Manca il codice di pubblicazione (LEMO_PUBBLICA_TOKEN o LEMO_PUBBLICA_ENV).'); process.exit(2); }

const html = fs.readFileSync(path.join(root, 'privato', 'pannello.html'));
const gz = zlib.gzipSync(html, { level: 9 });
console.log(`Pannello: ${(html.length / 1e6).toFixed(1)} MB → compresso ${(gz.length / 1e6).toFixed(1)} MB`);
if (gz.length > 50 * 1024 * 1024) { console.error('Troppo grande per lo spazio gratuito (50 MB).'); process.exit(1); }

const r = await fetch(`${URL_SB}/functions/v1/pannello-upload-url`, { method: 'POST', headers: { 'x-lemo-token': token } });
const j = await r.json();
if (!r.ok) { console.error('URL di caricamento non ottenuto:', j.error || r.status); process.exit(1); }
const dest = j.signedUrl.startsWith('http') ? j.signedUrl : URL_SB + '/storage/v1' + j.signedUrl;
const up = await fetch(dest, { method: 'PUT', headers: { 'Content-Type': 'application/gzip', 'x-upsert': 'true', 'cache-control': 'no-cache' }, body: gz });
const t = await up.text();
if (!up.ok) { console.error('Caricamento non riuscito:', up.status, t.slice(0, 300)); process.exit(1); }
console.log('Pubblicato ✓ (gli utenti lo riscaricano automaticamente alla prossima apertura)');
