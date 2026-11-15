#!/bin/bash
# Run once after switching to the "Companion Local Signing" certificate
# (npm run reset-permissions): forgets the Screen Recording, Calendar and
# Automation answers macOS kept for older, ad hoc signed builds (Companion
# and Togepi before it), which would otherwise show as switched on in System
# Settings without working. Open Filo afterwards and allow what it asks
# for; from then on, rebuilds keep the answers.

set -uo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "This only works on macOS."
  exit 1
fi

for id in com.sushantpatil.filo com.sushantpatil.companion com.sushantpatil.togepi; do
  for service in ScreenCapture Calendar AppleEvents; do
    tccutil reset "$service" "$id" >/dev/null 2>&1 && echo "Reset $service for $id"
  done
done
echo "Done. Quit Filo if it's running, open the new build and allow what it asks for."
