# Backend Migration: Nestar to Gameverse

## Status

The application-identity migration and the breaking Property-to-Game catalog migration are implemented. The active backend now exposes a Game catalog backed by the `games` collection. Property GraphQL operations, DTOs, schemas, model bindings, and batch jobs are no longer part of the runtime.

`MemberType.USER`, `MemberType.AGENT`, and `MemberType.ADMIN` remain unchanged. `AGENT` remains the Game owner role.

## Active Game Contract

- Enums:
  - `GameStatus`: `ACTIVE`, `UPCOMING`, `DELETE`
  - `GameType`: `FREE`, `PAID`, `PREMIUM`
  - `GamePlatform`: `PC`, `PLAYSTATION`, `XBOX`, `NINTENDO`, `MOBILE`
  - `GameGenre`: `ACTION`, `ADVENTURE`, `RPG`, `STRATEGY`, `SPORTS`, `RACING`, `SHOOTER`, `SIMULATION`, `PUZZLE`, `HORROR`
  - `GameMode`: `SINGLE_PLAYER`, `MULTIPLAYER`, `CO_OP`
- GraphQL operations: `createGame`, `getGame`, `updateGame`, `getGames`, `getAgentGames`, `likeTargetGame`, `getAllGamesByAdmin`, `updateGameByAdmin`, and `removeGameByAdmin`.
- Shared `getFavorites` and `getVisited` operations return `Games`.
- Slugs are server-generated, unique, and immutable.
- `isUpcoming` is computed from `gameStatus`; it is not persisted.
- `gameRatings` and `gameReviews` are reserved counters until structured reviews are introduced. Generic comments use `gameComments`.

## Related Runtime Changes

- `memberProperties` became `memberGames`; member roles and Agent APIs remain unchanged.
- Like, View, Comment, and Notification groups use `GAME` instead of `PROPERTY`.
- Like/View identity and lookup logic includes the polymorphic target group.
- Game comments update `gameComments`, including soft or admin deletion.
- Game uploads are limited to the `uploads/game` target alongside `member` and `article`.
- The batch application binds the Game model and persists `gameRank = gameViews + gameLikes * 2 + gameReviews * 3` on the existing schedule.
- Agent rank uses `memberGames` while preserving the previous weights for articles, likes, and views.

## Data Migration

Migration is explicit and never runs during application startup:

```bash
npm run migrate:games -- --dry-run --manifest ./game-manifest.json
npm run migrate:games -- --apply --manifest ./game-manifest.json
npm run migrate:games -- --verify
npm run migrate:games -- --rollback
```

Start from `docs/ai/GAME_MIGRATION_MANIFEST.example.json`. Every legacy Property `_id` needs an enrichment entry. Preflight rejects incomplete mappings, invalid enum/pricing combinations, and duplicate polymorphic social records before writes.

Apply mode snapshots affected collections and indexes, preserves Game/member/social IDs, copies Property upload files, rewrites social groups and notification references, rebuilds indexes, and reconciles counters. An in-progress marker makes partial failure explicit; run rollback before retrying a stopped migration. Rollback restores snapshots and removes only upload files copied by the migration.

## Compatibility Boundary

This release intentionally has no Property API alias or dual-read period. API and batch must be deployed together after a successful dry run during a write-maintenance window. The previous application build and migration snapshots are required for rollback.

Still deferred: wishlist, structured ratings/reviews, member levels, inventory, carts, orders, payments, Notification feature wiring, GameArticle renaming, and extraction of API/batch shared types into a library.
