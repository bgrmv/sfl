# Индексы MongoDB: создание на проде и откат

Индексы объявлены в схемах Mongoose (`server-nest/src/entities/*/*.schema.ts`); Mongoose создаёт недостающие при старте сервера (`autoIndex`) и **никогда не удаляет** лишние. Дампы (`db-dump.cjs`, `mongodump` без `--db`-индексов в JSON) индексы не переносят. Отчёт: [perf-db-2026-11-17.md](../audits/perf-db-2026-11-17.md), история [S12.4](../backlog/E12-performance/S12.4.md).

## Что менялось (S12.4)

| Коллекция | Было                                          | Стало                                                                  |
| --------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `games`   | `number`, `season`, `{number, season}` unique | `season`, `{number, season}` unique, **`statistics.playerId`** (новый) |
| `players` | `nickname`, `user` unique                     | `user` unique                                                          |

Лишние `games.number_1` и `players.nickname_1` остаются в уже созданных базах, пока их не удалить.

## Порядок на проде

1. Свежий бэкап (`pnpm backup:prod`, [mongo-backup.md](mongo-backup.md)).
2. Выкатить версию сервера. При старте Mongoose построит `statistics.playerId_1`: коллекция `games` мала (сотни или тысячи документов), построение занимает секунды и не блокирует чтение.
3. Проверить: `db.games.getIndexes()` содержит `statistics.playerId_1`; `db.games.find({'statistics.playerId': <id>}).explain('executionStats')` показывает `IXSCAN`.
4. Через неделю без замечаний удалить лишние: `db.games.dropIndex('number_1')`, `db.players.dropIndex('nickname_1')`. Составной индекс начинается с `number`, поэтому запросы по `number` продолжают его использовать.

## Откат

- Новый индекс: `db.games.dropIndex('statistics.playerId_1')`. Единственная потеря — `DELETE /players/:id` снова читает игры подряд.
- Удалённые индексы вернуть: `db.games.createIndex({ number: 1 })`, `db.players.createIndex({ nickname: 1 })`. Пока код не требует их, на работу они не влияют.

## Локально

Достаточно запустить сервер: индекс появится сам. Удалить лишние: `db.games.dropIndex('number_1')` в `mongosh` на `mongodb://mongodb:27017/sfl`.
