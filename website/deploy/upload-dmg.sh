#!/bin/bash
# Uploads the app straight from your Mac to the server, where the site's
# download buttons point (/downloads/Filo.dmg). Run it again for a new version.
#
#   website/deploy/upload-dmg.sh <server-ip> path/to/Filo.dmg
set -euo pipefail

IP="${1:?usage: website/deploy/upload-dmg.sh <server-ip> path/to/Filo.dmg}"
DMG="${2:?usage: website/deploy/upload-dmg.sh <server-ip> path/to/Filo.dmg}"
SERVER="root@$IP"

ssh "$SERVER" 'mkdir -p /var/www/filo/downloads'
# Uploads to a temporary name first, so nobody downloads a half-uploaded file;
# --partial lets a dropped upload resume where it stopped.
rsync --progress --partial "$DMG" "$SERVER:/var/www/filo/downloads/.Filo.dmg.part"
ssh "$SERVER" 'mv /var/www/filo/downloads/.Filo.dmg.part /var/www/filo/downloads/Filo.dmg && chmod 644 /var/www/filo/downloads/Filo.dmg'

SIZE="$(ssh "$SERVER" 'du -h /var/www/filo/downloads/Filo.dmg | cut -f1')"
echo "✓ Uploaded ($SIZE): http://$IP/downloads/Filo.dmg"
echo "  To show the size next to the button, set size: '$SIZE' in window.FILO_DOWNLOAD (index.html) and re-run deploy.sh."
