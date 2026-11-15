#!/bin/bash
# Puts the website on a Vultr server and sets up nginx to serve it. Run it from
# your Mac, from the repo root, as many times as you like (each run updates the
# site; it never touches the dmg already on the server).
#
#   website/deploy/deploy.sh <server-ip> [domain]
#
# With a domain (already pointing at the server), it also turns on HTTPS.
set -euo pipefail

IP="${1:?usage: website/deploy/deploy.sh <server-ip> [domain]}"
DOMAIN="${2:-}"
SITE="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="root@$IP"

echo "→ Setting up nginx on $IP (first run takes a minute)"
ssh "$SERVER" DOMAIN="$DOMAIN" 'bash -s' <<'REMOTE'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
command -v nginx >/dev/null || { apt-get update -qq && apt-get install -y -qq nginx rsync; }
command -v rsync >/dev/null || apt-get install -y -qq rsync
mkdir -p /var/www/filo/downloads
V6=""; [ -s /proc/net/if_inet6 ] && V6="listen [::]:80 default_server;"
# www.<domain> joins the certificate only once it points at the same address,
# so a missing or parked www never stops HTTPS for the main name.
first_ip() { getent ahostsv4 "$1" | awk 'NR==1{print $1}'; }
NAMES="$DOMAIN"
if [ -n "$DOMAIN" ] && [ -n "$(first_ip "$DOMAIN")" ] && [ "$(first_ip "www.$DOMAIN")" = "$(first_ip "$DOMAIN")" ]; then
  NAMES="$DOMAIN www.$DOMAIN"
fi

cat > /etc/nginx/sites-available/filo <<NGINX
server {
  listen 80 default_server;
  $V6
  server_name ${NAMES:-_};
  root /var/www/filo;
  index index.html;

  gzip on;
  gzip_types text/css application/javascript image/svg+xml;

  # The app: always a download, never opened in the browser.
  location /downloads/ {
    types { application/x-apple-diskimage dmg; }
    add_header Content-Disposition 'attachment; filename="Filo.dmg"';
  }
  location /assets/ {
    expires 7d;
  }
  location / {
    try_files \$uri \$uri/ =404;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/filo /etc/nginx/sites-enabled/filo
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx || systemctl restart nginx

# Vultr's Ubuntu images ship with ufw allowing only SSH.
if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 'Nginx Full' >/dev/null
fi

if [ -n "$DOMAIN" ]; then
  command -v certbot >/dev/null || apt-get install -y -qq certbot python3-certbot-nginx
  echo "  HTTPS for: $NAMES"
  # shellcheck disable=SC2046
  certbot --nginx $(printf -- '-d %s ' $NAMES) --non-interactive --agree-tos --register-unsafely-without-email --redirect
fi
REMOTE

echo "→ Copying the site"
(cd "$SITE" && rsync -az --delete index.html styles.css main.js assets live "$SERVER:/var/www/filo/")

echo "✓ Live at http://${DOMAIN:-$IP}${DOMAIN:+ (and https://$DOMAIN)}"
ssh "$SERVER" 'test -f /var/www/filo/downloads/Filo.dmg' \
  || echo "  The download button needs the app: website/deploy/upload-dmg.sh $IP path/to/Filo.dmg"
