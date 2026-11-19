#!/usr/bin/env bash
# Replaces the email and the password of the administrator of the app on staging
# (the Sign in form of the site, not the Basic Auth popup).
# Runs in the dev-container, not on the VPS: the database is in Atlas.
#   SFL_SSH=deploy@<host> bash scripts/ops/staging-admin.sh
# The address and the name of the database are read from /opt/sfl/staging/.env over ssh,
# so nothing is pasted; the script refuses any database except sfl_staging.
set -euo pipefail

: "${SFL_SSH:?задайте SFL_SSH, например: SFL_SSH=deploy@<адрес сервера> bash scripts/ops/staging-admin.sh}"
KEY=${SFL_SSH_KEY:-$HOME/.ssh/sfl-deploy}
die() { echo "ОШИБКА: $*" >&2; exit 1; }
cd "$(dirname "$0")/../.."

fetch() {
  local v
  v=$(ssh -i "$KEY" "$SFL_SSH" "grep -E '^$1=' /opt/sfl/staging/.env | tail -n1 | cut -d= -f2-")
  v=${v%\"}; v=${v#\"}; v=${v%\'}; v=${v#\'}
  printf '%s' "$v"
}

echo 'Читаю адрес базы с сервера...'
DATABASE_URL=$(fetch DATABASE_URL)
DATABASE_DB=$(fetch DATABASE_DB)
[ -n "$DATABASE_URL" ] || die 'DATABASE_URL не найден на сервере'
[ "$DATABASE_DB" = sfl_staging ] || die "DATABASE_DB на сервере: '$DATABASE_DB', а не sfl_staging. Ничего не изменено, напишите агенту."

read -r -p 'Текущий email администратора: ' OLD
read -r -p "Новый email (Enter, чтобы оставить $OLD): " NEW
NEW=${NEW:-$OLD}
[[ $NEW =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || die 'похоже, это не email'
read -r -s -p 'Новый пароль: ' P; echo
read -r -s -p 'Ещё раз: ' P2; echo
[ "$P" = "$P2" ] || die 'пароли не совпали'
((${#P} >= 16)) || die 'пароль короче 16 символов'

IP=$(curl -s --max-time 5 ifconfig.me || echo '(не удалось определить, откройте https://ifconfig.me)')
cat <<EOF

Нужен доступ к Atlas с вашего адреса. Atlas -> Database & Network Access -> Network Access ->
Add IP Address -> $IP (Delete after: 6 hours). Дождитесь статуса Active.
EOF
read -r -p 'Когда статус Active, нажмите Enter (Ctrl+C отменяет, ничего не изменено): ' _

DATABASE_URL=$DATABASE_URL DATABASE_DB=$DATABASE_DB \
OLD_ADMIN_EMAIL=$OLD SEED_ADMIN_EMAIL=$NEW SEED_ADMIN_PASSWORD=$P \
  node .devcontainer/rotate-admin.cjs

cat <<EOF

Готово. Теперь:
1. Войдите на сайте под $NEW и новым паролем; старый пароль входить не должен.
2. Atlas -> Network Access -> удалите добавленный IP.
EOF
