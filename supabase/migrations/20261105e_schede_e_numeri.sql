-- Fase 2: schede persona, lingua, stile grafico; numeri aziendali con stato (confermato / provvisorio / da verificare)
alter table public.team_members add column if not exists scheda text;
alter table public.team_members add column if not exists lingua text not null default 'it';
alter table public.team_members add column if not exists stile_grafico text not null default 'friendly';
alter table public.facts add column if not exists stato text not null default 'da_verificare';
update public.facts set stato = case when confermato_il is not null then 'confermato' else 'da_verificare' end;
update public.team_members set scheda = 'Matteo Era — Head of Clinical Research and Development

- **Headline LinkedIn:** Medical Doctor · Head of Clinical Research and Development Lemons in the Room
- **Lingua:** italiano (il pubblico sono gli ospedali italiani); inglese solo per post rivolti a partner esteri
- **Per chi scrive:** clinici, infermieri e psicologi dei reparti degli studi; direzioni e HTA; ricercatori potenziali partner
- **I suoi temi:**
  1. come si misura: disegno degli studi, scale validate, endpoint;
  2. cosa dicono le evidenze, area per area (pediatria, oncologia, ginecologia, emergenza, elettrofisiologia);
  3. ricerca con gli ospedali partner e valutazione economica con il Sant''Anna.
- **Voce osservata:** prima dei post del kit scriveva di eventi (AIIC Torino, Meyer, Nexus, Leopolda, Festival Francescano) con tono caldo e qualche 🍋. Il suo `voice.md` chiede registro scientifico, niente emoji, niente em dash.
- **Materiale vero:** 10 anni sulle ambulanze, istruttore BLSD, tesi sperimentale su CGRP, studi in 5 aree.
- **Stile grafico:** Scientifico.
- **Da evitare:** risultati di studi non pubblicati (Careggi), nomi di ospedali non confermati, tono promozionale (Codice deontologico artt. 55-57).', lingua = 'it', stile_grafico = 'scientifico' where id = 'matteo';
update public.team_members set scheda = 'Alessandro Napoli — CEO & Co-Founder

- **Headline:** Techstars ''25 | CEO @Lemons in the Room 🍋 | Pioneering Digital Therapeutics & Immersive Technology
- **Lingua:** **inglese** (quasi tutti i post recenti)
- **Per chi scrive:** ecosistema startup e investitori, oncologi e direzioni ospedaliere, candidati
- **I suoi temi:**
  1. costruire l''azienda: crescita, team (da 4 a 16 persone), assunzioni, rischi da CEO;
  2. mercato e regolatorio delle terapie digitali in Europa (Francia, Germania, Italia);
  3. congressi ed espansione (ESMO, IFAS Zurigo, AIEOP Lecce, Spagna).
- **Voce osservata:** frasi corte, una per riga, aperture forti e un po'' provocatorie ("HOW NOT TO SELL DIGITAL THERAPIES", "HEALTHCARE IN THE SOUTH DOESN''T WORK!"), storie personali (da studente di medicina a CEO, il gong per il primo contratto di Riccardo), chiusure secche ("LFG 🚀🍋"). Niente studi citati.
- **Materiale vero:** formazione in medicina (Firenze, Lituania, tirocinio in Giappone), Techstars, ESMO con stand.
- **Stile grafico:** Friendly; Numero per i traguardi aziendali.
- **Da evitare:** numeri aziendali non confermati. Nei suoi post compaiono ARR +31%, visori attivi 53→75, 133 ospedali in pipeline: **DA VERIFICARE** prima di riusarli.
- **Italiano:** solo per eventi o temi italiani (es. normativa sulle terapie digitali in Italia).', lingua = 'en', stile_grafico = 'friendly' where id = 'alessandro_napoli';
update public.team_members set scheda = 'Niccolò Berni — CRO & Co-Founder

- **Headline:** 🍋 Founder @ Lemons in the room | Techstars ''25 | Terapia digitale per una cura più umana
- **Lingua:** italiano
- **Per chi scrive:** direzioni sanitarie, primari, associazioni di pazienti, congressi
- **I suoi temi:**
  1. scene da congressi e demo (la demo con l''oncologo a ESMO e lo smartwatch);
  2. pazienti e procedure ripetute (spina bifida al Gemelli, AIEOP);
  3. espansione (Svizzera con Tenity, Spagna).
- **Voce osservata:** racconto concreto di un episodio, poi il senso. Italiano diretto, qualche emoji.
- **Materiale vero:** demo dal vivo, eventi con associazioni, programma Tenity a Zurigo.
- **Stile grafico:** Friendly.
- **Da evitare:** il suo "Informazioni" dice "💊 Nessun farmaco. 🚫 Nessun effetto collaterale": **fuori dalla destinazione d''uso CE**, da non riprendere nei post (e da segnalare). Numeri "30+ ospedali, 30.000 sessioni": DA VERIFICARE.', lingua = 'it', stile_grafico = 'friendly' where id = 'niccolo_berni';
update public.team_members set scheda = 'Niccolò Cesareo-Santoro — COO & Co-Founder

