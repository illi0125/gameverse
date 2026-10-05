# Frontend Migration: Nestar to Gameverse

> **Status:** Provisional plan. The Next.js frontend repository was not available during this backend session. Route and component names below describe the intended mapping and must be reconciled with the actual frontend inventory before implementation.

## Objectives

- Rebrand the frontend from Nestar to Gameverse without breaking the currently deployed GraphQL API.
- Migrate real-estate screens to game-catalog and gameshop experiences incrementally.
- Keep current Property/Agent GraphQL operations behind a client compatibility layer until the backend exposes Game/Seller operations.
- Avoid a single release that simultaneously changes routes, UI semantics, GraphQL operations, and persisted data.

## Migration Phases

### 1. Inventory the frontend

Before editing, record:

- Next.js version and router mode: Pages Router or App Router.
- Routes, layouts, loading/error boundaries, and middleware.
- Property, agent, member, community, and admin components.
- GraphQL documents, fragments, generated hooks/types, and code-generation configuration.
- Authentication/token storage and API/WebSocket endpoints.
- Images, logos, metadata, manifests, SEO text, and analytics names.
- Tests, Storybook stories, fixtures, mocks, and deployment variables.

The inventory becomes the authoritative mapping. Do not assume the provisional paths below exist.

### 2. Apply branding only

- Replace visible Nestar names, logos, metadata, titles, and copy with Gameverse.
- Preserve route structure, GraphQL documents, cache keys, and data adapters.
- Update backend build/deployment references from `nestar-api` to `gameverse-api` only where frontend tooling explicitly references a Nest project name.
- Do not replace `Property` or `Agent` in GraphQL documents during this phase.

### 3. Introduce a frontend compatibility layer

- Centralize GraphQL documents in a data-access module.
- Map current backend `Property` data into a temporary frontend `CatalogItem` view model.
- Map `Agent` into a temporary `SellerProfile` view model only at the UI boundary.
- Keep raw generated GraphQL types separate from Gameverse UI models.
- Add adapter tests so later backend schema changes require changes in one layer rather than every component.

### 4. Migrate pages and components

Use the inventory to migrate one vertical slice at a time: list, detail, user collection, seller management, and admin. Preserve old routes with redirects only after analytics and inbound-link requirements are known.

### 5. Introduce Game GraphQL operations

The backend must define and test the Game schema before the frontend switches. During rollout:

1. Add Game operations alongside current Property operations.
2. Regenerate frontend types.
3. Switch one page or feature flag at a time.
4. Compare responses and behavior.
5. Remove Property documents only after all consumers migrate.

### 6. Validate and remove compatibility code

- Test authenticated, unauthenticated, seller, and admin flows.
- Verify SSR/SSG behavior and Apollo/GraphQL cache normalization.
- Verify deep links, redirects, metadata, image loading, uploads, and WebSocket connectivity.
- Remove old routes, adapters, terminology, and GraphQL documents only after backend deprecation criteria are met.

## Provisional Page and Component Mapping

| Nestar concept | Provisional Nestar UI | Gameverse target | Suggested Gameverse UI |
| --- | --- | --- | --- |
| Property landing/search | `/property`, property list/filter components | Game catalog | `/games`, game grid/filter components |
| Property detail | `/property/[id]`, property detail/gallery | Game detail | `/games/[id]`, game detail/media/purchase panel |
| Agent directory | `/agent`, agent cards | Seller directory | `/sellers`, seller cards |
| Agent profile | `/agent/[id]` | Seller profile/store | `/sellers/[id]` |
| Agent property management | My properties dashboard | Seller catalog management | `/seller/games` |
| Create/update property | Property editor | Create/update catalog entry | `/seller/games/new`, `/seller/games/[id]/edit` |
| Favorites | Favorite properties | Wishlist | `/account/wishlist` |
| Visited properties | Recently visited properties | Recently viewed games | `/account/recently-viewed` |
| Member profile | Member profile | Customer/community profile | `/members/[id]` or `/account` |
| Board articles | Community board | Gameverse community | `/community` |
| Admin properties | Property moderation | Game catalog administration | `/admin/games` |
| Admin agents/members | Member administration | User/seller administration | `/admin/members`, `/admin/sellers` |

## GraphQL Operation Rename Plan

The right-hand names are **proposals**, not current backend operations.

| Current operation | Proposed Gameverse operation | Migration note |
| --- | --- | --- |
| `createProperty` | `createGame` | Add only after Game input/schema exists |
| `getProperty` | `getGame` | Run alongside the old detail query during transition |
| `updateProperty` | `updateGame` | Define ownership and catalog permissions first |
| `getProperties` | `getGames` | Replace location/room filters with genre/platform/catalog filters |
| `getFavorites` | `getWishlist` | Decide whether wishlist is a renamed like or distinct entity |
| `getVisited` | `getRecentlyViewedGames` | Preserve privacy and retention semantics explicitly |
| `getAgentProperties` | `getSellerGames` | Requires a confirmed Seller role model |
| `likeTargetProperty` | `likeGame` | Decide whether product likes and wishlist are separate concepts |
| `getAllPropertiesByAdmin` | `getAllGamesByAdmin` | Preserve pagination and moderation behavior |
| `updatePropertyByAdmin` | `updateGameByAdmin` | Define catalog status transitions |
| `removePropertyByAdmin` | `removeGameByAdmin` | Define soft-delete and order-history constraints |
| `getAgents` | `getSellers` | Do not rename until the `AGENT` role migration is designed |

## GraphQL Type Rename Plan

| Current type | Proposed type | Required design work |
| --- | --- | --- |
| `Property` | `Game` | Catalog fields, editions, media, price, inventory, platform, genre |
| `Properties` | `Games` | Pagination shape can remain compatible |
| `PropertyInput` | `GameInput` | Validate catalog creation requirements |
| `PropertyUpdate` | `GameUpdate` | Define mutable and admin-only fields |
| `PropertiesInquiry` | `GamesInquiry` | Replace property filters and sorts |
| `AgentPropertiesInquiry` | `SellerGamesInquiry` | Confirm seller model and permissions |
| `AllPropertiesInquiry` | `AllGamesInquiry` | Define admin filters and statuses |
| `PropertyType` | `GameType` or remove | Decide whether this means format, edition, or product type |
| `PropertyStatus` | `GameStatus` | Define draft, active, unavailable, archived states |
| `PropertyLocation` | Platform/region fields | Location has no direct one-to-one catalog equivalent |

## UI Terminology

| Current UI term | Gameverse term | Notes |
| --- | --- | --- |
| Property | Game | Use only after data adapters support it |
| Properties | Games / Catalog | Select based on navigation context |
| Agent | Seller | Provisional until roles are confirmed |
| Property images | Game media | May include covers, screenshots, and video later |
| Property price | Price | Currency and discount rules require product design |
| Property status | Catalog status | Do not map `SOLD` mechanically |
| Favorite property | Wishlist item | Confirm whether likes and wishlist remain unified |
| Visited property | Recently viewed game | Define retention and guest behavior |
| Property rank | Game popularity/rank | Ranking formula must be redesigned |

## Acceptance Criteria

- The initial branding release makes no GraphQL schema assumptions.
- Current backend operations continue working until explicit deprecation.
- Provisional mappings are replaced by verified paths after frontend inventory.
- New Game operations have generated types, adapter tests, page tests, and rollback instructions before adoption.
- No Property operation is removed while an active frontend document still references it.

