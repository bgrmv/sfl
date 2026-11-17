# OpenAPI выводится из схем zod, имена типов по домену

Статус: принято
Дата: 2026-11-17

Форма данных API объявляется один раз как схема zod в `@sfl/schemas` ([ADR 0010](0010-zod-mini-in-shared-schemas.md)). Из неё получаются типы TypeScript (`z.infer`), проверка запросов на сервере и формы на клиенте. Описание для Swagger раньше писалось руками в классах `@ApiProperty` и могло разойтись со схемой.

## Решение

1. **Источник один: схема zod.** Спецификация OpenAPI 3.0 строится из схем встроенным `z.toJSONSchema(schema, { target: 'openapi-3.0' })` (zod 4), без `nestjs-zod` и других зависимостей. Версия 3.0, а не 3.1, потому что её понимает `@nestjs/swagger` 12 и Swagger UI без доработок.
2. **Пакет `@sfl/schemas`** отдаёт `openApiSchemas()` (раздел `components.schemas`: `Player`, `Game`, `Team`, `GameInput`, `GameUpdateInput`, `TeamInput`, `SignInInput`, `ApiError`, `ErrorResponse`) и `openApiRef(имя)`. Запросы описываются стороной `input`, ответы стороной `output`.
3. **Сервер** собирает документ в `server-nest/src/openapi.ts` (`buildOpenApiDocument`): маршруты берутся из контроллеров, компоненты из схем (они перекрывают одноимённые классы с декораторами), к каждой операции добавлен ответ `default` с телом ошибки `ErrorResponse` ([ADR 0011](0011-result-response-format.md)). Тела `POST` и `PUT /games` и `PATCH /games/:id` ссылаются на компоненты через `@ApiBody({ schema: openApiRef('GameInput') })`.
4. **Проверка расхождений.** Документ закоммичен как `server-nest/openapi.json`; тест `test/api/openapi.test.ts` (входит в `pnpm check`) падает, если документ из кода отличается от файла. Обновить: `UPDATE_OPENAPI=1 pnpm vitest run test/api/openapi.test.ts` и посмотреть diff.

## Правила имён и размещения

- Схема называется `xSchema`, тип `X = z.infer<typeof xSchema>` (запрос: `XInput`, ответ: `X`), формы для экранов `xFormSchema` / `XForm`. Без префиксов `I` и `T` и без параллельных `interface` для того же объекта.
- Отдельные схемы запроса (создание, замена, обновление) и ответа; общие поля выносятся в `shape`.
- Mongoose-схемы остаются слоем хранения (класс с `@Prop`) и не выдаются как контракт; к доменному типу их приводит явный маппер.
- Старые имена клиента (`IGameDTO`, `TPlayerFinal` и подобные) переводятся на эти правила отдельной историей ([S3.32](../backlog/E03-architecture/S3.32.md)), новый код следует правилам сразу.

## Инвентаризация (2026-11-17)

| Домен                     | Схема в `@sfl/schemas`                                                 | Тип на клиенте                                                                                          | Сервер                                                                                                |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Матч                      | `gameSchema`, `gameInputSchema`, `gameUpdateInputSchema`, `gameShape`  | `IGameDTO` (из `GameDTO`), `TGameFinal`, `IGameSettings` (пустой интерфейс)                             | DTO — те же схемы; класс `Game` (`@Prop`, `@ApiProperty`) для Mongoose; ответы успеха описывает класс |
| Статистика игрока в матче | `playerStatisticSchema`                                                | `IPlayerStatisticDTO` (псевдоним), `TPlayerStatisticFinal*` (шесть производных типов)                   | класс `PlayerStatistic`                                                                               |
| Игрок                     | `playerSchema`, `playersSchema`, `playerShape`, `playerUserShape`      | `IPlayerDTO` (псевдоним `PlayerDTO`), `TPlayerFinal`, `PlayerClient*` (три интерфейса), `TChosenPlayer` | `UpdatePlayerDTO`, `CreatePlayersDTO` — отдельные zod на сервере (обычный `zod`); класс `Player`      |
| Форма игрока              | `playerEditFormSchema` ([S3.16](../backlog/E03-architecture/S3.16.md)) | `PlayerEditForm`                                                                                        | нет (сервер проверяет `UpdatePlayerDTO`)                                                              |
| Команда                   | `teamSchema`, `teamInputSchema`, `teamInGameInputSchema`               | `ITeamDTO`, `TTeamFinal`, `ITeam`                                                                       | `TeamSaveDTO`, класс `Team`                                                                           |
| Капитан                   | нет                                                                    | `TCaptain`, `TCaptainSelection`                                                                         | нет (капитан — игрок с `isCaptain`)                                                                   |
| Пользователь              | `playerUserSchema` (публичная часть)                                   | в `IPlayerDTO.user`                                                                                     | классы `User`, `Role`, `Session`; `SetPasswordDTO`                                                    |
| Вход                      | `signInSchema`                                                         | `SignInInput`                                                                                           | `SignInDTO` в модуле auth                                                                             |
| Ошибка и ответ            | `apiErrorSchema`, `ApiResponse<T>`                                     | те же                                                                                                   | фильтр и перехватчик                                                                                  |

Расхождения: два набора схем создания игроков (`@sfl/schemas` не содержит `UpdatePlayerDTO` и `CreatePlayersDTO`, они живут в `server-nest`); `TCaptain` дублирует поля игрока; шесть производных типов статистики на клиенте нужны компонентам и подлежат пересмотру при переименовании.

## Последствия

- Описание API нельзя править руками: правка схемы меняет документ, тест требует обновить `openapi.json`.
- Остаётся перевести ответы успеха и оставшиеся классы с `@ApiProperty` на схемы, перенести `UpdatePlayerDTO` и `CreatePlayersDTO` в `@sfl/schemas`, привести имена типов клиента к правилам: [S3.32](../backlog/E03-architecture/S3.32.md).
