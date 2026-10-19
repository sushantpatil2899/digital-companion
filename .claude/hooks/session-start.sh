#!/bin/bash
# Installs graphify (the `graphify` command used by the search/read hooks in
# .claude/settings.json) when a session starts, if it isn't installed yet.
set -uo pipefail

GRAPHIFY_VERSION=0.9.92

if command -v graphify >/dev/null 2>&1; then
  exit 0
fi

echo "Installing graphify ${GRAPHIFY_VERSION} (pip package graphifyy)..." >&2
if python3 -m pip install -q "graphifyy==${GRAPHIFY_VERSION}" >&2 \
  || python3 -m pip install -q --user "graphifyy==${GRAPHIFY_VERSION}" >&2; then
  if ! command -v graphify >/dev/null 2>&1; then
    echo "graphify installed, but it isn't on PATH (add ~/.local/bin to PATH)." >&2
  fi
else
  # Don't block the session; the graphify hooks will report the problem.
  echo "Could not install graphify; run: pip install graphifyy==${GRAPHIFY_VERSION}" >&2
fi
exit 0
