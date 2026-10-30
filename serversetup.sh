#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

if [ ! -f "$BACKEND_DIR/package.json" ]; then
  printf 'Backend not found at: %s\n' "$BACKEND_DIR" >&2
  exit 1
fi

install_with_privileges() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    printf 'Administrator privileges are required. Install sudo or run this script as root.\n' >&2
    exit 1
  fi
}

if command -v pkg >/dev/null 2>&1; then
  pkg update -y
  pkg upgrade -y
  pkg install -y nodejs git yt-dlp
elif command -v apt-get >/dev/null 2>&1; then
  install_with_privileges apt-get update
  install_with_privileges apt-get install -y ca-certificates curl git

  if [ "$(id -u)" -eq 0 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  fi

  install_with_privileges apt-get install -y nodejs yt-dlp
else
  printf 'Unsupported Linux distribution. Use Termux or Debian/Ubuntu with apt-get.\n' >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js installation completed, but the node command is unavailable.\n' >&2
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 22 ]; then
  printf 'Node.js 22 or newer is required; found %s.\n' "$(node --version)" >&2
  exit 1
fi

printf 'Using Node.js %s\n' "$(node --version)"
cd "$BACKEND_DIR"
npm install
npm start
