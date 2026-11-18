# Early history

Источник блока «Early history» страницы Release notes (S10.51, [ADR 0022](../adr/0022-semver-release-version-and-markdown-release-notes.md)): что было сделано до первого релиза `1.0.0`. Версий и тегов у этих этапов нет. Заголовок раздела: `## Early history · ГГГГ-ММ[-ДД] · Название`, строки изменений как в релизе; текст на английском, как сайт. Свёрнуто из 524 коммитов (2023-06-04 … 2026-11-18): на сайт попадает только то, что видит игрок или администратор.

## Early history · 2023-12 · A first frame

A table of players and games grows into an app with sign-in and its own database.

- **New** (Players) A list of players and captains, switches for who is active.
- **New** (Access) Sign-in with a password, sign-out.
- **New** (Admin) A games page and the first admin widgets: add and remove captains and players.
- **Under the hood** SQLite replaced by MongoDB, Angular 17, HTTPS in development.

## Early history · 2024-04 · Matches

A match can be created, saved and viewed.

- **New** (Admin) Create a match: pick captains, draft the teams, fill the squads, edit it later.
- **New** (Players) Player autocomplete and the switch of active players.
- **New** (Design) Match cards and a page of a match.
- **Under the hood** The server moved to NestJS with Swagger, first deployment to Azure.

## Early history · 2024-12 · Statistics and rating

The main step for statistics: ratings are calculated from matches.

- **New** (Statistics) Metadata of a match and of a player: goals, assists, wins, totals.
- **New** (Statistics) Top 10 by the ancient scoring system for a season, with a chart on the home page.
- **New** (Statistics) The positional scoring system.
- **New** (Statistics) Score, MVP and transfer on a match card, the number of a match in the season, the date of the game.
- **New** (Admin) Create, edit and delete players and matches, confirm a delete, a link and a description of a match, notes.
- **New** (Admin) Drag teams and rows of statistics.
- **Improved** (Access) Actions are hidden by role.
- **Fixed** (Statistics) Metadata is recounted when a match is deleted, the draft order, validation of statistics.
- **Under the hood** Signal stores instead of NgRx Store, a logger on the server.

## Early history · 2026-11-13 · Security and the rules of the league

Work resumed after a pause of almost two years, starting with an audit. The rules of the league are written down and covered by tests, the holes in access are closed.

- **Fixed** (Access) Routes that change data are closed by a global guard, passwords and database credentials are no longer logged. [S0.1](../backlog/README.md)
- **Fixed** (Access) E-mail and surname are hidden from public answers and shown to administrators only. [S8.10](../backlog/README.md)
- **Improved** (Access) Roles and rights, sign-in with token rotation, rate limits, a session that renews itself. [S8.12](../backlog/README.md)
- **Fixed** (Statistics) Calculation follows the glossary: the weight of goals, checks of captains and positions, only published matches count. [S3.11](../backlog/README.md)
- **Fixed** (Admin) Correct status codes and clear errors when a match is saved. [S3.12](../backlog/README.md)
- **Under the hood** Angular 18 to 22, NestJS 12, TypeScript 6, Vitest, a pnpm workspace with shared packages, a golden-master test on an anonymized copy of production, encrypted backups.

## Early history · 2026-11-17 · Scoreboard

A new look of the site and a much bigger admin area.

- **New** (Design) The “Scoreboard” theme, a UI kit, self-hosted fonts and icons, a contrast test. [S10.12](../backlog/README.md)
- **New** (Admin) A match wizard of six steps with a draft on the server and autosave. [S10.67](../backlog/README.md)
- **New** (Admin) One administrator edits a match at a time, a checklist before confirming. [S10.54](../backlog/README.md)
- **New** (Admin) A match is published by two confirmations of two people, a revoke with a reason, the moderator role. [S10.35](../backlog/README.md)
- **New** (Admin) A log of administrator actions and a queue of comments on the overview. [S10.21](../backlog/README.md)
- **New** (Admin) Soft delete of a match, a list of deleted matches and restore. [S10.2](../backlog/README.md)
- **New** (Statistics) The order of goals and a timeline of a match, a pass before a header is worth 2. [S10.27](../backlog/README.md)
- **New** (Statistics) An estimate of the chance to win in the wizard. [S10.25](../backlog/README.md)
- **New** (Statistics) A “skipped” status: a match without metadata and without effect on ratings. [S10.18](../backlog/README.md)
- **New** (Community) Photos of matches and players, a page of photos with filters. [S10.19](../backlog/README.md)
- **New** (Community) Comments on matches with a queue of review. [S10.22](../backlog/README.md)
- **New** (Players) A privacy page and anonymizing of a player. [S8.4](../backlog/README.md)
- **Improved** (Design) Season and status of the list of matches in the URL, an empty state, accessible names of buttons and captions of tables. [S10.14](../backlog/README.md)
- **Improved** (Statistics) The list of matches loads faster. [S12.4](../backlog/README.md)
- **Under the hood** Zoneless Angular with OnPush, layers of FSD checked by the linter, OpenAPI made from schemas.

## Early history · 2026-11-18 · Accounts

- **New** (Access) Sign-in with Google by a one-time link from an administrator, screens of links and roles in the admin area. [S8.13](../backlog/README.md)
- **Improved** (Access) Passwords moved to argon2id on sign-in, old hashes can be revoked. [S8.7](../backlog/README.md)
- **Improved** (Players) A required number of a match and season, a date of creation of players and users, birth date and country are hidden. [S3.33](../backlog/README.md)
