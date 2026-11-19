# Деплой SFL на MVPS через GitHub

Целевая схема из [ADR 0001](../adr/0001-monolith-nest-angular-ssr-on-vps.md), [S7.1](../backlog/E07-vps-hosting/S7.1.md), [S7.2](../backlog/E07-vps-hosting/S7.2.md), [S7.6](../backlog/E07-vps-hosting/S7.6.md), [S7.9](../backlog/E07-vps-hosting/S7.9.md):

```
push в main → GitHub Actions (check + сборка образа) → GHCR → ssh на VPS → docker compose pull && up -d
```

**Статус (2026-11-18):** файлы готовы: [Dockerfile](../../Dockerfile), [docker-compose.yml](../../docker-compose.yml), [deploy/caddy/sfl.caddy](../../deploy/caddy/sfl.caddy), [infra/edge/](../../infra/edge/), [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml). Сборка образа в Docker и сам workflow ещё не запускались (в dev-container нет Docker): проверены сборка клиента и сервера и запуск прод-сборки с раздачей SPA, `GET /rest/version` (он же health-check) и JSON-404 на неизвестный `/rest/*`. Первый деплой на staging — проверка всей цепочки.

## Что делаю я (агент), что вы

| Кто      | Что                                                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Агент    | `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `deploy/caddy/sfl.caddy`, `infra/edge/`, workflow Actions, правка `main.ts` под HTTP за прокси, health-check, runbook. |
| Владелец | Домен и DNS, ssh на сервер, установка Docker, ключи и секреты в GitHub, прод-значения `.env`, нажатие «Approve» на прод-деплой. Прод-базу и секреты агент не трогает.       |

## Шаг 1. Домен (нужен до выпуска HTTPS)

1. Купите домен (открытый вопрос 5 в [README бэклога](../backlog/README.md)).
2. В DNS создайте A-записи на IP VPS: `example.com` и `staging.example.com` (замените на свои). TTL поставьте 300 секунд.

## Шаг 2. Подготовка сервера (один раз, ~30–60 минут)

Под root по ssh:

```bash
# 1. Обновить систему и поставить Docker из официального репозитория
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh          # Docker Engine + compose plugin

# 2. Пользователь для деплоя без sudo, в группе docker
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# 3. Папки
mkdir -p /opt/edge /opt/sfl/prod /opt/sfl/staging
chown -R deploy:deploy /opt/edge /opt/sfl

# 4. Общая сеть для прокси и проектов
docker network create edge

# 5. Firewall: только ssh, http, https
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable

# 6. Ротация логов Docker (чтобы не забить диск)
cat >/etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
EOF
systemctl restart docker
```

Затем отключите вход по паролю и под root (`/etc/ssh/sshd_config`: `PasswordAuthentication no`, `PermitRootLogin no`), **только после** проверки входа под `deploy` по ключу.

Примечание: группа `docker` фактически даёт root-права на машине. Это принятый компромисс для одного владельца; ключ деплоя храним только в GitHub Secrets.

## Шаг 3. Ключ деплоя

На своей машине (не на сервере):

```bash
ssh-keygen -t ed25519 -f sfl-deploy -C "sfl-github-deploy" -N ""
ssh-copy-id -i sfl-deploy.pub deploy@<IP-сервера>     # или добавить .pub в ~deploy/.ssh/authorized_keys
```

Приватный ключ `sfl-deploy` пойдёт в GitHub Secrets (шаг 4), потом удалите локальную копию.

## Шаг 4. GitHub

В репозитории `bgrmv/sfl`, Settings:

1. **Environments**: создайте `staging` и `production`. У `production` включите **Required reviewers** (вы сами), это и есть кнопка подтверждения прода.
2. **Secrets** (для каждого окружения или общие):
   - `DEPLOY_HOST` — IP или домен сервера;
   - `DEPLOY_USER` — `deploy`;
   - `DEPLOY_SSH_KEY` — содержимое приватного ключа;
   - `DEPLOY_KNOWN_HOSTS` — вывод `ssh-keyscan <IP>` (защита от подмены сервера).
3. **Packages**: образ уходит в GHCR (`ghcr.io/bgrmv/sfl`) под `GITHUB_TOKEN`, отдельный токен для публикации не нужен. Для `docker pull` на сервере либо сделайте пакет публичным (в образе нет секретов), либо выпустите PAT с правом `read:packages` и выполните на сервере `docker login ghcr.io`.

## Шаг 5. Окружение приложения на сервере

В `/opt/sfl/prod/.env` и `/opt/sfl/staging/.env` (права `chmod 600`, в git не попадают). Переменные — как в `server-nest/.env.example`:

- `STAGE=production`, `PORT=3001`;
- `DATABASE_URL`, `DATABASE_DB` — **разные базы** для staging и prod (staging никогда не пишет в прод);
- `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` — по 32+ символа, разные, сгенерируйте `openssl rand -base64 48`;
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` — в Google Cloud Console добавьте redirect URI с боевым доменом;
- `CLIENT_HOSTNAME` — боевой домен; `MEDIA_DIR` — путь к volume.

