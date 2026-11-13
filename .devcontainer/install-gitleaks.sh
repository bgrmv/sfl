#!/usr/bin/env bash
# Installs the pinned gitleaks release (S8.8). Safe to rerun.
set -euo pipefail

VERSION=8.28.0
case "$(uname -m)" in
  x86_64)  ARCH=x64;   SHA=a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb ;;
  aarch64) ARCH=arm64; SHA=eff65261156100e5d94a6b3dec313d532fddfe19ae1590bf7a2b4f2699128356 ;;
  *) echo "gitleaks: unsupported architecture $(uname -m)" >&2; exit 1 ;;
esac

if command -v gitleaks >/dev/null 2>&1 && gitleaks version | grep -qx "$VERSION"; then
  echo "gitleaks $VERSION already installed"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FILE="gitleaks_${VERSION}_linux_${ARCH}.tar.gz"
curl -fsSL -o "$TMP/$FILE" "https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/${FILE}"
echo "$SHA  $TMP/$FILE" | sha256sum -c -
tar -xzf "$TMP/$FILE" -C "$TMP" gitleaks
sudo install -m 0755 "$TMP/gitleaks" /usr/local/bin/gitleaks
gitleaks version
