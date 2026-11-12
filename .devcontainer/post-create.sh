#!/usr/bin/env bash
# Runs once when the dev-container is created.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Until S1.2 sets packageManager in package.json, pnpm is pinned here
PNPM_VERSION="9.12.3"

cd "$ROOT"

echo "==> pnpm $PNPM_VERSION via corepack"
# The image ships a global pnpm from npm that shadows the corepack shim
npm uninstall -g pnpm >/dev/null 2>&1 || true
hash -r
sudo corepack enable
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# Do not write packageManager into package.json: that is S1.2
export COREPACK_ENABLE_AUTO_PIN=0
corepack prepare "pnpm@$PNPM_VERSION" --activate

echo "==> Volumes belong to the node user"
sudo chown node:node client/node_modules server-nest/node_modules /home/node/.pnpm-store /home/node/.claude

echo "==> git for a repository checked out on Windows"
# The bind mount has a foreign owner: without this git refuses the repo
sudo git config --system --add safe.directory "$ROOT"
# Git for Windows sets autocrlf=true in its system config, which is not
# copied here: without this every CRLF file shows up as modified.
# Same value as on the host, so both sides treat line endings alike
sudo git config --system core.autocrlf true

echo "==> Dependencies"
(cd client && pnpm install --frozen-lockfile --config.confirm-modules-purge=false)
(cd server-nest && pnpm install --frozen-lockfile --config.confirm-modules-purge=false)

echo "==> server-nest/.env"
if [ ! -f server-nest/.env ]; then
  cp .devcontainer/server-nest.env server-nest/.env
else
  echo "server-nest/.env already exists, left as is"
fi

echo "==> Dev SSL certificate in ssl/"
# client (angular.json) reads ssl/localhost.{key,crt},
# server-nest (main.ts) reads ssl/{key,cert}.pem with passphrase 'sfl.com'
if [ ! -f ssl/cert.pem ]; then
  mkdir -p ssl
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout ssl/localhost.key -out ssl/localhost.crt \
    -subj "/CN=sfl.com" \
    -addext "subjectAltName=DNS:sfl.com,DNS:localhost,IP:127.0.0.1"
  cp ssl/localhost.crt ssl/cert.pem
  openssl pkey -in ssl/localhost.key -out ssl/key.pem -aes256 -passout pass:sfl.com
else
  echo "ssl/ already has certificates, left as is"
fi

echo "==> Synthetic seed (skipped if the database is not empty)"
node .devcontainer/seed.cjs

echo "==> Done. See README.md, section 'Dev-container'"
