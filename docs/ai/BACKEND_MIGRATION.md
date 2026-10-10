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

## Support Content API (2026-10-09)

Notices, FAQ and 1:1 inquiries are real data now (previously the frontend hardcoded them and the admin CS pages showed placeholder rows).

- **Notice module** (existing `notices` collection and schema): `NoticeCategory` gained `NOTICE` (announcements; `FAQ`, `TERMS` unchanged, legacy `INQUIRY` kept unused); new optional `noticeTopic` (`SupportTopic`: `GAMES, PAYMENT, PLAYERS, DEVELOPERS, MEMBERSHIP, COMMUNITY, OTHER`) groups FAQ entries. `NoticeStatus`: `HOLD` = draft, `ACTIVE` = public, `DELETE` = soft-deleted.
  - Public: `getNotices(input: NoticesInquiry)` — `ACTIVE` only, one category, optional topic and title text (matched literally).
  - ADMIN (`RolesGuard`): `getAllNoticesByAdmin`, `createNotice` (HOLD or ACTIVE), `updateNotice`, `removeNotice` (permanent, only after `DELETE`).
- **Inquiry module** (new `inquiries` collection): topic, title (3–100), content (5–2000), `InquiryStatus` `PENDING / ANSWERED / CLOSED`, `answerContent`, `answeredBy`, `answeredAt`, `memberId`.
  - Signed-in members (`AuthGuard`): `createInquiry` (always PENDING), `getMyInquiries` (own only).
  - ADMIN: `getAllInquiriesByAdmin` (status/topic/title filters, author joined, nullable), `answerInquiry` (not while CLOSED), `updateInquiryByAdmin` (ANSWERED requires an existing reply), `removeInquiry` (only CLOSED).
- **Seed:** `npm run seed:cs -- --dry-run | --apply | --verify` imports the former hardcoded public content (2 notices with their original dates, 29 FAQ entries in original order), authored by the first ACTIVE admin; idempotent by category + title. Applied to the development database on 2026-10-09 (31 inserted; a second run inserts 0).

## Board article admin restore (2026-10-09)

- `updateBoardArticleByAdmin` now matches any article (previously only `ACTIVE`), so an admin can restore a deleted article (`DELETE → ACTIVE`). The author's `memberArticles` counter changes only when the status actually changes (−1 on delete, +1 on restore). `removeBoardArticleByAdmin` still requires `DELETE`.

## Notifications (2026-10-10)

- **Storage:** `notifications` collection (`schemas/Notification.model.ts`), one document per member per event, unique `dedupeKey`, indexes `{receiverId, createdAt:-1, _id:-1}` (list sort, no in-memory sort) and `{receiverId, notificationStatus}` (unread count, mark all). The dev database's superseded `receiverId_1_createdAt_-1` was dropped on 2026-10-10; other environments never had the collection. Types `LIKE, COMMENT, FOLLOW, NEW_GAME, GAME_RELEASE, INQUIRY_ANSWER, MODERATION, ANNOUNCEMENT`; groups `MEMBER, ARTICLE, GAME, INQUIRY, NOTICE`; status `WAIT` (unread) / `READ` with `readAt`.
- **API (all `AuthGuard`; the receiver is always the token's member):** `getMyNotifications(input: NotificationsInquiry)` (page, limit ≤ 50, `search.typeList`, `search.unreadOnly`; actor joined as nullable `authorData`), `getUnreadNotificationCount: Int`, `markNotificationRead(notificationId: String)` (idempotent; someone else's ID is "No data found!"), `markAllNotificationsRead: Int`.
- **Real time:** the existing `ws` gateway sends `{event: 'notification', notification, unread}` to the receiver's open connections and `{event: 'notificationCount', unread}` after reads. Nothing is broadcast; chat events are unchanged. Delivery is best effort on top of storage.
- **Events (`NotificationService.notify*` never throws; fan-outs run in the background):**

| Event | Receiver | Type |
| --- | --- | --- |
| `likeTargetGame` / `likeTargetBoardArticle` / `likeTargetMember` adds a like | Game owner / article author / that member | `LIKE` |
| `createComment` on a game, article or profile | Its owner (comment text as `notificationDesc`) | `COMMENT` |
| `subscribe` | The followed member | `FOLLOW` |
| `createGame` | The developer's followers | `NEW_GAME` |
| `updateGame` / `updateGameByAdmin` UPCOMING → ACTIVE | Members who liked the game | `GAME_RELEASE` |
| `answerInquiry` (every answer) | The member who asked | `INQUIRY_ANSWER` |
| `updateGameByAdmin` / `updateBoardArticleByAdmin` → DELETE (each removal) | The owner; signed by the admin (resolvers now pass `@AuthMember('_id')`) | `MODERATION` |
| `createNotice` / `updateNotice` when a NOTICE becomes ACTIVE (not on later edits) | Every active member | `ANNOUNCEMENT` |

  No self-notifications; unliking and liking again, or unfollowing and following again, never notify twice. Live Chat creates no notifications.

## Compatibility Boundary

This release intentionally has no Property API alias or dual-read period. API and batch must be deployed together after a successful dry run during a write-maintenance window. The previous application build and migration snapshots are required for rollback.

Still deferred: wishlist, structured ratings/reviews, member levels, inventory, carts, orders, payments, GameArticle renaming, and extraction of API/batch shared types into a library.
