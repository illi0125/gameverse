# Gameverse Backend Agent Instruction

Gameverse is a NestJS GraphQL monorepo migrated from Real estate platform into a gameshop platform

## Read First

Before changing code, read the current AI handoff docs:

- `docs/ai/BACKEND_MIGRATION.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/COMPLETED_TASKS.md`
- `docs/ai/NEXT_STEPS.md`

Use those files as the source of truth for AI Agent related migration history, accepted decisions, remaining work and validation status.

## Project Shape

- Backend apps are `gameverse-api` and `gameverse-batch`.
- Keep the existing NestJS resolver/service/module pattern based on MVC and DI.
- Keep DTOs, enums, schemas under `apps/gameverse-api/src/libs`.
- Keep shared modules reusable: auth, member, like, view, comment, follow, board article, socket.

## Domain Rules

- Use Gameverse/product terminology for the main catalog entity.
- Do not reintroduce property or real-estate fields.
- Keep `MemberType.USER`, `MemberType.AGENT` and `MemberType.ADMIN` unchanged.
- Product ownership continues to use `MemberType.AGENT` unless a later migration explicitly changes it.
- Product enum values are:
  - `gameType`: `FREE`, `PAID`, `PREMIUM`
  - `gamePlatforms`: `PC`, `PLAYSTATION`, `XBOX`, `NINTENDO`, `MOBILE`
  - `gameGenres`: `ACTION`, `ADVENTURE`, `RPG`, `STRATEGY`, `SPORTS`, `RACING`, `SHOOTER`, `SIMULATION`, `PUZZLE`, `HORROR`

## Workflow

1. Analyze before editing.
2. Keep changes small and consistent with existing project patterns.
3. Do not remove working logic unless it is replaced safely.
4. Update `docs/ai/COMPLETED_TASKS.md` after major completed work.
5. Add or update focused tests when behavior changes.

## Validation

Use these checks for backend work:

```bash
npx tsc -p apps/gameverse-api/tsconfig.app.json --noEmit
npx tsc -p apps/gameverse-batch/tsconfig.app.json --noEmit
npx run build
```

`npm run lint` runs ESLint with `--fix`, so use it only when file rewriting is acceptable!
