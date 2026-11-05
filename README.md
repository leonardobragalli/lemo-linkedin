# lemo-linkedin — Regia LinkedIn del team Lemons in the room

Il **Pannello di Matteo Era** (Kit LinkedIn v7.3) reso condiviso e sempre aggiornato per i 10 profili del team.

- Sito: https://leonardobragalli.github.io/lemo-linkedin/ (pagina leggera: login, poi apre il Pannello)
- Il Pannello è **identico all'originale**. Cambia solo il trasporto dei dati:
  - sincronizzazione del team: broker MQTT pubblico → Supabase (`pannello_stato`, tempo reale), stesse chiavi del Pannello
  - statistiche LinkedIn: demone locale `127.0.0.1:18765` → userscript nel browser di ognuno (`public/lemo-linkedin.user.js`) → Supabase
- Schede aggiunte nella barra del Pannello: **Bozze AI**, **Cosa sta imparando**, **Collega LinkedIn**, **Impostazioni** (admin).

## Come è fatto
| Parte | Dove |
|---|---|
| Pannello originale | `pannello/Pannello_originale.html` — **non nel repo** (email del team, rete clinica, motore inviti) |
| Preparazione | `scripts/prepara-pannello.mjs`: interventi minimi e verificati sull'originale → `privato/pannello.html` |
| Pubblicazione del Pannello | `npm run pubblica-pannello` (codice di pubblicazione in `LEMO_PUBBLICA_ENV`): compresso nello spazio **privato** Supabase `pannello`, leggibile solo dal team dopo il login |
| Ponte | `src/bridge/`: login, download del Pannello (copia locale per versione), avvio, sincronizzazione (`sync.js`), funzioni sostituite (`override.pannello.js`), schede aggiuntive |
| Sito pubblico | `npm run build` → `dist/` (pagina leggera + ponte + asset), GitHub Pages a ogni push su `main` |
| Server | Supabase `qpufcekagamvpubosisj`: tabelle in `supabase/migrations/`, funzioni in `supabase/functions/` |
| Base di conoscenza | Lemons Insights + 6 database Notion, aggiornata ogni giorno da `script-mac/` |

Aggiornare il Pannello (es. nuova versione di Matteo): sostituisci `pannello/Pannello_originale.html`, poi `npm run pubblica-pannello`. Se lo script segnala che un punto non si trova, il file è cambiato e l'intervento va adattato.

Nessun segreto nel repo: la chiave Supabase nel codice è quella pubblicabile.
