# lemo-linkedin — Regia LinkedIn del team Lemons in the room

App web (React + Vite) per pianificare, rivedere e tracciare i post LinkedIn dei 10 profili del team.
Dati e accessi su Supabase (progetto `lemo-linkedin`, ref `qpufcekagamvpubosisj`), hosting Vercel.

- Accesso: link via email, solo indirizzi presenti in `team_members`.
- Permessi (RLS): tutti leggono tutto; ognuno modifica i propri post e metriche; gli admin tutto.
- Tempo reale: Supabase Realtime su `posts`, `post_metrics`, `member_metrics`, `team_members`.
- Grafica colleghi: `src/lib/cards.js` (generatore SVG del pannello v7.3 di Matteo Era). Tavole di Matteo in `public/img/matteo/`.
- Analisi: `src/lib/insights.js` (indice = interazioni / mediana dell'autore; gruppi < 5 post non generano suggerimenti).

Nessun segreto nel repo: la chiave Supabase nel codice è quella pubblicabile.
