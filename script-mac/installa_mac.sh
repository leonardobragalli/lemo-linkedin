#!/bin/bash
# Installa l'aggiornamento giornaliero della Regia LinkedIn su questo Mac.
# Uso: apri il Terminale nella cartella dello script e scrivi:  bash installa_mac.sh
# Orario (opzionale):                                         bash installa_mac.sh 7 30
set -e
ORA="${1:-7}"; MIN="${2:-30}"
DEST="$HOME/lemo-regia"          # fuori da Scrivania/Documenti: macOS lì blocca i job automatici
SRC="$(cd "$(dirname "$0")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/com.lemonsintheroom.regia-conoscenza.plist"

if [ ! -f "$SRC/.env" ]; then echo "Manca il file .env accanto allo script (vedi .env.esempio)."; exit 1; fi
if ! /usr/bin/python3 -c "print()" >/dev/null 2>&1; then
  echo "Python 3 non è installato: macOS ora ti propone di installare gli 'Strumenti da riga di comando'. Accetta e rilancia questo comando."
  xcode-select --install || true; exit 1
fi

mkdir -p "$DEST" "$HOME/Library/LaunchAgents"
cp "$SRC/aggiorna_conoscenza.py" "$SRC/.env" "$DEST/"
chmod 600 "$DEST/.env"

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.lemonsintheroom.regia-conoscenza</string>
  <key>ProgramArguments</key><array><string>/usr/bin/python3</string><string>$DEST/aggiorna_conoscenza.py</string></array>
  <key>WorkingDirectory</key><string>$DEST</string>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>$ORA</integer><key>Minute</key><integer>$MIN</integer></dict>
  <key>StandardOutPath</key><string>$DEST/launchd.log</string>
  <key>StandardErrorPath</key><string>$DEST/launchd.log</string>
</dict></plist>
PL

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installato: ogni giorno alle $ORA:$(printf %02d $MIN). Se il Mac è spento o in stop a quell'ora, parte appena si riaccende."
echo "Primo aggiornamento adesso..."
/usr/bin/python3 "$DEST/aggiorna_conoscenza.py"
