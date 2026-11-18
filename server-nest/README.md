# server-nest

Main API of SFL: NestJS, Mongoose, MongoDB. Architecture: [Project_Architecture_Blueprint.md](../docs/Project_Architecture_Blueprint.md), stack and rules: [docs/PROJECT.md](../docs/PROJECT.md), agent rules: [AGENT.md](../AGENT.md).

## Run

The easy way is the dev-container with MongoDB and `.env` ready: see [Dev-container](../docs/development.md#dev-container). Without it you need Node.js `^22.22.3`, pnpm (corepack) and a MongoDB 7.

```bash
pnpm install            # from the repository root
cp .env.example .env    # then fill in the values
pnpm dev          # port 3001, Swagger at /rest
```

## Commands

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | run with watch                                |
| `pnpm build`         | type check and compile to `dist/`             |
| `pnpm lint`          | ESLint with `--fix` (`lint:check` without it) |
| `pnpm vitest run`    | tests once (`pnpm test` is watch mode)        |
| `pnpm test:coverage` | coverage, threshold 80% on statistics         |

Unit tests live next to the code (`src/**/*.test.ts`), API tests in `test/api/` run on `mongodb-memory-server` and need no external database.

## Structure

One module per entity in `src/entities/` (controller, service, Mongoose schema, DTO). Shared code (filters, pipes, guards) is in `src/shared/`. DTO shapes shared with the client are in `packages/schemas` (`@sfl/schemas`).

Before a commit run `pnpm check` from the repository root.
