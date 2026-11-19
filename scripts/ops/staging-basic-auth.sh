#!/usr/bin/env bash
# Replaces the Basic Auth login and password of staging (the browser popup before the site).
# Runs ON THE VPS as `deploy`; asks everything, nothing is passed as an argument.
#   scp -i ~/.ssh/sfl-deploy scripts/ops/staging-basic-auth.sh deploy@<host>:~/
#   ssh -t -i ~/.ssh/sfl-deploy deploy@<host> bash ~/staging-basic-auth.sh
# What it does: backs up /opt/edge/.env, swaps SFL_STAGING_AUTH_USER/HASH, recreates the edge
# Caddy, checks the new login against the real site, and restores the backup if the check fails.
set -euo pipefail

EDGE_DIR=${EDGE_DIR:-/opt/edge}
ENV_FILE=$EDGE_DIR/.env
die() { echo "ОШИБКА: $*" >&2; exit 1; }
[ -f "$ENV_FILE" ] || die "нет файла $ENV_FILE"

read -r -p 'Логин Basic Auth [staging]: ' U
U=${U:-staging}
[[ $U =~ ^[A-Za-z0-9._-]{3,32}$ ]] || die 'логин: 3–32 символа, только буквы, цифры, . _ -'
read -r -s -p 'Новый пароль: ' P; echo
read -r -s -p 'Ещё раз: ' P2; echo
[ "$P" = "$P2" ] || die 'пароли не совпали'
((${#P} >= 16)) || die 'пароль короче 16 символов'
[[ $P =~ ^[[:graph:]]+$ && $P != *\"* && $P != *\\* ]] || die 'в пароле пробелы, кавычка " или обратный слэш: уберите их в генераторе'

# The password is in the arguments of this one command for a moment (single-user VPS)
H=$(docker run --rm caddy:2 caddy hash-password --plaintext "$P" | tail -n1)
[[ $H == '$2a$'* ]] || die 'хеш не получен, ничего не изменено'

BACKUP=$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)
cp -p "$ENV_FILE" "$BACKUP"
chmod 600 "$BACKUP"

TMP=$(mktemp "$ENV_FILE.XXXXXX")
{ grep -v '^SFL_STAGING_AUTH_' "$ENV_FILE" || true; } > "$TMP"
# $ is written as $$: docker compose would take a single one for a variable
printf 'SFL_STAGING_AUTH_USER=%s\nSFL_STAGING_AUTH_HASH=%s\n' "$U" "${H//\$/\$\$}" >> "$TMP"
chmod 600 "$TMP"
mv "$TMP" "$ENV_FILE"

restore() {
  cp -p "$BACKUP" "$ENV_FILE"
  (cd "$EDGE_DIR" && docker compose up -d >/dev/null)
  echo "Старый вход возвращён из $BACKUP" >&2
}

echo 'Пересоздаю Caddy...'
(cd "$EDGE_DIR" && docker compose up -d) || { restore; die 'compose не запустился'; }

DOMAIN=$(grep '^SFL_STAGING_DOMAIN=' "$ENV_FILE" | cut -d= -f2-)
[ -n "$DOMAIN" ] || { restore; die 'в .env нет SFL_STAGING_DOMAIN'; }
URL="https://$DOMAIN/"
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" "$@" || true; }

ANON=000; AUTH=000
for _ in 1 2 3 4 5 6 7 8 9 10; do
  ANON=$(code "$URL")
  AUTH=$(printf 'user = "%s:%s"\n' "$U" "$P" | code -K - "$URL")
  [ "$ANON" = 401 ] && [ "$AUTH" != 401 ] && [ "$AUTH" != 000 ] && break
  sleep 2
done
echo "Без пароля: $ANON (ожидаю 401). С новым паролем: $AUTH (ожидаю 200)."
if [ "$ANON" = 401 ] && [ "$AUTH" != 401 ] && [ "$AUTH" != 000 ]; then
  echo "Готово. Логин: $U. Старые копии .env: $ENV_FILE.bak-* (удалите, когда убедитесь, что всё работает: rm $ENV_FILE.bak-*)."
else
  restore
  die 'новый вход не заработал'
fi
