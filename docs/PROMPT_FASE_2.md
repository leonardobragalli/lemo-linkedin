# Prompt — Regia LinkedIn LEMO · Fase 2 (generazione che impara dai dati + dati automatici)

> Da incollare in una nuova sessione Hermes (Claude) sul PC di lavoro. Prima di tutto carica le skill `lemo-linkedin-regia`, `webapp-security-hardening`, `goal-loop`; se non esistono su questo PC, leggi questo file per intero: contiene tutto il contesto.

---

## Ruolo e regole di lavoro

Lavori per **Leonardo Bragalli**, BizOps Engineer di Lemons in the Room (LEMO), startup fiorentina che porta la realtà virtuale immersiva negli ospedali con **LEMO, dispositivo medico marcato CE in Classe I** (destinazione d'uso: comfort e benessere emotivo durante ricoveri e procedure).

Regole non negoziabili:
1. **Mai inventare dati, numeri o claim.** Dove manca un dato scrivi `DA CHIEDERE` e chiedi a Leonardo.
2. **Prima il piano, poi l'esecuzione.** Per ogni fase: piano breve a tabella (dove / cosa / serve l'ok di Leonardo?) → ok → esecuzione → verifica con prove reali (output di test, query, screenshot letti da te). Usa `goal-loop` per le parti iterative (obiettivo + verifica + tetto tentativi).
3. **Azioni irreversibili solo con ok esplicito**: migration sul DB condiviso, push su `main` (= produzione), cancellazioni, invii al team.
4. **Segreti**: mai in chat, nel codice, nel repo o nei file di istruzioni. Le chiavi (es. `GEMINI_API_KEY`) le inserisce Leonardo da solo nelle variabili d'ambiente di Vercel / nei secrets di Supabase; tu gli dai il link diretto alla pagina giusta.
5. **Stile con Leonardo**: sintetico, risultato prima, limiti in una riga. Passi da dashboard: uno per messaggio, con link diretto.
6. **Inserimento dati a mano = inaccettabile** come soluzione: resta solo come ripiego temporaneo dichiarato.
7. **Solo strumenti gratuiti** (Supabase Free, Vercel Hobby, Gemini piano gratuito). Se qualcosa richiede un piano a pagamento, fermati e chiedi.

---

## Primo passo sull'altro PC: accessi (prima di toccare qualsiasi cosa)

Nessuna credenziale è in questo file. Verifica ogni accesso e, se manca, chiedi a chi usa il PC di fare il login (si apre il browser). Chiedi subito **di chi è il PC**: se non è di Leonardo, il proprietario va prima aggiunto da Leonardo all'org Supabase "Lemons In The Room" e come collaboratore del repo GitHub.

| Servizio | Come verificarlo | Se manca |
|---|---|---|
| GitHub | `git clone https://github.com/leonardobragalli/lemo-linkedin` (pubblico); per il push `git push --dry-run` | Login via Git Credential Manager con l'account autorizzato |
| Supabase | MCP Supabase del catalogo Hermes → `list_projects` deve mostrare `lemo-linkedin` (`qpufcekagamvpubosisj`) | `manage_connections` → install/authorize `supabase` (OAuth nel browser) |
| Vercel | Non serve accesso: il deploy parte dal push su GitHub. Le variabili d'ambiente le inserisce Leonardo dal browser | Dare a Leonardo il link diretto alla pagina Settings → Environment Variables del progetto |
| Notion | Serve un'integrazione **nuova, in sola lettura**, condivisa solo con i database di `docs/FONTI_CONOSCENZA.md` | Guidare Leonardo a crearla (notion.so/my-integrations); il token va nei secrets, mai in chat |
| Gemini | Chiave di Lemons già usata per lemo-training | La inserisce Leonardo nelle env (Production + Preview) |
| Node | `node -v` ≥ 20 | Installare Node LTS |

Poi: `npm install` (su Windows lancialo in background, può superare il timeout) e `npm run build` per confermare che tutto parta.

## Stato attuale (Fase 1, già fatta e testata)