База: сначала MongoDB Atlas (`DATABASE_URL`), контейнер `mongodb` добавляется позже ([S6.9](../backlog/E06-data-migration/S6.9.md)). Перед первым переездом данных сделайте бэкап ([mongo-backup.md](mongo-backup.md)).

## Шаг 6. Edge-прокси (один раз)

Workflow сам копирует `infra/edge/` и `deploy/caddy/sfl.caddy` на сервер и перезагружает Caddy. Один раз вручную создайте `/opt/edge/.env`:

```
SFL_DOMAIN=example.com
SFL_STAGING_DOMAIN=staging.example.com
ACME_EMAIL=you@example.com
SFL_STAGING_AUTH_USER=staging
SFL_STAGING_AUTH_HASH=<хеш из команды ниже, каждый $ записан как $$>
```

Staging закрыт Basic Auth ([S7.10](../backlog/E07-vps-hosting/S7.10.md)), открыт только `/rest/version` для проверки деплоя. Без этих двух переменных `docker compose up` в `/opt/edge` не стартует. Caddy хранит не пароль, а bcrypt-хеш. Блок ниже на сервере (под `deploy`) спрашивает пароль без вывода на экран, делает хеш, удваивает `$` (иначе compose сломает хеш) и дописывает обе строки в `/opt/edge/.env`; пароль ни в историю shell, ни в аргументы процессов не попадает:

```bash
read -r -s -p 'Пароль staging: ' P; echo
H=$(printf '%s\n%s\n' "$P" "$P" | docker run --rm -i caddy:2 caddy hash-password 2>/dev/null | tail -n1)
unset P
case "$H" in '$2a$'*) ;; *) echo 'хеш не получен, пароль не записан' >&2; false ;; esac &&
{ printf 'SFL_STAGING_AUTH_USER=staging\nSFL_STAGING_AUTH_HASH=%s\n' "${H//\$/\$\$}"; } >> /opt/edge/.env &&
chmod 600 /opt/edge/.env && unset H
```

Проверка: `cd /opt/edge && docker compose config | grep SFL_STAGING_AUTH`: хеш должен начинаться с одинарного `$2a$`. Пароль сохраните в менеджере паролей.

Порядок: сначала добавьте обе переменные в `/opt/edge/.env`, потом выкатывайте этот коммит. Иначе шаг «Reload edge proxy» упадёт, а старые маршруты продолжат работать.

Caddy слушает 80/443 и сам выпускает сертификаты Let's Encrypt, DNS из шага 1 должен уже указывать на сервер.

### Первый администратор на staging

База `sfl_staging` после первого деплоя пуста, а `DevAdminSeeder` при `STAGE=staging` не работает. Администратора создаёт seed с вашим email и паролем, **не** `admin@sfl.local`. Запуск из dev-container (не на сервере):

1. В Atlas, Network Access, временно добавьте свой текущий IP; после seed удалите.
2. Выполните, подставив свои значения (пароль 16+ символов; в историю shell он не должен попасть, поэтому начните строку с пробела или задайте переменные через `read -s`):

```bash
DATABASE_URL='<строка подключения Atlas>' DATABASE_DB=sfl_staging \
SEED_ADMIN_EMAIL='<ваш email>' SEED_ADMIN_PASSWORD='<пароль>' \
node .devcontainer/seed.cjs
```

Seed на непустой базе ничего не делает. **Не добавляйте `--reset`**: он удалит базу целиком.

## Шаг 7. Обычный деплой (после реализации S7.6)

- **Staging:** слияние в `main` → CI → сборка образа `ghcr.io/bgrmv/sfl:sha-<коммит>` → ssh на сервер → `cd /opt/sfl/staging && docker compose pull && docker compose up -d` → проверка `GET /rest/health`.
- **Prod:** в Actions запускаете workflow «Deploy prod», подтверждаете в окружении `production`, выкатывается тот же образ, что прошёл staging.
- Релиз версии — `pnpm release <patch|minor|major>` ([ADR 0022](../adr/0022-semver-release-version-and-markdown-release-notes.md)).

### Откат

```bash
ssh deploy@<сервер>
cd /opt/sfl/prod
# в .env или compose заменить тег на предыдущий sha-<коммит>
docker compose pull && docker compose up -d
```

Или перезапустить workflow деплоя на предыдущий коммит.

### Диагностика

```bash
docker compose -f /opt/sfl/prod/docker-compose.yml ps
docker compose -f /opt/sfl/prod/docker-compose.yml logs --tail=100 app
curl -fsS https://<домен>/rest/health
```

## Чек-лист перед первым выкатом

- [ ] Домен куплен, DNS указывает на VPS.
- [ ] Docker, `deploy`, firewall, ssh только по ключу.
- [ ] Секреты и окружения в GitHub настроены, у `production` включено подтверждение.
- [ ] `.env` на сервере заполнены, базы staging и prod разные.
- [ ] Сделан бэкап прод-базы, настроены регулярные ([S7.8](../backlog/E07-vps-hosting/S7.8.md)).
- [ ] Redirect URI Google OAuth содержит боевой домен.