- **Headline:** Techstars ''25 | COO Lemons in the Room 🍋 | Ingegnere Gestionale
- **Lingua:** italiano
- **Per chi scrive:** founder e community dell''innovazione, università, partner
- **I suoi temi:**
  1. come si costruisce e si organizza una startup (ritiro a Casal di Pari, ufficio nuovo, remoto vs presenza, Malta);
  2. community ed eventi (Florence Connect, Italian Founders House, università);
  3. il paziente e il design del visore ("Il vostro visore è utile, ma fa un po'' impressione").
- **Voce osservata:** apertura con una scena o un paradosso ("Il paradosso dell''efficienza"), riflessione personale da COO, elenchi con 🍋, tono caldo.
- **Materiale vero:** Techstars, Murate Idea Park, IKIGAI, NOI Techpark, docenze all''Università di Firenze, SIFO Roma, WMF.
- **Stile grafico:** Friendly.
- **Da evitare:** studi clinici (non è il suo campo).', lingua = 'it', stile_grafico = 'friendly' where id = 'niccolo_cesareo';
update public.team_members set scheda = 'Lazar Rondović — CTO & Co-Founder

- **Headline:** CTO & Co-Founder @ Lemons In The Room | Med-certified XR solutions
- **Lingua:** inglese
- **Per chi scrive:** sviluppatori XR, healthtech, clinici interessati al design
- **I suoi temi:**
  1. come si progetta software clinico in VR (soft gaze anchor points, framework ART, modello in tre fasi, niente controller per i bambini);
  2. il team e il mestiere (Conway''s Law e AI, Unreal Meetup, assumere ingegneri);
  3. hardware e mercato XR (occhiali Meta, diffusore di profumi integrato).
- **Voce osservata:** pensiero da psicologo e ingegnere; aperture con un''idea controintuitiva ("You can''t relax on command"); episodi ironici (la sicurezza dell''ospedale che lo caccia). Ottimo materiale proprio.
- **Materiale vero:** MSc in Psicologia, sviluppo di videogiochi, BiteXR, moduli LEMO.
- **Stile grafico:** Scientifico per il design clinico, Friendly per team e prodotto.
- **Da segnalare:** due post del kit già pubblicati sul suo profilo riportano il -44% di Carrougher 2009, ma l''abstract dice -37%.', lingua = 'en', stile_grafico = 'friendly' where id = 'lazar';
update public.team_members set scheda = 'Emma Di Gangi — Head of Customer Success

- **Headline:** 🍋 Head of Customer Success @ Lemons in the room (part-time); laurea in Psicologia
- **Lingua:** italiano
- **Profilo pubblico:** quasi solo condivisioni, **un solo post proprio**. La voce va costruita con lei.
- **I suoi temi:**
  1. l''onboarding in reparto e la formazione del personale;
  2. lo sguardo da psicologa sull''esperienza del paziente;
  3. le domande più frequenti dei reparti.
- **Stile grafico:** Friendly.
- **Voce:** da psicologa, calma e concreta; parte da quello che succede in reparto durante l''onboarding. Niente studi: quelli sono di Matteo.', lingua = 'it', stile_grafico = 'friendly' where id = 'emma';
update public.team_members set scheda = 'Riccardo Bufalo — Growth & Revenue

- **Headline:** Growth & Revenue @ Lemons in the Room | Environmental Engineering (nel Pannello: "Growth & Revenue · Hospital Partnerships")
- **Lingua:** italiano
- **Per chi scrive:** pazienti e caregiver, operatori, chi partecipa ai webinar
- **I suoi temi:**
  1. sfatare i dubbi sulla tecnologia ("Non voglio che l''AI mi legga la mente": la VR non è AI);
  2. bambini e primo ricordo dell''ospedale;
  3. webinar ed eventi (meditazione sul rooftop).
- **Voce osservata:** parte da una frase sentita, spiega in modo semplice; tono divulgativo.
- **Materiale vero:** il primo contratto (raccontato da Alessandro Napoli), la preparazione degli stand.
- **Stile grafico:** Friendly.', lingua = 'it', stile_grafico = 'friendly' where id = 'riccardo';
update public.team_members set scheda = 'Sofia Marcaccini — Marketing Manager