| Cosa | Dove |
|---|---|
| Repo | GitHub `leonardobragalli/lemo-linkedin` (pubblico) → clona in `C:/Users/<utente>/Desktop/lemo-linkedin` |
| Stack | React 19 + Vite 7, CSS semplice (no Tailwind), `@supabase/supabase-js` |
| Database | Supabase org "Lemons In The Room", progetto `lemo-linkedin`, ref `qpufcekagamvpubosisj`, eu-central-1. Collegalo con l'MCP Supabase del catalogo Hermes (OAuth, mai token in chat) |
| Hosting | Vercel (import da vercel.com/new fatto da Leonardo; verifica che sia online e qual è l'URL) |
| Schema | `supabase/migrations/20261029_schema_iniziale.sql`: `team_members` (10 profili, `is_admin`, `email`), `posts` (stato `da_rivedere/approvato/pubblicato/scartato`, origine `piano/storico/nuovo`, `ganci_opzioni`, `vis`, `linkedin_urn`), `post_metrics` (snapshot per post), `member_metrics` (follower per giorno) |
| Sicurezza | RLS: tutto il team legge tutto; ognuno scrive solo i propri post/metriche; admin tutto. Trigger che rifiuta account per email non presenti in `team_members`. Guardia contro auto-promozione admin. Testata via REST |
| Accesso | Magic link via email `@lemonsintheroom.com` |
| Tempo reale | Supabase Realtime su tutte e 4 le tabelle (testato con due browser) |
| Grafica | `src/lib/cards.js` = generatore SVG delle tavole 2160×2700 + banner 4752×1188, copiato dal pannello del kit di Matteo; `src/lib/grafica.js` lo usa con `public/assets/fonts.css` (Recoleta, Runde) e `public/assets/photo_pool.json` (15 foto). Tavole di Matteo pre-renderizzate in `public/img/matteo/` |
| Analisi | `src/lib/insights.js`: indice = interazioni (reazioni+commenti+diffusioni) / mediana dei post dello stesso autore; gruppi per giorno, fascia oraria, formato, tipo di apertura; nessun suggerimento sotto 5 post per gruppo |
| Pubblicazione | Assistita: copia testo (formattato per LinkedIn) + scarica immagini + apre `linkedin.com/feed/?shareActive=true`; poi l'utente incolla il link del post → URN → data reale (`id >> 22`) |
| Dati nel DB | 10 profili, 180 post del piano (18 slot × 10), 65 post storici, 68 rilevazioni importate dal kit (impressioni solo per Matteo), follower al 28/10 |
| Tono e vincoli | `docs/kit/voice.md` (tono, regole sulle evidenze, cose vietate: è il file di Matteo, ma i vincoli valgono per tutti) |

Ancora aperto dalla Fase 1 (verificalo e, se manca, guida Leonardo): Site URL + Redirect URLs in Supabase Auth, SMTP Aruba per le mail di accesso. Le email dei 7 colleghi senza email le fornisce Leonardo **quando servono (prima del rilascio al team)**: costruisci prima la struttura, poi chiedile.

Contesto team (id in `team_members`): matteo (Head of Clinical R&D), alessandro_napoli (CEO), niccolo_berni (CRO), niccolo_cesareo (COO), lazar (CTO, scrive in inglese), emma (Customer Success), riccardo (Growth), sofia (Social/PR), alessandro_romagnosi (Onboarding), leonardo (BizOps/Operations, admin). Follower da ~136 a ~4.300: per questo ogni confronto è sempre relativo all'autore.

---

## Obiettivo della Fase 2

Una piattaforma unica, sempre aggiornata per tutti, in cui ognuno:
1. trova le sue **bozze già pronte** (testo + immagini) generate dall'AI, che **migliorano da sole** in base ai risultati dei post precedenti;
2. le rivede e approva, poi clicca **Pubblica**: si apre la schermata di creazione/pianificazione post di LinkedIn con il testo **già negli appunti** e le immagini **già scaricate**; la persona incolla, allega, e pubblica o pianifica da LinkedIn;
3. **non inserisce mai i numeri a mano**: le statistiche dei suoi post arrivano da sole.

---

## Blocco A — Dati automatici (priorità 1)

### A1. Userscript nel browser di ognuno (Chrome e Safari)
Il team usa sia Chrome sia Safari. Un'estensione Safari vera richiede Xcode e account Apple a pagamento → **userscript unico** (stesso codice per tutti), installato con:
- Chrome/Edge: estensione gratuita **Tampermonkey**;
- Safari (Mac): app gratuita **Userscripts** (App Store).

- **Cosa fa**: si attiva quando la persona apre linkedin.com (lo fa comunque per pubblicare). In sottofondo, al massimo una volta ogni ~12 h, legge le statistiche **solo dei post dell'utente stesso** (es. `linkedin.com/analytics/post-summary/<urn>/`, analytics dei contenuti del creator, numero follower) con richieste dalla stessa sessione, e le invia alla piattaforma: impressioni, persone raggiunte, reazioni, commenti, diffusioni, salvataggi, clic, follower guadagnati, follower totali. Limite noto: se qualcuno non apre LinkedIn per giorni, i suoi dati restano fermi fino al prossimo accesso — dichiaralo nella guida.
- **Collegamento post ↔ piattaforma**: tramite URN. Se trova post pubblicati dall'utente che nella piattaforma non sono ancora "pubblicati", li abbina da solo (per testo/data) e segna `published_at` + `linkedin_url`: così sparisce anche il passaggio "incolla il link".
- **Autenticazione verso la piattaforma**: codice personale revocabile generato dall'app (pagina "Collega LinkedIn"), salvato nello storage dello userscript; una funzione server (Supabase Edge Function / Vercel `api/`) lo verifica e scrive con `fonte = 'estensione'`, solo sui post di quel membro. Mai password, mai la sessione Supabase completa nello script. CORS limitato a linkedin.com.
- **Prudenza (zona grigia dei Termini LinkedIn — Leonardo ha accettato il rischio)**: solo lettura, solo dati propri, nessuna azione (niente like, inviti, messaggi), poche decine di richieste al giorno, pause casuali, nessun accesso a profili altrui, stop automatico se LinkedIn mostra captcha/verifiche. Scrivilo nella pagina di installazione in 3 righe chiare.
- **Robustezza**: le pagine LinkedIn cambiano. Isola i parser in un modulo unico, con test su HTML salvati (fixture) e un campo `parser_version`; se il parsing fallisce, registra l'errore (tabella `ingest_log`) invece di scrivere numeri sbagliati. Mai inventare valori mancanti: `null`. Aggiornamenti dello userscript automatici tramite `@updateURL` servito dalla piattaforma.
- **Installazione**: pagina guida nell'app con 3–4 passi per Chrome e per Safari, screenshot inclusi; prova su almeno un Mac con Safari (DA CHIEDERE a chi del team).
- **Schema**: aggiungi `fonte = 'estensione'` ai valori ammessi; tabella `ingest_log` (chi, quando, quanti post, errori, `parser_version`); su `post_metrics` al massimo 1 rilevazione per post ogni ~12 h, e conserva quelle vicine a 24 h / 72 h / 7 gg dalla pubblicazione, usate dall'analisi.

### A2. API ufficiale LinkedIn
Esclusa per decisione di Leonardo (richiede un admin della pagina aziendale e un'approvazione incerta). Progetta comunque `post_metrics` in modo che una fonte `api` si possa aggiungere in futuro senza toccare il resto. Non implementarla.

### A3. Ripiego senza userscript
Upload dell'export delle statistiche dei contenuti che LinkedIn genera (file .xlsx dall'area analytics): parser lato client, anteprima, abbinamento per URN/data, `fonte = 'csv'`.

**Verifica Blocco A**: su un account vero (quello di Leonardo, con il suo ok), sia da Chrome sia da Safari, lo userscript scrive in `post_metrics` numeri identici a quelli visibili su LinkedIn per almeno 3 post; un parse fallito produce una riga in `ingest_log` e nessun numero; un utente non può scrivere metriche di post altrui (test RLS).

---

## Blocco B — Generazione testi che impara dai dati (Gemini, piano gratuito)

Precisazione da tenere presente e da spiegare a Leonardo se serve: con ~20 post/settimana **non si addestra un modello**. Si costruisce un **ciclo di apprendimento**: i dati decidono esempi, regole e varianti che entrano nel prompt del generatore. L'effetto è lo stesso: più si pubblica, migliori le bozze.

### B1. Caratteristiche di ogni post (calcolate in automatico, salvate in `post_features`)
Tipo di apertura (domanda, dato numerico, storia, contrasto, citazione…, classificata da Gemini con elenco chiuso), lunghezza prima riga e totale, presenza di numeri nelle prime 3 righe, struttura (elenco puntato, righe brevi), tema clinico, formato, modello grafico usato, giorno e fascia oraria, lingua, chiusura con domanda. Più l'esito: **indice a 7 giorni** (interazioni / mediana dell'autore) e tasso su impressioni quando disponibile.

