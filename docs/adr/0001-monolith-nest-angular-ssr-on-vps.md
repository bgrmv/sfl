# Монолит Nest + Angular SSR на VPS

Статус: принято
Дата: 2026-10-25

Один процесс Nest отдаёт `/rest/*` и рендерит Angular (с Material) через `AngularNodeAppEngine` на остальных маршрутах; там же живут cron и websockets. Запуск — Docker Compose (`edge-caddy → app → [mongodb]`) на общем VPS, деплой — GitHub Actions → GHCR → ssh. SFL изолирован в `/opt/sfl/`, общий прокси — в `/opt/edge/`. Решение выбрано ради цены always-on инстанса, полного контроля и того, что cron и websockets нужны. Детали и прототип — [S4.1](../backlog/E04-migration-design/S4.1.md).

## Рассмотрено

- **Angular на Netlify → Supabase напрямую (RLS, Edge Functions), без своего бэкенда.** Netlify не держит постоянные процессы, а cron и websockets нужны. Сервер команде понятнее, чем RLS и SQL-функции.
- **NestJS в Netlify Functions.** Холодный старт, лимит времени на пересчёт статистики, нет websockets.
- **PaaS (Render, Railway, Fly.io).** Рабочий вариант, отклонён по цене за always-on инстанс и ради контроля.
- **Coolify на VPS.** Лишний слой со своей памятью и обновлениями; Compose + Caddy проще.

## Последствия

NestJS остаётся, поэтому его обновление ([S1.7](../backlog/E01-dependency-upgrades/S1.7.md)) и улучшение архитектуры сервера нужны. SSR и приложение делят память одного процесса: лимиты зададут замеры прототипа ([S7.2](../backlog/E07-vps-hosting/S7.2.md)).
