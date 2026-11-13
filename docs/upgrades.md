# Обновление зависимостей: текущие и целевые версии

> **Обновление 2026-11-13:** клиент уже на Angular 22 ([S1.4](backlog/E01-dependency-upgrades/S1.4.md)); таблицы `client/` ниже отражают состояние до этого шага.

Результат [S1.1](backlog/E01-dependency-upgrades/S1.1.md). Сняли 2026-11-13: Node 22.16.0, pnpm 9.12.3, команды `pnpm outdated` и `pnpm audit` в `client/` и `server-nest/`. Таблицы — снимок на эту дату, перед каждым шагом `pnpm outdated` надо повторить.

Колонка «Последняя стабильная» — то, что отдаёт реестр, а не решение. **Целевые версии выбираем по шагам** (раздел «Порядок») и фиксируем в истории каждого шага. Мажоры Angular идут по одному: 18 → 19 → 20 → 21 → 22, на каждом шаге `ng update` и зелёные проверки.

## Совместимость Angular, Node.js, TypeScript

| Angular | Node.js | TypeScript | RxJS |
|---|---|---|---|
| 22.x | ^22.22.3 \|\| ^24.15.0 \|\| ^26.0.0 | >=6.0.0 <6.1.0 | ^6.5.3 \|\| ^7.4.0 |
| 21.x | ^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0 | >=5.9.0 <6.0.0 | ^6.5.3 \|\| ^7.4.0 |
| 20.2–20.3 | ^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0 | >=5.8.0 <6.0.0 | ^6.5.3 \|\| ^7.4.0 |
| 20.0–20.1 | ^20.19.0 \|\| ^22.12.0 \|\| ^24.0.0 | >=5.8.0 <5.9.0 | ^6.5.3 \|\| ^7.4.0 |
| 18.x, 19.x | ^18.19 \|\| ^20.11 \|\| ^22 (Node 24 не поддерживается) | см. документацию версии | ^6.5.3 \|\| ^7.4.0 |

Node 22 (≥ 22.22.3) подходит для всей цепочки 18 → 22. Node 24 включаем после Angular 20 вместе с обновлением dev-контейнера.

## Известные крупные переходы