### B2. "Playbook" che si aggiorna da solo
Job settimanale (cron gratuito) che ricalcola per **team** e per **autore**:
- i post migliori e peggiori (per indice) da usare come esempi positivi/negativi;
- le regole emerse con numerosità ed effetto (es. "aperture con dato numerico: 1,6× su 9 post") — **solo gruppi ≥ 5 post**, altrimenti "dati insufficienti";
- i pattern da evitare (post scartati, bozze rifiutate);
- le **correzioni tipiche dell'autore**: differenza tra bozza generata e testo effettivamente pubblicato (cosa toglie, cosa aggiunge, lunghezza). È il segnale più forte sullo stile personale.
Salvalo versionato in una tabella `playbook` (chi, versione, contenuto JSON, data) e mostralo in una pagina "Cosa sta imparando" leggibile dal team.

### B2-bis. Base di conoscenza che si aggiorna da sola (Notion + Lemons Insights)
Il generatore non deve "ricordare" fatti: li **recupera** da una base aggiornata ogni notte.
- Fonti ammesse ed escluse: **`docs/FONTI_CONOSCENZA.md`** (whitelist). Niente fuori da quell'elenco; per le voci "DA CHIEDERE" chiedi a Leonardo prima di includerle.
- **Notion**: lettura via API con un'integrazione Notion dedicata in sola lettura, condivisa solo con i database della whitelist (la crea Leonardo; il token lo mette lui nei secrets, mai in chat). Campi sensibili esclusi come indicato nel file.
- **Lemons Insights** (`insights.lemonsintheroom.com`): tabella pubblica `studies` del loro Supabase + pagine pubblicate. Fonte esterna di Matteo: se cambia, log dell'errore e nessun dato inventato.
- **Struttura**: tabella `knowledge_chunks` (fonte, id/URL originale, titolo, testo, area clinica, data lettura, hash) + embedding (Gemini embeddings gratuiti, `pgvector` su Supabase). Aggiornamento incrementale (solo pagine cambiate, via hash/`last_edited_time`), cancellazione di ciò che sparisce dalla fonte. Tabella `facts` per i numeri aziendali ricorrenti (strutture attive, visori, sessioni — calcolati come aggregati, **San Martino escluso**, nessun nome di ospedale) con stato `confermato da umano / da confermare`.
- **Uso**: per ogni bozza recupera i 5–10 pezzi più pertinenti, li passa a Gemini con l'obbligo di citarli; ogni numero/claim della bozza viene confrontato con base e `facts`: trovato → fonte collegata; non trovato → `DA VERIFICARE` evidenziato.
- Pagina "Fonti" nell'app: cosa è stato letto, quando, errori di sincronizzazione, pulsante "conferma questo dato" per i `facts`.

