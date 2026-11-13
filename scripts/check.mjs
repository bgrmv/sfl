#!/usr/bin/env node
// Единая локальная проверка (S2.8): lint, типы, тесты, prod-сборка обоих пакетов.
// Не меняет исходники и не ходит в базу. Сборка пишет только в dist/ (в .gitignore).
// Шаги audit:* ходят в реестр npm (pnpm audit), остальные работают без сети.
// secrets:* требуют gitleaks (ставится в dev-container, .devcontainer/install-gitleaks.sh), конфиг .gitleaks.toml (S8.8).
//
//   pnpm check                       до первой ошибки
//   pnpm check --all                 прогнать всё и напечатать сводку
//   pnpm check --skip=client:test    пропустить шаги (через запятую)
//   pnpm check --include-known       включить шаги из KNOWN (они падают по известным причинам)
//   pnpm check --only=server         только пакет (client | server) или шаг (server:test);
//                                    общие пакеты (packages:build) собираются всегда
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const STEPS = [
  // The client and the server read the shared packages from their dist/
  { id: 'packages:build', cwd: '.', cmd: 'pnpm build:packages' },
  { id: 'packages:test', cwd: '.', cmd: 'pnpm --filter "./packages/*" run test' },
  { id: 'client:lint', cwd: 'client', cmd: 'node scripts/set-env.mjs && pnpm exec ng lint' },
  { id: 'client:types', cwd: 'client', cmd: 'node scripts/set-env.mjs && pnpm exec tsc --noEmit -p tsconfig.app.json && pnpm exec tsc --noEmit -p tsconfig.spec.json' },
  { id: 'client:test', cwd: 'client', cmd: 'node scripts/set-env.mjs && pnpm exec ng test --watch=false' },
  { id: 'client:build', cwd: 'client', cmd: 'pnpm build:prod' },
  { id: 'server:lint', cwd: 'server-nest', cmd: 'pnpm lint:check' },
  { id: 'server:types', cwd: 'server-nest', cmd: 'pnpm exec tsc --noEmit -p tsconfig.json' },
  { id: 'server:test', cwd: 'server-nest', cmd: 'pnpm vitest run' },
  { id: 'server:build', cwd: 'server-nest', cmd: 'pnpm build' },
  { id: 'audit:client', cwd: 'client', cmd: 'pnpm audit --audit-level high' },
  { id: 'audit:server', cwd: 'server-nest', cmd: 'pnpm audit --audit-level high' },
  { id: 'audit:packages', cwd: 'packages/schemas', cmd: 'pnpm audit --audit-level high' },
  { id: 'secrets:tree', cwd: '.', cmd: 'gitleaks dir . --no-banner --redact -c .gitleaks.toml' },
  { id: 'secrets:history', cwd: '.', cmd: 'gitleaks git . --no-banner --redact -c .gitleaks.toml' },
];

// Шаги, которые сейчас падают по известным причинам. Пропускаются явно, с выводом причины.
// Когда причина устранена, строку удалить.
const KNOWN = {};

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => (args.find((a) => a.startsWith(`${name}=`)) ?? '').slice(name.length + 1).split(',').filter(Boolean);
const all = flag('--all');
const includeKnown = flag('--include-known');
const skip = new Set(opt('--skip'));
const only = opt('--only');

const unknown = [...skip, ...only].filter((s) => !STEPS.some((x) => x.id === s || x.id.startsWith(`${s}:`)));
if (unknown.length) {
  console.error(`Неизвестные шаги: ${unknown.join(', ')}. Доступны: ${STEPS.map((s) => s.id).join(', ')}`);
  process.exit(2);
}

const results = [];
let failed = false;
for (const step of STEPS) {
  const selected = step.id.startsWith('packages:') || !only.length || only.some((o) => step.id === o || step.id.startsWith(`${o}:`));
  if (!selected) continue;
  const label = step.id.padEnd(16);
  if (skip.has(step.id)) {
    results.push({ step, status: 'пропущен (--skip)' });
    console.log(`${label} пропущен (--skip)`);
    continue;
  }
  if (KNOWN[step.id] && !includeKnown) {
    results.push({ step, status: `пропущен: ${KNOWN[step.id]}` });
    console.log(`${label} пропущен: ${KNOWN[step.id]}`);
    continue;
  }
  const started = Date.now();
  const r = spawnSync(step.cmd, { cwd: join(root, step.cwd), shell: true, encoding: 'utf8' });
  const secs = Math.round((Date.now() - started) / 1000);
  if (r.status === 0) {
    results.push({ step, status: 'ок', secs });
    console.log(`${label} ок (${secs} с)`);
  } else {
    failed = true;
    results.push({ step, status: 'упал', secs });
    console.log(`${label} упал (${secs} с)`);
    process.stdout.write(`${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n').slice(-40).join('\n') + '\n');
    if (!all) process.exit(1);
  }
}

if (all) {
  console.log('\nСводка:');
  for (const { step, status } of results) console.log(`  ${step.id.padEnd(16)} ${status}`);
}
process.exit(failed ? 1 : 0);
