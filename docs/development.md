# Разработка: окружение, данные, проверки

Подробности для тех, кто уже прошёл «Быстрый старт» в [README](../README.md). Часть разделов на английском: переписываются по мере правок.

## Dev-container

Local development without installing Node.js or MongoDB on your machine. Config: [.devcontainer/](../.devcontainer/).

**What is inside:** Node.js 22 and pnpm (via corepack), MongoDB 7 with synthetic data, a self-signed dev certificate in `ssl/`, and `server-nest/.env` with dev values.

### Requirements

- Docker Desktop or Rancher Desktop with the `dockerd (moby)` engine (on Windows with WSL2).
- VS Code with the Dev Containers extension, or Antigravity (its own dev containers extension is built in).
- The client calls the API at `https://sfl.com:3001`. Add this line to the hosts file (on Windows: `C:\Windows\System32\drivers\etc\hosts`):
  ```
  127.0.0.1 sfl.com
  ```

### Start

1. Open the repository in VS Code → **Dev Containers: Reopen in Container**. The first build installs dependencies, creates the certificate, `.env` and the seed (see `.devcontainer/post-create.sh`).
2. Server: `cd server-nest && pnpm start:dev`
3. Client: `cd client && pnpm dev` (`angular.json` sets `host: 0.0.0.0`: Docker publishes the port, so `ng serve` must listen on all interfaces, not only on localhost)
4. Open `https://sfl.com:3001/rest` (Swagger) and accept the self-signed certificate. Then open `https://sfl.com:4200` and accept it again.
5. Sign in as `admin@sfl.local` / `admin`.

The port is required: `https://sfl.com` without it goes to port 443. In Rancher Desktop that port is taken by its Traefik, which answers `404 page not found`.

Claude Code is installed in the container (the `claude` CLI and the VS Code extension). Sign in once with `claude` in the container terminal. The login lives in the `claude-config` volume and survives rebuilds.

Git needs no login: the editor passes your `.gitconfig` and the Windows credential manager into the container while its window is attached.

### Editor commands

Run them from the command palette (`Ctrl+Shift+P`), category **Dev Containers**.