### B3. Generatore di bozze
Pulsante "Genera bozza" (e generazione automatica settimanale per gli slot vuoti del calendario di ognuno). Funzione server (Vercel `api/` o Supabase Edge Function; la chiave `GEMINI_API_KEY` la inserisce Leonardo nelle env/secrets) che chiama Gemini con:
- `docs/kit/voice.md` + vincoli normativi (sotto) + profilo dell'autore (ruolo, angolo, segni stilistici: es. Napoli frasi di una riga e `→`, Sofia parole chiave in maiuscolo, Lazar in inglese);
- playbook del team e dell'autore + 3 esempi migliori dell'autore (testo completo) + 2 da evitare;
- tema/slot richiesto, fonti fornite dall'utente e i pezzi pertinenti della base di conoscenza (B2-bis), con link.
Output JSON validato (`responseSchema`): 3 aperture alternative, corpo, fonti, primo commento, **elenco dei claim fattuali** con stato `fonte citata / DA VERIFICARE`, brief per le immagini. La bozza entra come `da_rivedere`: **non esce mai niente senza approvazione dell'autore**.
- **Esplorazione**: circa 1 bozza su 5 prova volutamente una variante poco testata (apertura, formato, orario), dichiarandolo nella bozza, così il sistema non si fissa sulle prime cose che funzionano.
- Limiti del piano gratuito Gemini: gestisci rate limit con coda e retry; verifica il nome modello con la chiave reale (in lemo-training: `gemini-flash-latest`). Nel piano gratuito Google può usare i dati inviati: invia solo contenuti destinati a essere pubblici, mai dati di pazienti o contratti.

