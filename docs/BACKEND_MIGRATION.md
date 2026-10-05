# Backend Migration: Nestar to Gameverse

## Status

The repository has completed a **branding and application-identifier migration** from Nestar to Gameverse. It has **not yet completed the business-domain migration** from real estate to a gameshop.

The current backend builds and runs under Gameverse names while deliberately retaining the existing GraphQL API, Mongoose models, MongoDB collections, environment variables, authentication behavior, and scheduled jobs.

## Original Project Summary

Nestar is a NestJS monorepo backed by MongoDB and exposed primarily through a code-first GraphQL API. Its business domain is a real-estate platform in which agents publish properties and members can view, like, comment on, and favorite content.

The original monorepo contained:

- `nestar-api`: GraphQL API, REST welcome endpoint, image uploads, authentication, and WebSocket chat.
- `nestar-batch`: scheduled property and agent ranking jobs.
- MongoDB/Mongoose persistence.
- Member, Property, BoardArticle, Comment, Like, View, Follow, and authentication modules.
- Notice and Notification schemas without corresponding active feature modules.

## New Project Summary

Gameverse is the new repository and application identity for the same NestJS GraphQL monorepo. Its intended product direction is a gameshop, but the current executable domain remains Nestar-compatible.

The renamed applications are:

- `gameverse-api`: the default Nest project and existing API runtime.
- `gameverse-batch`: the existing scheduled-job runtime.

The rename creates a stable Gameverse shell in which the future Game catalog and commerce domain can be introduced separately from the low-risk branding change.

## Backend Migration Goal

The backend migration is intentionally split into two stages:

1. **Completed: identity migration.** Rename repository-visible and application-visible Nestar identifiers to Gameverse without changing external data or API contracts.
2. **Pending: domain migration.** Replace or supersede the Property/Agent real-estate model with Game, catalog, seller, inventory, cart, order, and related gameshop capabilities.

This separation reduces the chance that path changes, schema changes, and business behavior changes become mixed in one difficult-to-review release.

## Naming Changes

| Surface | Before | Current | Compatibility impact |
| --- | --- | --- | --- |
| npm package | `nestar` | `gameverse` | Internal package identity changed |
| API directory/project | `apps/nestar-api` / `nestar-api` | `apps/gameverse-api` / `gameverse-api` | Nest CLI and filesystem paths changed |
| Batch directory/project | `apps/nestar-batch` / `nestar-batch` | `apps/gameverse-batch` / `gameverse-batch` | Nest CLI and filesystem paths changed |
| API build output | `dist/apps/nestar-api` | `dist/apps/gameverse-api` | Deployment path changed |
| Batch build output | `dist/apps/nestar-batch` | `dist/apps/gameverse-batch` | Deployment path changed |
| API welcome text | Nestar REST API message | `Welcome to Gameverse REST API Server!` | Visible REST response changed |
| Batch welcome text | Nestar batch message | `Welcome to Gameverse Batch Server!` | Visible REST response changed |
| Repository documentation | Nest starter/Nestar context | Gameverse heading and description | Documentation identity changed |

The default `build`, `start`, and development behavior still target the API. Explicit `build:api` and `build:batch` scripts now validate each Nest application independently.

## Module Changes

No feature module was renamed or behaviorally rewritten during the identity migration.

| Module or subsystem | Current status | Future Gameverse relevance |
| --- | --- | --- |
| Auth | Unchanged | Reusable after security hardening |
| Member | Unchanged; still includes `AGENT` | Reusable, but roles and profile fields need redesign |
| Property | Unchanged | To be replaced or superseded by Game/catalog capabilities |
| BoardArticle | Unchanged | Reusable as community content |
| Comment | Unchanged and coupled to Property/Article/Member targets | Must support Game targets later |
| Like | Unchanged and Property-aware | Must be generalized safely |
| View | Unchanged and Property-aware | Must be generalized safely |
| Follow | Unchanged | Potentially reusable for member/seller following |
| WebSocket chat | Unchanged | Optional reusable community feature |
| Batch ranking | Unchanged | Property/Agent jobs require later Gameverse redesign |
| Notice/Notification schemas | Present but not wired into feature modules | Requires a separate product decision |

The batch application still imports shared schemas, DTOs, and enums directly from the API application. Only the parent path changed from `nestar-api` to `gameverse-api`; extraction into a shared library remains future work.

## GraphQL Changes

There were **no GraphQL contract changes** in the completed rename.

The following were preserved:

- Query and mutation names.
- GraphQL object and input type names.
- DTO field names and nullability.
- Enum names and enum values.
- Resolver guards and role requirements.
- Pagination, sorting, filtering, and aggregation behavior.
- Upload mutation signatures.

Property operations such as `getProperty`, `getProperties`, `createProperty`, `updateProperty`, `likeTargetProperty`, and their admin variants remain the active API. Proposed Game equivalents documented in [FRONTEND_MIGRATION.md](./FRONTEND_MIGRATION.md) are future interfaces, not currently available operations.

## MongoDB Collection and Schema Changes

There were **no MongoDB or Mongoose changes** in the completed rename.

| Contract | Migration status |
| --- | --- |
| Model names such as `Property` and `Member` | Preserved |
| Collection names such as `properties`, `members`, and `boardArticles` | Preserved |
| Schema fields and defaults | Preserved |
| Enum-backed values | Preserved |
| References and lookup collection names | Preserved |
| Index definitions and uniqueness rules | Preserved |
| Existing documents | No migration performed |

No data copy, collection rename, compatibility view, or backfill was introduced.

## Environment and Scheduled Jobs

The environment contract remains:

- `PORT_API`
- `PORT_BATCH`
- `MONGO_DEV`
- `MONGO_PROD`
- `SECRET_TOKEN`
- `NODE_ENV`

The batch schedule and calculations remain unchanged:

| Job | Cron expression | Existing purpose |
| --- | --- | --- |
| `BATCH_ROLLBACK` | `00 00 01 * * *` | Reset eligible ranks |
| `BATCH_TOP_PROPERTIES` | `20 00 01 * * *` | Recalculate property rank |
| `BATCH_TOP_AGENTS` | `40 00 01 * * *` | Recalculate agent rank |

## Compatibility Notes

### Preserved compatibility

- Existing GraphQL clients can continue using the current schema.
- Existing MongoDB databases can be used without migration.
- Existing environment files remain valid.
- Property, member, article, social, upload, chat, and batch behavior remains unchanged.

### Intentional incompatibilities

- Commands or deployments that reference `nestar-api`, `nestar-batch`, or their old output paths must use the Gameverse paths.
- The two REST welcome responses now identify Gameverse.
- No old Nest project aliases were retained.

### Known limitations

- The backend remains functionally a real-estate platform despite its Gameverse identity.
- Property and Agent names must remain until a versioned domain migration is implemented.
- Existing security and consistency risks were not corrected by the rename. See [NEXT_STEPS.md](./NEXT_STEPS.md).