| Command                         | What it does                                                                                                                                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reopen in Container**         | The main command. Reads `devcontainer.json`, builds the image with features (Claude Code), creates the containers, runs `post-create.sh` once and attaches the editor. If the container already exists, it only starts and attaches it. |
| **Reopen Folder Locally**       | Returns the window to the host. The containers keep running.                                                                                                                                                                            |
| **Rebuild Container**           | VS Code only. Recreates the container from the current config. Antigravity has no such command: see [Rebuild](#rebuild).                                                                                                                |
| **Attach to Running Container** | Attaches to any running container as it is: no config, no features, no `post-create.sh`. Use it to look into other containers (for example `sfl-dev-mongodb-1`), not for the workspace.                                                 |
| **Open Folder in Container**    | Same as Reopen in Container, but for a folder you pick.                                                                                                                                                                                 |
| **Show … Dev Containers Log**   | The build and start log. Look here first when the container does not start.                                                                                                                                                             |

### Rebuild

Needed after changes in `.devcontainer/` (compose, features, `post-create.sh`). In VS Code: **Dev Containers: Rebuild Container**. In Antigravity, by hand:

1. **Reopen Folder Locally**.
2. On the host:
   ```powershell
   docker rm -f sfl-dev-workspace-1
   # only after changing features: drop the built image too
   docker images "vsc-sfl-*" -q | % { docker rmi -f $_ }
   ```
3. **Reopen in Container**. It creates a new container and runs `post-create.sh`.

The image is built from [.devcontainer/Dockerfile](../.devcontainer/Dockerfile): the Microsoft base image ships an old Node 22, so the Dockerfile installs a pinned Node (checksum verified). Angular CLI 22 needs `engines.node` of the root `package.json`; if the container has an older Node, `post-create.sh` stops with a hint. To bump Node, change `NODE_VERSION` and both checksums in the Dockerfile, then rebuild.

MongoDB runs as a one-node replica set `rs0` ([ADR 0014](adr/0014-mongodb-replica-set.md)): the `mongodb` service starts with `--replSet rs0`, its healthcheck runs `rs.initiate()` on the first start and reports healthy only when the node is PRIMARY. After pulling this change recreate the service on the host (`docker compose -p sfl-dev up -d mongodb`); the data volume is kept. `DATABASE_URL` in the new `server-nest.env` has `?replicaSet=rs0`; an existing `server-nest/.env` without it keeps working. Server tests use `MongoMemoryReplSet`. For the VPS use the same image and the same `--replSet rs0` flags.

Volumes are kept: the database, `node_modules`, the pnpm store and the Claude login. Leave `sfl-dev-mongodb-1` as is.

Not everything needs a rebuild:

| Changed                                                                                                                                                                         | What to do                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Image, `features`, the `workspace` service in compose (env, mounts, ports; for example a volume for a new `packages/*/node_modules`), or you want `post-create.sh` to run again | Rebuild                                                |
| `extensions` list                                                                                                                                                               | Install them (see Troubleshooting), no rebuild         |
| `settings`, `portsAttributes`                                                                                                                                                   | **Developer: Reload Window**                           |
| `package.json` dependencies                                                                                                                                                     | `pnpm install` in the container                        |
| `server-nest/.env`                                                                                                                                                              | Restart the server                                     |
| The `mongodb` service in compose                                                                                                                                                | On the host: `docker compose -p sfl-dev up -d mongodb` |

### Hybrid mode: editor and agent on the host

The editor, git and Claude Code stay on Windows; only Node.js and MongoDB run in the containers. The repository is mounted, so edits on the host reach the running server at once. Run on the host:

```powershell
docker compose -f .devcontainer/docker-compose.yml up -d
docker exec -u node -w /workspaces/sfl sfl-dev-workspace-1 bash .devcontainer/post-create.sh   # first time only

docker exec -it -u node -w /workspaces/sfl/server-nest sfl-dev-workspace-1 pnpm start:dev
docker exec -it -u node -w /workspaces/sfl/client      sfl-dev-workspace-1 pnpm dev

docker compose -f .devcontainer/docker-compose.yml stop    # stop; start brings it back
```

- A container created by `docker compose up` has no features and was not made by the editor. Before **Reopen in Container**, remove it: `docker rm -f sfl-dev-workspace-1`. Otherwise it fails with `No such image: vsc-sfl-…`.
- `node_modules` live in volumes, so the host has none: the editor on the host shows unresolved imports until you install Node.js there and run `pnpm install`.

### Troubleshooting

- **`https://sfl.com` answers `404 page not found`**: the port is missing, see [Start](#start).
- **The page does not open at all**: the server or client is not running, or the container was created before ports were published in compose. Rebuild.
- **`git status` lists almost every file as modified**: `post-create.sh` did not run, so git in the container does not know the files have Windows line endings. Run `bash .devcontainer/post-create.sh` in the container.
- **Extensions from `devcontainer.json` are missing (Antigravity)**: Antigravity installs only some of them, or none, when it creates the container. Install the rest in the container with the editor CLI, for example `$(ls ~/.antigravity-ide-server/bin/*/bin/remote-cli/antigravity-ide) --install-extension dbaeumer.vscode-eslint`, or use **Install in Container** in the Extensions view. Then run **Developer: Reload Window**.
- **`certificate is not yet valid` (TLS to Atlas or any HTTPS host)**: the clock of the WSL2 VM drifted, for example after sleep. The container has no right to set the time; fix it on the host in PowerShell: `wsl -d rancher-desktop -u root date -u -s ((Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss'))`. If that fails, quit Rancher Desktop, run `wsl --shutdown` and start it again. Check with `date -u` in the container.
- **A connection to Atlas fails with a generic "IP whitelist" error**: check the clock first (the line above), then add your public IP (`curl -s https://api.ipify.org`) in Atlas → Network Access.
- **The container uses a lot of memory**: most of it is the editor servers inside the container (TypeScript, Angular Language Service, ESLint, extensions host, about 3 GB together; `docker stats` shows it). Close the window when you are done, or switch off a language service you do not need. The server tests start a `mongod` per file; `vitest.config.ts` keeps it at three files at a time (the peak was 3.4 GB with all cores, now 1.9 GB). A killed test run can leave `/tmp/mongo-mem-*` directories (200 MB each): delete them when no `mongod` is running.
- **The editor asks to trust the repository (unsafe ownership)**: the mounted folder belongs to `root`, you work as `node`. `post-create.sh` marks `/workspaces/sfl` as safe; if it did not run, run it as above.

### Data

- Seed: roles, an admin, 12 players (`player01@sfl.local`…) and teams BMW and HONDA. All data is synthetic.
- Games are not seeded by `seed.cjs`: the server calculates their metadata. Start server-nest, then run `node .devcontainer/seed-games.cjs`: it creates 3 synthetic games through the API as `admin@sfl.local` (skipped if games exist; do not use on a prod copy). More games: create them in the client as admin.
- Reset the database and seed again: `node .devcontainer/seed.cjs --reset`
- Dump all collections to `_dumps/<db>-<date>-<time>/` (ignored by git): `node .devcontainer/db-dump.cjs`. Pass a directory to dump somewhere else.
- Restore a dump: `node .devcontainer/db-restore.cjs _dumps/<dir>`. It only fills empty collections; add `--drop` to replace existing ones. Compass exports (`<db>.<collection>.json`) restore the same way.
- In local development the server makes sure that `admin@sfl.local` / `admin` exists and is an ADMIN: it is created at every start if it is missing, also on a copy of prod data (`STAGE=development`, never in production; an existing user and its password are not touched, see `DevAdminSeeder`). So after a prod dump you can sign in as `admin@sfl.local` too, or with your own prod account.
- MongoDB data lives in the `mongodb-data` volume and survives container rebuilds. To delete everything, run on the host: `docker compose -p sfl-dev down -v`

### Working with a copy of prod data

A way to develop on real data. For everyday work and tests use the anonymized set (next section); this one is for what only real data shows. The dump holds real emails and password hashes: keep it in `_dumps/` (ignored by git), never commit or share it, and do not paste its content into chats.

1. In Atlas create a database user with the role **Read any database** only (Security → Database Access). Use a password of letters and digits, or percent-encode `@ : / ? # %`.
2. In the container terminal. The connection string goes into a variable without echo, so it stays out of the shell history. It has no path and no `?options`; the database is `prod`:
   ```bash
   read -rs ATLAS_URL    # paste mongodb+srv://<user>:<password>@<cluster>.mongodb.net, press Enter
   DATABASE_URL="$ATLAS_URL" DATABASE_DB=prod node .devcontainer/db-dump.cjs _dumps/prod-$(date +%F)
   unset ATLAS_URL
   ```
3. Load it into the local database. This **replaces** the collections, local changes are lost:
   ```bash
   node .devcontainer/db-restore.cjs _dumps/prod-<date> --drop
   ```

Repeat both steps to refresh. The dump of 2026-11-12 held 16 games, 232 players, 233 users, 2 teams and 2 roles. To go back to synthetic data: `node .devcontainer/seed.cjs --reset`.

### Anonymized copy of prod data

[S11.2](backlog/E11-dx-docs/S11.2.md). From a dump made as above, a copy without personal data: names, emails, avatars, ages, nicknames, password hashes and the free text of games are replaced, ids, links, scores and statistics stay.

```bash
node .devcontainer/anonymize-dump.cjs _dumps/prod-<date>     # -> _dumps/prod-<date>-anonymized/
node .devcontainer/db-restore.cjs _dumps/prod-<date>-anonymized --drop
```

Sign in as `admin@sfl.local` / `admin` (the first ADMIN of the dump); everybody else has the password `dev`. The script prints counts, never values, and checks that no personal value of the input is left in the output (exit code 2 if one is). The result stays in `_dumps/` (ignored by git): look at it yourself before you decide to share it.

The same set feeds the golden-master test of the statistics ([S2.2](backlog/E02-tests-ci/S2.2.md)): `cd server-nest && pnpm exec vitest run test/golden`. It calculates the metadata of every game and player again with the real code, writes the differences from the stored values to `golden-report.json` and compares the result with `golden-baseline.json` (both next to the dump; the baseline is created on the first run, delete it to accept a deliberate change of the rules). Without the dump the test is skipped. The path is `SFL_GOLDEN_DIR`.

### Without the dev-container

Needs Node.js `^22.22.3`, pnpm (`corepack enable`) and MongoDB 7. Then:

```
pnpm install                                   # once, from the root: installs the whole workspace
cp server-nest/.env.example server-nest/.env   # fill in the values (the dev ones are in .devcontainer/server-nest.env)
node .devcontainer/seed.cjs                    # synthetic data, optional
cd server-nest && pnpm start:dev               # API, port 3001
cd client && pnpm dev                          # client, https, port 4200
```

Client variables (`APP_ENV`, `API_URL`) are listed in [client/.env.example](../client/.env.example) and described in «Окружения клиента» below. Per-package notes: [server-nest/README.md](../server-nest/README.md).

## Окружения клиента

Адрес API подставляется при сборке скриптом [client/scripts/set-env.mjs](../client/scripts/set-env.mjs) (запускается из `predev`, `prebuild`, `pretest`, `prelint`) в неотслеживаемый файл `client/src/environments/api-url.generated.ts`. Задаётся переменными `APP_ENV` и `API_URL`:

| `APP_ENV`              | Где             | `API_URL` по умолчанию      |
| ---------------------- | --------------- | --------------------------- |
| `local` (по умолчанию) | dev-container   | `https://sfl.com:3001/rest` |
| `preview`              | предпросмотр PR | тот же origin: `/rest`      |
| `staging`              | staging         | тот же origin: `/rest`      |
| `production`           | прод            | тот же origin: `/rest`      |

Пример: `APP_ENV=staging API_URL=https://staging.example.com/rest pnpm build:prod`. Поле в коде называется `environment.apiUrl`.

## Pre-commit хуки

`pnpm install` в корне ставит husky (скрипт `prepare`, в dev-container это делает post-create). Хук [.husky/pre-commit](../.husky/pre-commit) запускает `lint-staged` ([lint-staged.config.mjs](../lint-staged.config.mjs)) только по staged-файлам и `gitleaks` по staged-изменениям:

- `client/**/*.ts`: `eslint --fix`, затем `prettier --write` (конфиг клиента);
- `server-nest/**/*.ts`: `eslint --fix` (форматирует eslint-plugin-prettier, конфиг сервера);
- остальные `*.{html,scss,json,md}`: `prettier --write`;
- ошибка ESLint, которую нельзя исправить автоматически, или найденный секрет отклоняют коммит.

Хуки быстрые и не заменяют `pnpm check`: он проверяет весь код. Не обходите хук через `--no-verify` без причины в описании PR. На bind-mount Windows хук занимает ~12 с из-за медленного git.

## Проверка перед коммитом

Из корня репозитория:

```bash
pnpm check                      # lint, типы, тесты, prod-сборка, audit и поиск секретов; падает на первой ошибке
pnpm check --all                # прогнать всё и показать сводку
pnpm check --skip=client:build  # пропустить шаг
pnpm check --include-known      # включить шаги, которые падают по известным причинам
```

Команда ничего не правит и не ходит в сеть и в базу. Пропускаемых шагов сейчас нет (список `KNOWN` в [scripts/check.mjs](../scripts/check.mjs) пуст).
