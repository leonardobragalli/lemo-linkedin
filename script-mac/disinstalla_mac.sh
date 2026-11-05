#!/bin/bash
PLIST="$HOME/Library/LaunchAgents/com.lemonsintheroom.regia-conoscenza.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "Aggiornamento giornaliero rimosso. La cartella ~/lemo-regia è rimasta (puoi cancellarla a mano)."
