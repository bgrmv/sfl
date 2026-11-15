#!/usr/bin/env bash
# Installs mongodump/mongorestore (MongoDB Database Tools) and age for
# the MongoDB backup procedure (S6.1, docs/runbooks/mongo-backup.md). Safe to rerun.
set -euo pipefail

VERSION=100.10.0
SHA_X64=a08bec31705dbaefda5bb0830619c450b10e07f4600974ee437b5499cfb2416c

if ! command -v age >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq age
fi

if command -v mongodump >/dev/null 2>&1 && mongodump --version | grep -q "$VERSION"; then
  echo "mongodb-database-tools $VERSION already installed"
else
  if [ "$(uname -m)" != x86_64 ]; then
    echo "mongodb-database-tools: only x86_64 is pinned, install it by hand on $(uname -m)" >&2
    exit 1
  fi
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  FILE="mongodb-database-tools-debian12-x86_64-${VERSION}.tgz"
  curl -fsSL -o "$TMP/$FILE" "https://fastdl.mongodb.org/tools/db/${FILE}"
  echo "$SHA_X64  $TMP/$FILE" | sha256sum -c -
  tar -xzf "$TMP/$FILE" -C "$TMP" --strip-components=2 --wildcards '*/bin/mongodump' '*/bin/mongorestore'
  sudo install -m 0755 "$TMP/mongodump" "$TMP/mongorestore" /usr/local/bin/
fi

age --version
mongodump --version | head -1
