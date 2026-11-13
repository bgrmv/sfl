# Кандидаты в skills: меню для выбора

Рабочий список к истории [S11.8](backlog/E11-dx-docs/S11.8.md). Срез на 2026-11-13. Ничего из сторонних skills не установлено: после выбора каждый читается целиком, версия (коммит) фиксируется в [skills.md](skills.md).

**Как читать звёзды.** Числа «проверено» взяты с самой страницы GitHub 2026-11-13. «Агрегатор» — со сторонних каталогов, они расходятся друг с другом и устаревают. Звёзды показывают популярность, но не качество: у крупных репозиториев они очень высокие (сотни тысяч), поэтому смотрите на содержание и на то, что skill делает с вашими файлами и сетью.

**Правила проекта для стороннего skill** ([skills.md](skills.md)): прочитан целиком, зафиксирован коммит, не ходит в сеть и не меняет файлы вне репозитория. Skill со скриптами, хуками или сетью принимается только после отдельного разбора.

**Предупреждение.** Несколько «фреймворков» сразу (Superpowers, Matt Pocock, Addy Osmani, ECC) дают конфликтующие инструкции агенту. Берите не больше одного.

Отметка в колонке «Решение»: впишите ДА / НЕТ или номер выбранной опции.

---

## Тема 1. Общий фреймворк работы агента (выбрать 0–1)

