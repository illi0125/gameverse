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

### Member counter compatibility repair

Legacy databases may contain `memberProperties` without `memberGames`. Until the full catalog migration is applied, member read paths normalize a missing `memberGames` value to `0` so the non-null GraphQL contract remains valid.

Use the focused, idempotent backfill independently of the catalog manifest:

```bash
npm run migrate:member-games -- --dry-run
npm run migrate:member-games -- --apply
npm run migrate:member-games -- --verify
```

Apply mode copies `memberProperties` only when `memberGames` is missing or null, otherwise defaults it to `0`. Existing `memberGames` values are preserved and `memberProperties` is not deleted.

### Orphan Game ownership repair

Protected requests now validate the signed JWT and reload the current active member from MongoDB. Stale tokens for missing, blocked, or deleted members are rejected, and current database roles take precedence over role claims embedded in older tokens. Optional authentication treats rejected tokens as anonymous.

Use the explicit repair command when a Game references a member that no longer exists:

```bash
npm run repair:game-owner -- --dry-run --game-id <game-id> --member-id <active-agent-id>
npm run repair:game-owner -- --apply --game-id <game-id> --member-id <active-agent-id>
npm run repair:game-owner -- --verify --game-id <game-id> --member-id <active-agent-id>
```

The command requires an orphan, non-deleted Game and an active AGENT replacement. Apply uses a transaction, changes ownership, and increments `memberGames` exactly once. Repeated apply is idempotent. Game reads keep `memberData` nullable and no longer misreport a missing owner as a missing Game.

## Compatibility Boundary

This release intentionally has no Property API alias or dual-read period. API and batch must be deployed together after a successful dry run during a write-maintenance window. The previous application build and migration snapshots are required for rollback.

Still deferred: wishlist, structured ratings/reviews, member levels, inventory, carts, orders, payments, Notification feature wiring, GameArticle renaming, and extraction of API/batch shared types into a library.
