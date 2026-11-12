# Архив: сезонная статистика SFL 2011–2023

Файлы перенесены из удалённого legacy-сервера `server/src/assets/` (S1.10). Последний коммит, где `server/` есть целиком вместе с миграциями: `9214b56`.

| Файл | Что внутри |
|---|---|
| `SFL.json` | статистика игроков по сезонам 2011–2023: `{ "<год>": { "<никнейм>": { games, goals, passes, score, mvp } } }` |
| `SFL (array).json` | то же, но сезон — массив `{ name, games, goals, passes, score, mvp }` |
| `SFL (json-check-all).json` | вариант для проверки всех сезонов, формат как у `(array)` |
| `2023.txt` | ручная запись тура 2023/24: составы, голы+пасы, MVP, цепочки передач |

Источник: данные собраны вручную со страниц karnatovsky.sport, чтобы понять структуру базы. Значения хранятся строками, пустые поля — `null`.

Типы, под которые писались миграции:

```ts
type TPlayerJson = {
  name: string;
  games: number | null;
  goals: number | null;
  passes: number | null;
  score: number | null;
  mvp: boolean | null;
};
type TSFLJson = Record<'2011' | '2012' | /* … */ '2023', TPlayerJson[]>;
```

Зачем хранить: независимый источник для сверки в [S4.4](../../backlog/E04-migration-design/S4.4.md) и для тестовых данных в [S11.2](../../backlog/E11-dx-docs/S11.2.md). Старые миграции (TypeORM/SQLite) раскладывали `games` по субботам от `START_SEASON_AT`; для Mongo они не подходят.
