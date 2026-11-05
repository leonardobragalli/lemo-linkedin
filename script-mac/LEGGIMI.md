# Aggiornamento giornaliero della base di conoscenza (Mac)

Una volta al giorno questo script rilegge **Lemons Insights** (studi scientifici) e i **6 database Notion**
attivi in *Impostazioni → Base di conoscenza* del sito, e aggiorna la piattaforma: pagine nuove, cambiate, cancellate.
I numeri aziendali **non** vengono da qui: li inserisce un admin in *Impostazioni → Numeri aziendali*.

## Installazione (una volta sola, 5 minuti)
1. Copia sul Mac la cartella `script-mac` (o scaricala da GitHub).
2. Metti dentro la cartella il file `.env` con i 4 valori (vedi `.env.esempio`; il file pronto te lo dà Leonardo, non va mandato in chat né caricato su GitHub).
3. Apri **Terminale**, trascina la cartella dopo `cd ` e premi Invio, poi scrivi:
   ```
   bash installa_mac.sh
   ```
   Parte subito un primo aggiornamento; poi ogni giorno alle 7:30. Per un altro orario: `bash installa_mac.sh 6 0` (= 6:00).

## Controlli
- Sul sito, *Impostazioni → Base di conoscenza*: data dell'ultimo aggiornamento e documenti per fonte.
- Sul Mac: `~/lemo-regia/aggiorna_conoscenza.log`.
- Prova senza scrivere niente: `python3 ~/lemo-regia/aggiorna_conoscenza.py --prova`.
- Togliere l'aggiornamento: `bash disinstalla_mac.sh`.

## Se cambia qualcosa
- Nuova chiave Notion o nuovo token: modifica `~/lemo-regia/.env`.
- Nuova versione dello script: ricopia la cartella e rilancia `bash installa_mac.sh`.
- Se il Mac è spento all'orario previsto, l'aggiornamento parte alla riaccensione; se un giorno salta non si perde niente, il giro dopo recupera tutto.
