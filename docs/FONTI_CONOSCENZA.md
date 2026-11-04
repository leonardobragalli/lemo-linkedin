# Fonti di conoscenza per il generatore (proposta, ricognizione in sola lettura del 4/11/2026)

Regola: entra **solo** ciò che è elencato qui come "Includi". Con Gemini gratuito Google può usare i dati inviati → mai dati commerciali, contrattuali, personali o di pazienti. Ogni fatto salvato porta con sé la fonte (link Notion / URL) e la data di lettura.

## Lemons Insights (sito di Matteo Era)
- URL: https://insights.lemonsintheroom.com (app Lovable, Supabase separato `ifmfxhddtfcuatxrqqir`, NON il nostro).
- Tabella `studies` leggibile con la chiave pubblica del sito: 214 studi (title, authors, keywords = area clinica, url PubMed/PMC, study_design).
- Studi "hardcoded" nel codice del sito con abstract (`hardcodedStudies-*.js`) e pagine: clinical-evidence, scientific-foundations, scientific-library, clinical-problem, applications, technology-platform, staff-training.
- **Includi** tutto (contenuto pubblico). Lettura notturna della tabella `studies`; pagine lette dal sito pubblicato.
- Dipendenza fragile: se Matteo cambia permessi o struttura, la lettura si rompe → log errore, nessun dato inventato. DA CHIEDERE a Matteo: ok formale e, meglio, un export/endpoint stabile.

## Notion — Includi
| Database / pagina | ID | Righe | Cosa dà al generatore | Note |
|---|---|---|---|---|
| Ricerca & Sviluppo Clinico → paper | `299e69fb-b9e6-807f-a025-c86ddaa82bf2` | 47 | Titolo, design, n. pazienti, link | Pubblicati |
| Press | `2fae69fb-b9e6-800e-9abd-f5348624ecf1` | 54 | Uscite stampa (titolo, testata, data, link) | Pubblico |
| Blog Articles | `6f5b386b-4059-4902-b773-0d2d1d9288f8` | 63 | Articoli del sito: fatti e voce aziendale | Solo `Status` pubblicato |
| Procedures we can serve | `1e2a1b2b-052e-4339-bcd6-26fa6b1d72de` | 26 | Procedure, reparti, durata, contesto clinico | Senza "Developer Notes" |
| Experience Matrix | `ed33d2fa-b897-4aba-b180-50b5a5790b19` | 27 | Esperienze LEMO, obiettivo psicologico, durata | Senza note tecniche |
| Social Media Planner | `267e69fb-b9e6-8000-8b31-ffea0c38cd04` | 130 | Post passati (esempi di stile, temi già usati) | Solo `Post Content` pubblicati |
| Posts Pipeline / Comment Radar | `39ae69fb-b9e6-818a-…` / `39ae69fb-b9e6-81e9-…` | — | Bozze e angoli già pensati | Esempi, non fatti |

## Notion — Solo numeri aggregati (calcolati, mai righe)
| Fonte | ID | Cosa |
|---|---|---|
| Dashboard headsets | `333e69fb-b9e6-8084-b66c-c0e70e928033` | n. strutture/reparti attivi, n. visori, sessioni totali. **Escludere San Martino.** Nessun nome di ospedale |

Il numero va nella bozza come `DA VERIFICARE` finché un umano non lo conferma (es. "59 strutture" del kit).

## Notion — DA CHIEDERE prima di includere
- Paper Updates (`36be69fb-b9e6-81b4-bd73-c083ab658ede`, 63): avanzamento dei nostri studi. Risultati non pubblicati = non postabili; la sezione "Internal notes" è esplicitamente riservata. Chiedere a Matteo.
- SOP Register (`391e69fb-b9e6-81ca-baaf-d1a163b9de8b`): procedure (es. sanificazione) — utile per verificare "45 secondi", ma documenti regolatori interni.
- Pagine sanificazione UV-C/UV-B (test interni): solo dopo ok di Leonardo.

## Notion — Escludi sempre
CRM e tutte le varianti (CRM, CRM Backup, CRM Oncologi, Companies CRM, Smiling CRM, Spagna/France/Swiss Contacts, Cold Calling, Grandi Ospedali, Privati, Media/Distributor Contacts), Pipeline e Pipeline Diary, Contabilità, Contracts closed, Sales/Demo attive, Proposte, Cal.com, Instantly, Feedback Log, CAPA Register, Incident Evaluation Log, Sales Candidate Application Form, Contacts Tech, Level 0 Onboarding, Italia / Regional politics, Distributors, Trasferte, Tasks, Journaling, C-Level Journal, Standup, OKR/Sprint.
