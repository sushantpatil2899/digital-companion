#!/bin/bash
# Run once on your Mac (npm run make-cert): makes the "Companion Local
# Signing" certificate in your login keychain, trusted for signing code.
# scripts/sign.js signs every build with it, so macOS keeps Filo's
# permissions (Screen Recording, Calendar, Automation) from one build to the
# next instead of treating each rebuild as a new app.
#
# It stays on this Mac: a self-signed certificate, not from Apple, good for
# your own builds only (10 years). macOS asks for your password once, to
# trust it.

set -euo pipefail

NAME="Companion Local Signing"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

if [ "$(uname)" != "Darwin" ]; then
  echo "This only works on macOS."
  exit 1
fi

if security find-identity -v -p codesigning | grep -q "\"$NAME\""; then
  echo "\"$NAME\" is already in your keychain. Nothing to do."
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/cert.cnf" <<EOF
[ req ]
distinguished_name = dn
x509_extensions = ext
prompt = no
[ dn ]
CN = $NAME
[ ext ]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
subjectKeyIdentifier = hash
EOF

# The openssl that comes with macOS (LibreSSL). A newer OpenSSL 3 needs
# -legacy, or the keychain can't read the exported key.
OPENSSL=/usr/bin/openssl
LEGACY=""
if "$OPENSSL" version | grep -q "^OpenSSL 3"; then LEGACY="-legacy"; fi

"$OPENSSL" req -x509 -newkey rsa:2048 -nodes -days 3650 -config "$TMP/cert.cnf" \
  -keyout "$TMP/key.pem" -out "$TMP/cert.pem"
"$OPENSSL" pkcs12 -export $LEGACY -inkey "$TMP/key.pem" -in "$TMP/cert.pem" \
  -name "$NAME" -passout pass:companion -out "$TMP/id.p12"

# Into your login keychain; codesign may use the key without asking.
security import "$TMP/id.p12" -k "$KEYCHAIN" -P companion -T /usr/bin/codesign >/dev/null

echo "macOS now asks for your password once, to trust \"$NAME\" for signing code."
security add-trusted-cert -r trustRoot -p codeSign -k "$KEYCHAIN" "$TMP/cert.pem"

if security find-identity -v -p codesigning | grep -q "\"$NAME\""; then
  echo
  echo "Done: \"$NAME\" is ready."
  echo "Next: npm run reset-permissions (once), then npm run dist, open Filo and allow what it asks for."
  echo "If macOS asks whether codesign may use the key while building, choose Always Allow."
else
  echo
  echo "The certificate was added but macOS doesn't list it for signing yet."
  echo "Open Keychain Access, find \"$NAME\", open Trust and set Code Signing to Always Trust."
  exit 1
fi