| Переход | Где | Зачем и что ломается | Историю ведёт |
|---|---|---|---|
| Angular 18 → 22, по одному мажору за шаг | `client/` | 18.x больше не получает патчей, в `@angular/core`, `compiler`, `common`, `router` открыты high-уязвимости без исправлений для 18. Затрагивает Material, CDK, NgRx, `zone.js`, TypeScript | [S1.4](backlog/E01-dependency-upgrades/S1.4.md) |
| Сборщик `@angular-devkit/build-angular:browser` → `@angular/build:application` | `client/angular.json` | Сейчас webpack (`browser`, `dev-server`, `karma`). `application` — esbuild/Vite, быстрее, нужен для SSR ([S7.5](backlog/E07-vps-hosting/S7.5.md)). Меняются `main` → `browser`, polyfills, `index`, прокси | [S1.4](backlog/E01-dependency-upgrades/S1.4.md) |
| ESLint 8 (`.eslintrc`) → 9/10 flat config, `typescript-eslint` 6 → 8, `angular-eslint` 18 → актуальный | оба пакета | `.eslintrc.json` и `.eslintrc.js` больше не поддерживаются новыми версиями, плагины переходят на `eslint.config.js` | [S1.6](backlog/E01-dependency-upgrades/S1.6.md) |
| valibot 0.29 → 1.x | `server-nest/` | Запланирован переход на zod; S1.8 отменена, миграцию делает [S1.12](backlog/E01-dependency-upgrades/S1.12.md). [Guide](https://valibot.dev/guides/migrate-to-v1/) | [S1.12](backlog/E01-dependency-upgrades/S1.12.md) |
| NestJS 10 → 12 (Express 5, `path-to-regexp` 8) | `server-nest/` | Новые маршруты-wildcard (`*` → `*splat`), изменения `@nestjs/serve-static`, `@nestjs/mongoose` 12 тянет Mongoose 9. Закрывает большинство серверных уязвимостей | [S1.7](backlog/E01-dependency-upgrades/S1.7.md) |
| Mongoose 8.2 → 9 | `server-nest/` | Сейчас 2 critical и 4 high в 8.2.0; патч доступен уже в 8.24.7. Мажор идёт вместе с `@nestjs/mongoose` 12 | [S1.7](backlog/E01-dependency-upgrades/S1.7.md), [S1.9](backlog/E01-dependency-upgrades/S1.9.md) |
| Karma/Jasmine → поддерживаемый раннер | `client/` | Karma объявлен deprecated. Раннер — Vitest или Jest, выбираем в S2.5 | [S2.5](backlog/E02-tests-ci/S2.5.md) |
| Vitest 2 → 5 (+ `unplugin-swc` 2) | `server-nest/` | В 2.1.4 — critical (в самом vitest и `tinypool`); исправления в 2.1.9 и 3.2.6. Конфиг и coverage-провайдер меняются между мажорами | [S1.9](backlog/E01-dependency-upgrades/S1.9.md) |
| TypeScript 5.4/5.6 → по таблице совместимости Angular | оба пакета | Реестр показывает 7.0.2, но Angular 22 требует TS `>=6.0 <6.1`, Angular 21 — `>=5.9 <6.0`, Angular 20 — `>=5.8 <6.0`. На клиенте TS обновляется шагами вместе с Angular, на сервере не выше 6.x, пока не проверено иное | [S1.4](backlog/E01-dependency-upgrades/S1.4.md), [S1.9](backlog/E01-dependency-upgrades/S1.9.md) |
| Node: `engines` `>=18` (клиент) | оба пакета | Фактическая среда — Node 22; движки и `.nvmrc` выровнять | [S1.2](backlog/E01-dependency-upgrades/S1.2.md) |

## `client/`: `pnpm outdated`

Устарело пакетов: 38, из них с мажорным скачком: 32.

| Пакет | Текущая | Последняя стабильная | Мажорный скачок | Migration guide |
|---|---|---|:-:|---|
| `@angular-devkit/build-angular` | 18.2.10 | 22.2.7 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular-eslint/builder` | 18.4.0 | 22.6.0 | **да** | [github.com](https://github.com/angular-eslint/angular-eslint/blob/main/CHANGELOG.md) |
| `@angular-eslint/eslint-plugin` | 18.4.0 | 22.6.0 | **да** | [github.com](https://github.com/angular-eslint/angular-eslint/blob/main/CHANGELOG.md) |
| `@angular-eslint/eslint-plugin-template` | 18.4.0 | 22.6.0 | **да** | [github.com](https://github.com/angular-eslint/angular-eslint/blob/main/CHANGELOG.md) |
| `@angular-eslint/schematics` | 18.4.0 | 22.6.0 | **да** | [github.com](https://github.com/angular-eslint/angular-eslint/blob/main/CHANGELOG.md) |
| `@angular-eslint/template-parser` | 18.4.0 | 22.6.0 | **да** | [github.com](https://github.com/angular-eslint/angular-eslint/blob/main/CHANGELOG.md) |
| `@angular/animations` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/cdk` | 18.2.10 | 22.2.7 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/cli` | 18.2.10 | 22.2.7 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/common` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/compiler` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/compiler-cli` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/core` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/forms` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/material` | 18.2.10 | 22.2.7 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/platform-browser` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/platform-browser-dynamic` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@angular/router` | 18.2.9 | 22.2.6 | **да** | [angular.dev](https://angular.dev/update-guide) |
| `@ngrx/component-store` | 18.1.0 | 22.0.1 | **да** | [ngrx.io](https://ngrx.io/guide/migration) |
| `@ngrx/operators` | 18.1.1 | 22.0.1 | **да** | [ngrx.io](https://ngrx.io/guide/migration) |
| `@ngrx/signals` | 18.1.0 | 22.0.1 | **да** | [ngrx.io](https://ngrx.io/guide/migration) |
| `@ngrx/store` | 18.1.0 | 22.0.1 | **да** | [ngrx.io](https://ngrx.io/guide/migration) |
| `@ngrx/store-devtools` | 18.1.0 | 22.0.1 | **да** | [ngrx.io](https://ngrx.io/guide/migration) |
| `@types/jasmine` | 5.1.4 | 7.0.0 | **да** | [github.com](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@typescript-eslint/eslint-plugin` | 6.19.0 | 8.72.2 | **да** | [typescript-eslint.io](https://typescript-eslint.io/users/dependency-versions) |
| `@typescript-eslint/parser` | 6.19.0 | 8.72.2 | **да** | [typescript-eslint.io](https://typescript-eslint.io/users/dependency-versions) |
| `date-fns` | 3.6.0 | 4.4.0 | **да** | [github.com](https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md) |
| `eslint` | 8.57.1 | 10.14.0 | **да** | [eslint.org](https://eslint.org/docs/latest/use/migrate-to-9.0.0) |
| `highcharts` | 11.4.8 | 13.1.1 | **да** | [www.highcharts.com](https://www.highcharts.com/blog/changelog/) |
| `highcharts-angular` | 4.0.1 | 5.4.1 | **да** | — |
| `jasmine-core` | 5.1.2 | 7.0.2 | **да** | [github.com](https://github.com/jasmine/jasmine/releases) |
| `karma-jasmine-html-reporter` | 2.1.0 | 2.3.0 | нет | — |
| `lodash-es` | 4.17.21 | 4.18.1 | нет | — |
| `prettier` | 3.2.5 | 3.10.1 | нет | — |
| `rxjs` | 7.8.1 | 7.8.2 | нет | — |
| `tslib` | 2.6.3 | 2.9.1 | нет | — |
| `typescript` | 5.4.5 | 7.0.2 | **да** | [devblogs.microsoft.com](https://devblogs.microsoft.com/typescript/) |
| `zone.js` | 0.14.10 | 0.16.3 | нет | — |

## `server-nest/`: `pnpm outdated`

Устарело пакетов: 37, из них с мажорным скачком: 27.

| Пакет | Текущая | Последняя стабильная | Мажорный скачок | Migration guide |
|---|---|---|:-:|---|
| `@nestjs/cli` | 10.3.2 | 12.0.12 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/common` | 10.3.3 | 12.5.0 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/config` | 3.2.0 | 12.1.1 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/core` | 10.3.3 | 12.5.0 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/jwt` | 10.2.0 | 12.0.4 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/mongoose` | 10.0.4 | 12.0.1 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/platform-express` | 10.3.3 | 12.5.0 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/schematics` | 10.1.1 | 12.0.13 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/serve-static` | 4.0.2 | 12.1.1 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/swagger` | 7.3.0 | 12.1.1 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@nestjs/testing` | 10.3.3 | 12.5.0 | **да** | [docs.nestjs.com](https://docs.nestjs.com/migration-guide) |
| `@types/cookie-parser` | 1.4.6 | 1.4.10 | нет | — |
| `@types/express` | 4.17.21 | 5.0.6 | **да** | [github.com](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@types/jsonwebtoken` | 9.0.6 | 9.0.10 | нет | — |
| `@types/node` | 20.11.20 | 26.6.6 | **да** | [github.com](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@types/supertest` | 6.0.2 | 7.2.1 | **да** | [github.com](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@typescript-eslint/eslint-plugin` | 6.21.0 | 8.72.2 | **да** | [typescript-eslint.io](https://typescript-eslint.io/users/dependency-versions) |
| `@typescript-eslint/parser` | 6.21.0 | 8.72.2 | **да** | [typescript-eslint.io](https://typescript-eslint.io/users/dependency-versions) |
| `cookie-parser` | 1.4.6 | 1.4.7 | нет | — |
| `date-fns` | 3.6.0 | 4.4.0 | **да** | [github.com](https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md) |
| `envalid` | 8.0.0 | 9.0.0 | **да** | [github.com](https://github.com/af/envalid/blob/main/CHANGELOG.md) |
| `eslint` | 8.57.0 | 10.14.0 | **да** | [eslint.org](https://eslint.org/docs/latest/use/migrate-to-9.0.0) |
| `eslint-config-prettier` | 9.1.0 | 10.1.8 | **да** | [eslint.org](https://eslint.org/docs/latest/use/migrate-to-9.0.0) |
| `eslint-plugin-prettier` | 5.1.3 | 5.5.7 | нет | — |
| `lodash` | 4.17.21 | 4.18.1 | нет | — |
| `mongoose` | 8.2.0 | 9.12.1 | **да** | [mongoosejs.com](https://mongoosejs.com/docs/migrating_to_9.html) |
| `nest-winston` | 1.9.7 | 2.0.0 | **да** | [github.com](https://github.com/gremo/nest-winston/releases) |
| `prettier` | 3.2.5 | 3.10.1 | нет | — |
| `reflect-metadata` | 0.2.1 | 0.2.2 | нет | — |
| `rxjs` | 7.8.1 | 7.8.2 | нет | — |
| `supertest` | 6.3.4 | 7.3.2 | **да** | [github.com](https://github.com/forwardemail/supertest/releases) |
| `ts-loader` | 9.5.1 | 9.6.2 | нет | — |
| `typescript` | 5.6.3 | 7.0.2 | **да** | [devblogs.microsoft.com](https://devblogs.microsoft.com/typescript/) |
| `unplugin-swc` | 1.6.0 | 2.0.0 | **да** | [github.com](https://github.com/egoist/unplugin-swc/releases) |
| `valibot` | 0.29.0 | 1.5.0 | **да** | [valibot.dev](https://valibot.dev/guides/migrate-to-v1/) |
| `vitest` | 2.1.4 | 5.1.0 | **да** | [vitest.dev](https://vitest.dev/guide/migration) |
| `winston` | 3.17.0 | 3.19.0 | нет | — |

## `pnpm audit`

| Пакет | critical | high |
|---|:-:|:-:|
| `client/` | 5 | 121 |
| `server-nest/` | 8 | 60 |

Это число **advisory**, а не пакетов: один пакет попадает в список по несколько раз, и почти всё сидит в транзитивных зависимостях сборочных инструментов. Ниже high и critical сгруппированы по пакету и по прямой зависимости, из-за которой он в дереве.

### `client/`

| Источник | Что внутри (critical отмечено) | План исправления |
|---|---|---|
| `@angular/core`, `compiler`, `common`, `router`, `cdk` 18.2.x | 4 пакета с high; в 18.x исправления нет | Только апдейт Angular ([S1.4](backlog/E01-dependency-upgrades/S1.4.md)) |
| `@angular-devkit/build-angular` 18.2.10 (webpack-dev-server, karma, `@angular/build`) | **critical:** `shell-quote`, `websocket-driver`, `proxy-addr`, `piscina`. high: `body-parser`, `brace-expansion`, `browserslist`, `compression`, `cross-spawn`, `engine.io`, `fast-uri`, `flatted`, `glob`, `http-proxy-middleware`, `immutable`, `js-yaml`, `launch-editor`, `lodash`, `minimatch`, `nanoid`, `node-forge`, `path-to-regexp`, `picomatch`, `postcss`, `rollup`, `serialize-javascript`, `socket.io-parser`, `source-map-js`, `vite`, `webpack-dev-middleware`, `ws`, `@babel/plugin-transform-modules-systemjs`, `tmp` | Уйдут с переходом на `@angular/build:application` и актуальный Angular ([S1.4](backlog/E01-dependency-upgrades/S1.4.md)); `karma` — с S2.5. Это dev-цепочка, в браузер пользователя не попадает |
| `@angular/cli` 18.2.10 (pacote, node-gyp, cacache) | **critical:** `tar`. high: `pacote`, `sigstore`, `ip-address`, `tmp` | Обновление Angular CLI ([S1.4](backlog/E01-dependency-upgrades/S1.4.md)) |
| `highcharts` 11.4.8 | high (4 advisory), исправлено в ≥ 11.4.9 | Безопасный патч сразу: `pnpm up highcharts@~11.4.9` ([S1.5](backlog/E01-dependency-upgrades/S1.5.md)). Мажор 13 — отдельно. Работает **в браузере** |
| `lodash-es` 4.17.21 | high, исправлено в ≥ 4.18.0 | Патч-обновление ([S1.5](backlog/E01-dependency-upgrades/S1.5.md)). Работает **в браузере** |
| `@angular-eslint/eslint-plugin` 18.4 → `minimatch` | high | Вместе с ESLint ([S1.6](backlog/E01-dependency-upgrades/S1.6.md)) |

Что попадает в пользовательский бандл: Angular, `highcharts`, `lodash-es`. Остальное — инструменты разработки.

### `server-nest/`

| Источник | Что внутри (critical отмечено) | План исправления |
|---|---|---|
| `mongoose` 8.2.0 (через `@nestjs/mongoose`) | **critical** (2 advisory, исправлено в ≥ 8.24.3) и high (4, до 8.24.7) | Немедленный патч до ≥ 8.24.7 в рамках 8.x ([S1.9](backlog/E01-dependency-upgrades/S1.9.md)), затем мажор с Nest ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)). Работает **в проде**, в первую очередь |
| `@nestjs/core` / `platform-express` 10.3.3 (express 4.18, body-parser, path-to-regexp, multer) | **critical:** `proxy-addr`. high: `body-parser`, `multer`, `path-to-regexp` | Nest 12 / Express 5 ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)). Работает **в проде** |
| `@nestjs/serve-static` 4.0.2 | high: `path-to-regexp` | Обновление вместе с Nest ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)) |
| `@nestjs/jwt` 10.2.0 → `jsonwebtoken` → `jws` | high | Патч `jws` ≥ 3.2.3 приходит с обновлением `@nestjs/jwt`/`jsonwebtoken` ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)). Работает **в проде**, связано с авторизацией |
| `@nestjs/config` 3.2.0 → `lodash` | high | Обновление `@nestjs/config` ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)) |
| `@nestjs/cli` 10.3.2 (glob, minimatch, brace-expansion, braces, picomatch, webpack-цепочка) | high, критичных нет | Обновление CLI ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)). Только сборка |
| `vitest` 2.1.4 (+ `tinypool`) | **critical** (4 advisory) | Минимум 2.1.9, лучше актуальный мажор ([S1.9](backlog/E01-dependency-upgrades/S1.9.md)). Только тесты |
| `unplugin-swc` 1.6.0 (vite, rollup, postcss, nanoid) | high | Обновление `unplugin-swc` вместе с vitest ([S1.9](backlog/E01-dependency-upgrades/S1.9.md)) |
| `supertest` 6.3.4 → `form-data` | **critical** | `supertest` 7 ([S1.9](backlog/E01-dependency-upgrades/S1.9.md)). Только тесты |
| `@typescript-eslint` 6.21 → `flatted` | high | Вместе с ESLint ([S1.6](backlog/E01-dependency-upgrades/S1.6.md)) |

Что в проде: `mongoose`, Nest/Express, `jsonwebtoken`. Остальное — сборка и тесты.

## Порядок

1. **Сразу, без мажоров** ([S1.9](backlog/E01-dependency-upgrades/S1.9.md), [S1.5](backlog/E01-dependency-upgrades/S1.5.md)): патчи `mongoose` ≥ 8.24.7, `highcharts` ≥ 11.4.9, `lodash-es`/`lodash` ≥ 4.18, `vitest` ≥ 2.1.9 / `supertest` 7. Закрывают всё, что реально работает в проде или в бандле.
2. **Выровнять Node и pnpm** ([S1.2](backlog/E01-dependency-upgrades/S1.2.md)) и ввести `pnpm check` ([S2.8](backlog/E02-tests-ci/S2.8.md)), чтобы каждый шаг проверялся одной командой.
3. **Angular** ([S1.4](backlog/E01-dependency-upgrades/S1.4.md)): 18 → 19 → 20 → 21 → 22, затем библиотеки клиента ([S1.5](backlog/E01-dependency-upgrades/S1.5.md)), ESLint ([S1.6](backlog/E01-dependency-upgrades/S1.6.md)), тестовый раннер ([S2.5](backlog/E02-tests-ci/S2.5.md)).
4. **NestJS** ([S1.7](backlog/E01-dependency-upgrades/S1.7.md)) после API-тестов ([S2.4](backlog/E02-tests-ci/S2.4.md)), затем zod ([S1.12](backlog/E01-dependency-upgrades/S1.12.md)).

После каждого шага: `pnpm outdated`, `pnpm audit`, обновить эту таблицу или пометить пункт сделанным в истории.