| № | Вариант | Звёзды | Что даёт | Минусы |
|---|---|---|---|---|
| 1.1 | [obra/superpowers](https://github.com/obra/superpowers) | 317k (проверено) | TDD, systematic-debugging, brainstorming, планы, двухэтапное ревью, работа с worktree | Свой процесс разработки, перекрывает наш `AGENT.md` и бэклог; архитектурного skill нет |
| 1.2 | [mattpocock/skills](https://github.com/mattpocock/skills) | 323k (проверено) | `improve-codebase-architecture`, `domain-modeling`, `grill-with-docs` (глоссарий и ADR), `codebase-design`, `code-review`, `tdd`, `research` | Ориентирован на трекер задач и свой формат документов; часть skill требует настройки (`setup-matt-pocock-skills`) |
| 1.3 | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 117k (проверено) | 25 skills по жизненному циклу: spec, TDD, API-дизайн, код-ревью (5 осей), security-and-hardening, performance, ADR, observability, deprecation | Архитектурного skill нет; много процессных skill, нужных не всем |
| 1.4 | [affaan-m/ECC](https://github.com/affaan-m/ECC) (everything-claude-code) | 302k (проверено) | 314 skills, 71 агент, ревьюеры по языкам, `security-review`, AgentShield | Огромный набор (шум), есть хуки и сканеры; NestJS, Angular, MongoDB на странице не подтверждены |
| 1.5 | НЕТ, работаем без фреймворка | — | Наши `AGENT.md`, бэклог и `audit-report` | Нет готовых практик TDD и отладки |

Решение: ______

## Тема 2. Анализ архитектуры и домена (выбрать несколько)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 2.1 | `improve-codebase-architecture` + `domain-modeling` + `codebase-design` из [mattpocock/skills](https://github.com/mattpocock/skills) | 323k (проверено) | Сканирует кодовую базу на «углубление» модулей, строит доменную модель, глоссарий и ADR | Самый близкий к вашей задаче «понять доменные области»; ставится отдельными skills, а не всем репозиторием |
| 2.2 | architecture-review-guide из [awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill) | 2.3k (проверено) | Гайд на ~470 строк: SOLID, анти-паттерны, связность и сцепление | В репозитории есть `scripts/pr-analyzer.py` (нужно прочитать до установки); это часть большого skill для ревью |
| 2.3 | `architecture-designer` из [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | 12.3k (проверено) | Проектирование архитектуры в составе набора из 67 skills | Описание на странице скудное; нужно читать SKILL.md |
| 2.4 | `architect` из ECC | 302k (проверено) | Агент для проектных решений через `/ecc:plan` | Тянет за собой ECC |
| 2.5 | `architecture-review` (проверка слоёв, сообщений, границ сервисов, CQRS) | агрегатор | Подходит под FSD и CQRS из [PROJECT.md](PROJECT.md) | Автор и звёзды не проверены, нужен поиск первоисточника |
| 2.6 | FSD: [feature-sliced/skills](https://github.com/feature-sliced/skills) | агрегатор (описан как официальный, FSD v2.1) | Проверка слоёв FSD и публичных API срезов; есть варианты с `steiger` и `fsd-check` | Не открывал репозиторий; подтвердить владельца и состав |
| 2.7 | Только наш `audit-report` (карта доменных областей, формат отчёта) | — | Уже написан, см. [skills.md](skills.md) | Нет внешней экспертизы |

Решение (можно несколько): ______

## Тема 3. Код-ревью (выбрать 1–2)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 3.1 | Встроенный `/code-review` | — | Ревью диффа, уровни усилий, `--fix` | Уже доступен |
| 3.2 | [awesome-skills/code-review-skill](https://github.com/awesome-skills/code-review-skill) | 2.3k (проверено) | ~30 справочников (TypeScript, фреймворки, SQL-инъекции, XSS, N+1, ошибки, async), чек-листы, шаблон PR | Скрипт `pr-analyzer.py` читать; нет Angular и NestJS в явном виде |
| 3.3 | `code-review-and-quality` из [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 117k (проверено) | Пять осей ревью, размер изменений, метки серьёзности | Один процессный skill |
| 3.4 | `code-review` из [mattpocock/skills](https://github.com/mattpocock/skills) | 323k (проверено) | Параллельная проверка на стандарты и соответствие спеке | Привязан к формату спек Matt Pocock |
| 3.5 | `code-reviewer` из ECC | 302k (проверено) | Ревью в свежем контексте | Тянет ECC |

Решение: ______

## Тема 4. Безопасность (выбрать 1–2)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 4.1 | Встроенный `/security-review` ([anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review)) | 6.9k (проверено) | Ревью уязвимостей на диффе с фильтром ложных срабатываний, настраивается файлами инструкций | GitHub Action нам не нужен (CI в P4); автор предупреждает, что не защищён от prompt injection |
| 4.2 | [trailofbits/skills](https://github.com/trailofbits/skills) | 6.8k (агрегатор по странице репозитория) | Набор skills Trail of Bits для аудита и поиска вариантов уязвимостей | Часть skill про Solidity/C и бинарные цели нам не нужна; выбирать по одному |
| 4.3 | `security-and-hardening` из [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 117k (проверено) | OWASP Top 10, авторизация, секреты, аудит зависимостей | Универсальный, без Nest-специфики |
| 4.4 | `security-reviewer` и `secure-code-guardian` из [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | 12.3k (проверено) | Роли ревьюера безопасности и защитного программирования | Описание на странице скудное |
| 4.5 | `security-review` и AgentShield из ECC | 302k (проверено) | AgentShield проверяет конфигурацию самих агентов | Тянет ECC |
| 4.6 | Cloudflare `security-audit-skill` | агрегатор | Многофазный аудит | Не проверен, найти первоисточник |

Решение: ______

## Тема 5. Angular (выбрать 0–2)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 5.1 | [angular/skills](https://github.com/angular/skills) (`angular-developer`, `angular-new-app`), официальный от команды Angular, см. [angular.dev/ai/agent-skills](https://angular.dev/ai/agent-skills) | 725 (проверено) | Сигналы, формы, DI, роутинг, SSR, доступность, анимации, стили, тесты | Мало звёзд, но это первоисточник; лицензия на странице не указана; `angular-new-app` вызывает CLI |
| 5.2 | `angular-developer` из ECC | 302k (проверено) | Альтернативная версия | Не первоисточник |
| 5.3 | `angular-architect` из Jeffallan | агрегатор: оценка контента 64 %, evals не запускались | Архитектурные советы по Angular 17+ | В 2026 устаревает быстро |
| 5.4 | `angular-architecture` из gentleman-programming | агрегатор: 618 звёзд | Архитектура Angular | Содержимое не проверено |
| 5.5 | `angular-best-practices-material` (alfredoperez) | агрегатор: ~34 звезды | Паттерны Material, плотность, темизация | Мало использований |

Решение: ______

## Тема 6. NestJS (выбрать 0–1)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 6.1 | `nestjs-expert` из [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | 12.3k (проверено) | Задачи backend на Nest (JWT и т. д.) | Описание скудное |
| 6.2 | `nestjs-code-review` и `nestjs-best-practices` (giuseppe-trisciuoglio/developer-kit) | агрегатор: ~3 установки | Ревью с серьёзностью, модули, контроллеры, DTO | Ранний этап |
| 6.3 | `nestjs-patterns` из ECC | агрегатор | Паттерны Nest | Тянет ECC |

Решение: ______

## Тема 7. MongoDB (для S12.2 и S12.4)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 7.1 | [mongodb/agent-skills](https://github.com/mongodb/agent-skills) (`mongodb-schema-design`, `mongodb-query-optimizer`), официальные от MongoDB | агрегатор, звёзды не проверены | Паттерны и антипаттерны модели данных; оптимизация запросов и индексов (включается только по явной просьбе) | Количество skills в источниках расходится (7–9); отдельный MCP-сервер не нужен |
| 7.2 | Без skill | — | — | — |

Решение: ______

## Тема 8. Доступность (выбрать 1)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 8.1 | Наш `a11y-audit` ([skills.md](skills.md)) | — | Под Angular Material, WCAG 2.2 AA, формат отчёта | Без внешней экспертизы |
| 8.2 | `a11y-audit` из [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 29.7k (проверено) | Аудит доступности в составе набора из 415 skills | В репозитории 824 Python-скрипта, хуки и сетевые вызовы: ставить только сам skill после прочтения, не весь набор |
| 8.3 | `accessibility` из tech-leads-club/agent-skills | агрегатор: ~4.9k | WCAG 2.1 | Лицензия не указана (NOASSERTION) |
| 8.4 | `a11y-audit` из plugin87/ux-ui-agent-skills | агрегатор: ~1.5k | WCAG 2.2 AA/AAA, паттерны ARIA | Не проверен |
| 8.5 | `frontend-ui-engineering` из addyosmani | 117k (проверено) | Компоненты, дизайн-системы, WCAG 2.1 AA | Не аудитный, а проектный skill |

Решение: ______

## Тема 9. Дизайн и тема Material (выбрать 2–3)

| № | Вариант | Звёзды | Что даёт | Замечания |
|---|---|---|---|---|
| 9.1 | `frontend-design` из [anthropics/skills](https://github.com/anthropics/skills) | агрегатор: ~185k на репозиторий | Выбор направления, типографика, самокритика; **уже прочитан целиком**, коммит `2c5958e` | Только текст, безопасен |
| 9.2 | [hamen/material-3-skill](https://github.com/hamen/material-3-skill) | 1.3k (агрегатор) | 30+ компонентов, токены, тема, адаптивность, MD3-аудит | Общий для Compose, Flutter и веба, не Angular |
| 9.3 | `m3-web-angular` | агрегатор, мало | Использует официальный генератор темы `ng generate @angular/material:m3-theme` | Не проверен |
| 9.4 | [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) | не проверено | 67 файлов `DESIGN.md`/`SKILL.md` с дизайн-системами | Это каталог, выбирать по одному |
| 9.5 | Наш `material-theme` ([skills.md](skills.md)) | — | Правила темы под проект | Написан без внешних источников |
| 9.6 | `theme-factory` из anthropics/skills | см. 9.1 | 10 готовых палитр | Прочитан, **отклонён**: про слайды и PDF |

Решение: ______

## Тема 10. Производительность клиента (S12.1)

| № | Вариант | Звёзды | Что даёт |
|---|---|---|---|
| 10.1 | `performance-optimization` из addyosmani (Core Web Vitals, профилирование, бандл) | 117k (проверено) | Подход «сначала измерить» |
| 10.2 | `browser-testing-with-devtools` из addyosmani (Chrome DevTools: DOM, консоль, сеть) | 117k (проверено) | Живая проверка страниц, если появится браузер |
| 10.3 | Без skill | — | — |

Решение: ______

---

## Предлагаемая цепочка решений

Порядок выбран так, чтобы ранние решения сужали поздние.

1. **Тема 1 (фреймворк).** Решает, будет ли у нас внешний процесс работы. Если выбрано 1.2, темы 2 и 3 частично закрываются им.
2. **Тема 2 (архитектура и домен).** Это ответ на «понять доменные области» для S11.9. Рекомендую пару: 2.1 (только три skill) + 2.7 (наш `audit-report`).
3. **Тема 3 и 4 (ревью, безопасность).** Рекомендую оставить встроенные 3.1 и 4.1 и добавить по одному внешнему: 3.2 и 4.3 или 4.2.
4. **Тема 5 и 6 (Angular, NestJS).** Рекомендую 5.1 (официальный) и 6.1 после чтения.
5. **Тема 7 (MongoDB).** Рекомендую 7.1: официальный, пригодится в S12.2 и S12.4.
6. **Тема 8 и 9 (доступность, дизайн).** Рекомендую 8.1 + 9.1 + 9.5, внешний 9.2 или 8.3 по желанию.
7. **Тема 10.** Можно отложить до S12.1.

После вашего выбора: клонирую каждый выбранный skill в песочницу, читаю целиком (включая скрипты и хуки), записываю коммит и риски в [skills.md](skills.md) и только затем прошу разрешение на установку в `.claude/skills/`.

## Источники

- Обзоры и каталоги: [fast.io](https://fast.io/resources/awesome-claude-skills-directory-2026/), [repowise](https://repowise.dev/blog/comparisons/best-claude-code-skills), [openaitoolshub](https://www.openaitoolshub.org/en/blog/best-claude-code-skills-2026), [tryzeroshot](https://tryzeroshot.com/blog/best-claude-code-skills-for-code-review), [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills), [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills).
- Angular: [angular.dev/ai/agent-skills](https://angular.dev/ai/agent-skills), [InfoQ](https://infoq.com/news/2026/06/angular-agent-skills/).
- MongoDB: [блог MongoDB](https://mongodb.com/company/blog/product-release-announcements/introducing-mongodb-agent-skills).
- Trail of Bits: [trailofbits/skills](https://github.com/trailofbits/skills).

---

## Мой выбор (черновик к S11.8)

Принцип: один skill на одну задачу, предпочтение первоисточникам (команда фреймворка или автор технологии), никакого «фреймворка целиком», собственные skills там, где внешний не подходит. Каждый внешний читается целиком до установки.

### Берём

| Тема | Что | Откуда | Для каких историй | Почему |
|---|---|---|---|---|
| Ревью, безопасность, чистка | `/code-review`, `/security-review`, `/simplify`, `/run` | встроенные | S11.9, S11.10, любая | Уже есть, без установки |
| Правила аудита | `audit-report` | наш | S11.9–S11.11, S12.1, S12.2 | Формат отчёта, серьёзность, карта доменных областей; в нём вся «процедура», которой нет у внешних |
| Архитектура и домен | `improve-codebase-architecture`, `domain-modeling`, `codebase-design` (только эти три) | [mattpocock/skills](https://github.com/mattpocock/skills) | S11.9, S3.1, S3.3, S3.9 | Единственные из найденных, что прямо ищут «углубление» модулей и строят доменную модель, глоссарий и ADR |
| FSD на клиенте | `feature-sliced-design` | [feature-sliced/skills](https://github.com/feature-sliced/skills) (владелец — организация FSD, MIT, FSD v2.1) | S11.9, S3.8, S10.13 | Официальный; только текст и 9 справочников. Копировать только папку skill, без `.github/` и `evals/` |
| Angular | `angular-developer` | [angular/skills](https://github.com/angular/skills) | S11.9, S12.1, S12.3 | Первоисточник от команды Angular; сигналы, формы, DI, SSR, a11y. `angular-new-app` не берём: приложение уже есть |
| MongoDB | `mongodb-schema-design`, `mongodb-query-optimizer` | [mongodb/agent-skills](https://github.com/mongodb/agent-skills) | S12.2, S12.4 | Официальные от MongoDB; включаются только по явной просьбе, не мешают в других задачах |
| Безопасность (весь код) | `security-and-hardening` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | S11.10, S8.x | `/security-review` смотрит дифф; этот даёт чек-лист по OWASP, авторизации, секретам и зависимостям для аудита всей кодовой базы |
| Производительность клиента | `performance-optimization` | addyosmani/agent-skills | S12.1, S12.3 | Подход «сначала измерить», Core Web Vitals и бандл |
| Доступность | `a11y-audit` | наш | S11.11 | Под Material и WCAG 2.2 AA; внешние не подошли (см. ниже) |
| Дизайн | `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills), коммит `2c5958e` | S10.11, S10.12 | Уже прочитан целиком, безопасен |
| Тема Material | `material-theme` | наш | S10.11–S10.13 | Перенос выбранного направления в тему Material 22 |

### Не берём, и почему

| Что | Причина |
|---|---|
| Superpowers целиком (317k) | Это методология разработки (TDD, worktree, субагенты), которая дублирует наш `AGENT.md` и бэклог и будет спорить с ними. Архитектурного skill в нём нет. Идею TDD и отладки при необходимости возьмём точечно позже |
| mattpocock/skills целиком (323k) | Привязан к трекеру задач и своим форматам спек/тикетов (`setup-matt-pocock-skills`), у нас уже есть бэклог в Markdown. Из него берём только три архитектурных skill |
| addyosmani/agent-skills целиком (117k) | 25 процессных skill (spec, git-workflow, ci-cd, shipping) пересекаются с нашим бэклогом, а CI/CD у нас P4. Берём два нужных |
| ECC / everything-claude-code (302k) | 314 skills, 71 агент, хуки и сканеры: слишком много шума и побочных эффектов. NestJS, Angular, MongoDB и доступность на странице не подтверждены. Ставить такое как зависимость проекта рискованно |
| `awesome-skills/code-review-skill` (2.3k) | Хороший справочник, но его архитектурный гайд дублирует выбранные Matt Pocock и FSD, а ревью покрывает встроенный `/code-review`. Есть скрипт `pr-analyzer.py`. Отложен: вернёмся, если `/code-review` окажется слабым по SQL/XSS/N+1 |
| Jeffallan/claude-skills (12.3k): `architecture-designer`, `nestjs-expert`, `security-reviewer`, `angular-architect` | Страница скупа на описание каждого skill, у `angular-architect` оценка контента 64 % и нет evals. Дублируют более сильные первоисточники (Angular, Matt Pocock). Для NestJS отдельного skill не берём: пока он нужен лишь при S1.7, тогда вернёмся и прочитаем `nestjs-expert` |
| NestJS-skills из giuseppe-trisciuoglio и ECC | Единицы установок / тянут ECC, качество не подтверждено |
| Trail of Bits skills (6.8k) | Сильный набор, но он про аудит смарт-контрактов, нативного кода и анализ вариантов уязвимостей; для NestJS + Angular пригоден мало. Для веб-аудита лучше `security-and-hardening` + `/security-review` |
| `anthropics/claude-code-security-review` как GitHub Action | CI у нас P4, для CI нужен API-ключ, и автор сам предупреждает про prompt injection. Локальный `/security-review` из него уже встроен |
| `a11y-audit` из `alirezarezvani/claude-skills` (набор 29.7k) | Репозиторий с 824 Python-скриптами, хуками и сетевыми вызовами: нарушает наше правило. Отдельно сам skill не проверялся |
| `accessibility` из tech-leads-club (~4.9k) | Лицензия не указана (NOASSERTION), только WCAG 2.1 |
| `a11y-audit` из plugin87 (~1.5k) | Не проверен; наш skill делает то же с учётом Material и нашего формата отчёта |
| `hamen/material-3-skill` (1.3k) и `m3-web-angular` | Первый общий для Compose/Flutter/веба, не Angular; второй мал и не проверен. Angular Material 22 имеет собственный генератор темы, с ним работает `angular-developer` + наш `material-theme` |
| `theme-factory` | Про слайды и PDF, не про тему приложения |
| `bergside/awesome-design-skills` | Каталог на 67 файлов, не skill; можем заглядывать за идеями при S10.11 |
| `architecture-review` (автор не установлен), Cloudflare `security-audit-skill` | Не нашёл проверяемый первоисточник; без него не принимаем |
| `browser-testing-with-devtools` (Addy) | Нужен браузер в контейнере, которого нет; вернёмся, если он появится для S12.1 |

### Что дальше

1. Вы подтверждаете или меняете этот список (в «Берём» и «Не берём»).
2. Я клонирую в песочницу выбранные внешние репозитории (по одному), читаю skill целиком вместе со скриптами и хуками, пишу в [skills.md](skills.md) коммит и найденные риски.
3. Запрашиваю разрешение на запись в `.claude/skills/`, копирую **только папки skill** (не весь репозиторий), закрываю S11.8 и начинаю S11.9.