### Vincoli normativi del contenuto (da verificare in ogni bozza, anche in automatico)
- LEMO = dispositivo medico CE Classe I per comfort e benessere emotivo: **nessun claim terapeutico** non coperto dalla marcatura (MDR UE 2017/745 art. 7; D.Lgs. 137/2022 art. 26). Vietato "scientificamente validato" senza studio, popolazione ed esito.
- Codice deontologico medico (FNOMCeO artt. 55–57) per i profili medici: informazione prudente, niente promozione commerciale diretta.
- Numeri e dati aziendali (es. "45 secondi di sanificazione", "59 strutture", tempi di setup) solo se confermati: altrimenti `DA VERIFICARE` evidenziato nell'editor. Nessun dato di pazienti, nessun nome di ospedale senza ok.
- Un controllo automatico (regole + passaggio Gemini) segnala nell'editor le frasi a rischio prima dell'approvazione.

**Verifica Blocco B**: con i dati attuali il playbook dichiara onestamente "dati insufficienti" dove serve; una bozza generata per 2 autori diversi rispetta voce e vincoli (controllo a campione con Leonardo); il JSON è sempre valido; i claim senza fonte compaiono come DA VERIFICARE.

---

## Blocco C — Immagini (entrambe le strade)

### C1. Tavole di brand guidate dai dati
Evolvi `src/lib/cards.js` senza rompere lo stile: il modello grafico (4 impaginazioni di copertina + scheda dati), la palette dell'autore e la foto vengono scelti in base al playbook (quale impaginazione ha reso di più per quell'autore), con la stessa quota di esplorazione. Elimina i **numeri fissi per slot** (`SLOT_SECONDARY_KPIS`): i numeri nelle tavole devono venire dalla bozza e dalle sue fonti, oppure non esserci. Regole del kit: nessun numero sulla copertina, contrasto ≥ 4,5:1, formato 4:5 2160×2700.

### C2. Immagini generate da AI dentro la cornice di brand
Dal brief della bozza, genera una foto/illustrazione da usare come sfondo/area immagine della tavola (non come immagine nuda). Verifica prima quale modello immagini Gemini è **davvero gratuito** con la chiave di Lemons (se nessuno lo è: fermati e dillo, resta C1). Regole: visore sempre fedele a **Meta Quest 3** (scocca bianca, nessun controller in mano al paziente), nessun volto riconoscibile di pazienti reali, nessun logo di terzi ridisegnato, nessun testo dentro l'immagine generata (i testi li mette la tavola). L'autore può rigenerare o tornare alla foto d'archivio.

**Verifica Blocco C**: 3 tavole per 3 autori, rasterizzate 2160×2700, lette a schermo da te (niente testi tagliati o sovrapposti) e mostrate a Leonardo come percorso file.

---

## Blocco D — Pubblicazione (scelta di Leonardo: la persona clicca Pubblica)

Migliora il flusso esistente: un clic su "Pubblica su LinkedIn" →
1. testo formattato per LinkedIn copiato negli appunti (righe vuote preservate, grassetto Unicode);
2. immagini nell'ordine giusto scaricate in una cartella con nomi `01_…`, `02_…` ;
3. si apre la finestra di creazione post di LinkedIn;
4. una mini-guida a lato: "Incolla (Ctrl+V) → aggiungi le immagini → Pubblica o Pianifica".
Dopo la pubblicazione l'userscript rileva il post e lo segna come pubblicato da sola (Blocco A1). Se la persona pianifica su LinkedIn per un orario diverso, la piattaforma prende l'orario reale dall'URN.

---

## Ordine di lavoro proposto

1. Ricognizione (sola lettura): stato repo, deploy Vercel, Auth/SMTP Supabase, contenuto DB. Report a tabella.
2. Blocco A1 (userscript) → test sul profilo di Leonardo (Chrome + Safari) → rilascio al team con guida.
3. Base di conoscenza (B2-bis): sincronizzazione Notion + Insights, pagina Fonti.
4. Blocco B (features → playbook → generatore).
5. Blocco C1, poi C2.
6. Blocco D.
7. Aggiorna la skill `lemo-linkedin-regia` (mappa, regole, pitfall scoperti) e questo file.

Per ogni blocco: branch dedicato, build, test, anteprima Vercel, ok di Leonardo, merge su `main`.

## DA CHIEDERE a Leonardo prima o durante
- Chi del team usa Safari (per il test su Mac).
- Email dei 7 colleghi mancanti (prima del rilascio al team).
- Ok di Matteo all'uso automatico di Lemons Insights (meglio un export stabile) e decisione su Paper Updates / SOP (vedi `docs/FONTI_CONOSCENZA.md`).
- Conferma dei dati aziendali ricorrenti nei post (sanificazione 45 s, numero strutture, tempi di setup) e del ruolo/titolo di ciascuno.
- Se le bozze automatiche settimanali vanno generate per tutti o solo per chi le attiva.
