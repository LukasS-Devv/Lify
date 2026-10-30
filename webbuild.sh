#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf 'Node.js and npm are required. Install Node.js 22 or newer and try again.\n' >&2
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  printf 'Node.js 22 or newer is required; found %s.\n' "$(node --version)" >&2
  exit 1
fi

if [ ! -f "$FRONTEND_DIR/package-lock.json" ]; then
  printf 'Frontend package-lock.json not found at: %s\n' "$FRONTEND_DIR" >&2
  exit 1
fi

cd "$FRONTEND_DIR"
npm ci
npx expo export --platform web

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
  printf 'Web export completed without creating frontend/dist/index.html.\n' >&2
  exit 1
fi

printf 'Web build is ready in frontend/dist.\n'
printf 'On Windows, run web.bat from the repository root to serve it on port 5000.\n'