- **Headline:** 🍋 Marketing Manager @ Lemons in the room (nel Pannello: "Social Media & PR Manager" → **da aggiornare**)
- **Lingua:** italiano
- **Per chi scrive:** pubblico ampio, famiglie, operatori, partner
- **I suoi temi:**
  1. eventi e iniziative (I CAREggi, webinar, rooftop, Kosovo con Telly);
  2. la persona dietro la malattia, genitori e caregiver;
  3. il suo lavoro nel marketing di una healthtech ("Come facciamo arrivare quello che costruiamo a chi ne ha bisogno").
- **Voce osservata:** calda, emoji frequenti, spesso ricondivide i post della pagina aziendale con un commento breve.
- **Stile grafico:** Friendly; Foto per gli eventi.
- **Da evitare:** testi della pagina aziendale con claim forti ("ridurre ansia e dolore"): restare nella destinazione d''uso.', lingua = 'it', stile_grafico = 'friendly' where id = 'sofia';
update public.team_members set scheda = 'Alessandro Romagnosi — Growth & International Expansion

- **Headline:** 🍋 Growth & International expansion @ Lemons in the room | Business Management (nel Pannello: "Customer Success & Hospital Onboarding" → **da aggiornare**)
- **Lingua:** **inglese** (quasi tutti i post), a volte italiano
- **Per chi scrive:** ospedali e partner esteri, ecosistema startup in Spagna
- **I suoi temi:**
  1. aprire un nuovo mercato (Barcellona, procurement spagnolo);
  2. le domande degli ospedali ("Which department is this for?");
  3. cosa non è la VR clinica ("Is it like a video game? No.").
- **Voce osservata:** apertura con la domanda che gli fanno, risposta netta, lezione pratica.
- **Materiale vero:** tesi su Tetuan Valley e Google for Startups Madrid, lavoro sul campo a Barcellona.
- **Stile grafico:** Friendly; Numero per i traguardi.
- **Da evitare:** numeri "10.000 pazienti", "40+ ospedali": DA VERIFICARE (sono diversi da quelli di Berni e Napoli).', lingua = 'en', stile_grafico = 'friendly' where id = 'alessandro_romagnosi';
update public.team_members set scheda = 'Leonardo Bragalli — BizOps Engineer

- **Headline LinkedIn:** BizOps Engineer. Nel Pannello è ancora "Operations & Hospital Fleet Management" → **da aggiornare**. Contenuti dal CV BizOps.
- **Lingua:** italiano
- **Per chi scrive:** ingegneri clinici, coordinatori infermieristici, operations di healthtech
- **I suoi temi:**
  1. cosa succede a un visore prima e dopo il reparto (logistica, qualità, teche, MDM);
  2. dati e automazioni che tengono in piedi le operations;
  3. ingegneria gestionale applicata alla sanità.
- **Voce:** concreta, a passi, solo fatti dal CV. Post approvato: "Cosa succede a un visore prima che arrivi in reparto".
- **Stile grafico:** Friendly, carosello a passi.
- **Preferenza:** la slide finale con invito ai commenti non gli piace, la toglie lui prima di pubblicare.', lingua = 'it', stile_grafico = 'friendly' where id = 'leonardo';
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('ospedali_attivi', 'Ospedali dove è attivo LEMO', 'più di 30, tra Italia e Spagna', 'post LinkedIn di Niccolò Berni (fine ottobre 2026)', 'Discordante: Romagnosi (luglio 2026) scriveva 40+ in Italia, il kit 59 strutture', false, 'provvisorio') on conflict do nothing;
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('sessioni_totali', 'Sessioni erogate', 'oltre 30.000', 'post LinkedIn di Niccolò Berni (fine ottobre 2026)', null, false, 'provvisorio') on conflict do nothing;
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('pazienti_totali', 'Pazienti che hanno usato i visori', '10.000', 'post LinkedIn di Alessandro Romagnosi (luglio 2026)', 'Dato più vecchio delle sessioni', false, 'provvisorio') on conflict do nothing;
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('visori_attivi', 'Visori attivi', '75 (53 a metà luglio)', 'post LinkedIn di Alessandro Napoli (ottobre 2026)', null, false, 'provvisorio') on conflict do nothing;
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('pipeline_italia', 'Ospedali in pipeline in Italia', '133', 'post LinkedIn di Alessandro Napoli (ottobre 2026)', null, false, 'provvisorio') on conflict do nothing;
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('arr_crescita', 'Crescita ARR da metà luglio', '+31%', 'post LinkedIn di Alessandro Napoli (ottobre 2026)', 'Dato finanziario: chiedere a Leonardo se usarlo anche negli altri profili', false, 'provvisorio') on conflict do nothing;
insert into public.facts (chiave, etichetta, valore, fonte, note, automatico, stato) values ('persone_team', 'Persone nel team', '16', 'post LinkedIn di Alessandro Napoli (agosto 2026)', null, false, 'provvisorio') on conflict do nothing;
