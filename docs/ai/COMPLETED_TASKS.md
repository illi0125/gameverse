# Completed Tasks

## Session Summary

This session established the current backend baseline, planned a compatibility-safe rename, and implemented the Nestar → Gameverse application-identity migration.

## Architecture Analysis

- Inventoried both Nest applications and the GraphQL/Mongoose feature structure.
- Identified reusable capabilities: authentication, members, articles, comments, likes, views, follows, uploads, and WebSocket chat.
- Confirmed that the executable business domain remains real estate.
- Identified missing gameshop capabilities: Game catalog, platform/genre metadata, inventory, cart, checkout, orders, payments, and ownership-aware reviews.
- Documented security, consistency, testing, and coupling risks for later work.

## Completed Rename Refactors

| Area | Completed change |
| --- | --- |
| Package metadata | Package renamed from `nestar` to `gameverse`; Gameverse description added |
| Application directories | `apps/nestar-api` → `apps/gameverse-api`; `apps/nestar-batch` → `apps/gameverse-batch` |
| Nest projects | Project keys, roots, source roots, and tsconfig paths renamed |
| Build output | Output paths changed to `dist/apps/gameverse-api` and `dist/apps/gameverse-batch` |
| Scripts | Batch start, production, and e2e paths updated; explicit API and batch build scripts added |
| Cross-app imports | Batch imports now reference `gameverse-api` |
| Runtime branding | API and batch REST welcome strings changed to Gameverse |
| Tests | Welcome assertions, batch module import, descriptions, and Supertest typings/imports updated |
| README | Gameverse heading and monorepo description added |
| Lint tooling | Flat-config imports declared as direct dev dependencies |
| Lockfile | Package identity and lint dependency graph synchronized |

## Deliberately Unchanged

- GraphQL resolvers, operations, DTOs, fields, enums, and authorization rules.
- Mongoose model names, schema fields, references, indexes, and collection names.
- Environment-variable names.
- Property and Agent business behavior.
- WebSocket protocol and events.
- Cron constants, expressions, order, ranking formulas, and database operations.

## Validation Status

| Check | Result |
| --- | --- |
| Targeted ESLint on content-changed TypeScript files | Passed |
| Repository-wide `tsc --noEmit` | Passed |
| `npm run build:api` | Passed |
| `npm run build:batch` | Passed |
| Protected GraphQL/Mongoose file comparison | Byte-identical |
| Old/new application file count | 86 old files mapped to 86 new files |
| Environment contract | Preserved, including existing `NODE_ENV` usage |
| Cron expressions and constants | Preserved |
| Residual Nestar text in active worktree | None after implementation |
| Residual Nestar application paths | None after implementation |
| Whitespace validation | `git diff --check` passed |

## Git Rename Note

Before staging, a filesystem move appears in `git status` as deleted old files plus untracked new directories. Once staged, Git compares content and reports matching files as renames. This is normal Git behavior and does not mean the files were recreated with different business logic.

## Current Migration Boundary

The active backend contract now exposes the Game catalog while intentionally retaining Agent roles and APIs. Commerce, wishlist, and structured review domains remain future work.

## Property-to-Game Vertical Slice

The first business-domain migration is now implemented:

- Replaced Property components, DTOs, enums, schema, model binding, collection access, and GraphQL operations with Game equivalents.
- Added the approved Game status/type/platform/genre/mode enums, catalog fields, embedded system requirements, immutable generated slugs, strict price rules, lifecycle handling, filters, sorts, and indexes.
- Preserved `MemberType.USER | AGENT | ADMIN`; AGENT remains the Game owner and `memberProperties` became `memberGames`.
- Migrated likes, views, comments, favorites, visited Games, notifications, upload targeting, and aggregation lookups to Game terminology and group-aware identity.
- Added persisted Game ranking and updated batch/Agent ranking without changing cron schedules.
- Added an explicit manifest-driven migration CLI with dry-run, apply, verify, snapshots, counter reconciliation, partial-failure markers, and rollback.
- Added focused Game rule/lifecycle and batch ranking tests.
- Updated backend, frontend-contract, decisions, next-steps, and migration-manifest documentation.

### Game Migration Validation

| Check | Result |
| --- | --- |
| Focused Jest suite | 4 suites / 11 tests passed |
| API and batch HTTP smoke tests | Passed |
| API `tsc --noEmit` | Passed |
| Batch `tsc --noEmit` | Passed |
| API build | Passed |
| Batch build | Passed |
| Default build | Passed |
| Migration CLI compilation/help | Passed |
| Active runtime Property identifier scan | No matches |
| `git diff --check` | Passed |

Database apply/verify/rollback was intentionally not executed against the configured remote database. It requires a reviewed manifest and a maintenance-window run against a backed-up database copy.

## Member Games Compatibility Repair

- Added defensive normalization for `memberGames` in `getMember`, `getAgents`, and admin member aggregation responses.
- Added a focused `migrate:member-games` command with dry-run, apply, and verify modes.
- The backfill preserves existing values, copies the legacy counter when available, defaults otherwise to zero, and leaves the legacy field untouched.
- Added focused coverage for schema defaults, lean-query normalization, aggregation guards, dry-run behavior, legacy copying, and idempotent repeated execution.
- The database backfill was not executed automatically or against the configured remote database.

Validation passed with 5 Jest suites / 12 tests, API and batch typechecks, API and batch builds, both migration CLI help checks, and `git diff --check`.

## Game Owner and Stale-Token Repair

- Changed shared authentication to validate JWT signatures and then load the current active member from MongoDB; stale, blocked, and deleted members can no longer use protected APIs.
- Kept optional authentication permissive by treating rejected tokens as anonymous, and applied the same database-backed identity behavior to WebSocket authentication.
- Made single Game reads and Game list/favorite/visited aggregations preserve Games whose nullable `memberData` cannot be resolved.
- Added an idempotent, transactional `repair:game-owner` command with dry-run, apply, and verify modes.
- Reassigned the orphaned `Clash of Clans` Game (`6ac51727964023602da703cb`) to active AGENT Leo (`6ac50f373a8218715782a3ac`) on 2026-10-07 and verified `memberGames: 1` against one owned non-deleted Game.
- Added focused authentication, optional-guard, Game read/aggregation, repair validation, transaction, verification, and repeated-apply tests.

## Frontend Migration (gameverse-next) — Phases 0–2

Agreed decisions: routes `/game` and `/game/detail?id=` (temporary `/property` redirects), id-based detail links until a slug lookup exists, "Agent" UI terminology retained, hand-written GraphQL types and documents.

- **Phase 0 — Baseline:** `tsconfig.json` now uses `module: esnext` / `moduleResolution: node` (TypeScript 4.6.2 rejected `nodenext` with TS4124, so `tsc --noEmit` never ran). Package renamed to `gameverse-next`; `_document.tsx` SEO copy rebranded. `.env.development` already targets port 3007.
- **Phase 1 — Types and enums:** `MeLiked`/`TotalCounter` moved to `libs/types/common.ts` (Property types re-export them temporarily). Added `libs/enums/game.enum.ts` and `libs/types/game/{game,game.input,game.update}.ts` mirroring backend DTOs. Like/View/Comment/Notification groups use `GAME`. `memberProperties` → `memberGames` in types, JWT payload, `userVar`, auth, GraphQL documents, `MemberMenu`, and `AgentCard`.
- **Phase 2 — GraphQL documents:** Added `GET_GAME`, `GET_GAMES`, `GET_AGENT_GAMES`, `GET_FAVORITE_GAMES`, `GET_VISITED_GAMES`, `CREATE_GAME`, `UPDATE_GAME`, `LIKE_TARGET_GAME`, `GET_ALL_GAMES_BY_ADMIN`, `UPDATE_GAME_BY_ADMIN`, `REMOVE_GAME_BY_ADMIN`. Legacy Property documents remain only until their consumers migrate (Phases 4–8) and are deleted in Phase 9.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Schema validation of all Apollo documents against live `localhost:3007` introspection | 36/47 valid; all 11 failures are legacy Property documents scheduled for removal |
| Live `getGames` smoke query | Passed |

## Frontend Migration (gameverse-next) — Phases 3–4

- **Phase 3 — Shared helpers:** `libs/config.ts` gained `topGameRank`, `gamePriceMax`, `gameReleaseYears`, and `gameSortOptions` (backend-allowed sort keys only). `libs/utils.ts` gained `likeTargetGameHandler`, `formatEnumLabel`, `formatGamePrice`/`formatGameOriginalPrice`/`hasGameDiscount`, and `validateGamePricing` mirroring the backend FREE/PAID/PREMIUM rules.
- **Phase 4 — Catalog:** New `/game` page (`pages/game/index.tsx`), `libs/components/game/Filter.tsx` (text, platform, genre, mode, pricing type, featured, release-year range, price range; URL-driven `?input=` preserved, filter changes reset to page 1), and `libs/components/game/GameCard.tsx` (discount/Free pricing, UPCOMING/TOP badges, platform chips, likes/views). Query input is whitelisted against `GameSearch` keys so stale URLs never reach the API. Styles in `scss/pc/game/game.scss`. Navigation, layout header, and en/kr/ru `Games`/`Game Search` keys added. `next.config.js` temporarily redirects `/property` → `/game` (307). Legacy Property listing files remain until Phase 9.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `/game` SSR | 200 |
| Live catalog in headless Chrome (anonymous) | Renders backend Game, pagination, total |
| URL-driven platform/genre/type filters | Applied and reflected in checkboxes |
| Legacy `/property?input=` with real-estate filters | 307 → `/game`, unknown keys dropped, results load |

## Frontend Migration (gameverse-next) — Phase 5

- New `/game/detail?id=` page (`pages/game/detail.tsx`): type/upcoming/featured badges, developer/publisher, release date, platform chips, views/likes (toggle)/comments, discount-aware price, image gallery with active thumbnail, facts row (genres/modes/platforms/release), description + long-form overview, details grid, video embeds (YouTube → nocookie iframe, otherwise `<video>`), per-platform system requirements, comments using `CommentGroup.GAME`, owner sidebar that tolerates `memberData: null`, unavailable/empty state, and similar Games by genre.
- New `libs/components/common/GameBigCard.tsx`; styles in `scss/pc/game/detail.scss` and `scss/pc/game/gameBigCard.scss`. Navbar treatment and a temporary `/property/detail` → `/game/detail` redirect added (Game IDs were preserved by the backend migration).
- **Contract fix:** backend `CommentsInquiry.search` requires `commentGroup`. The frontend type omitted it, so comment lists were also failing on agent detail (`MEMBER`) and community detail (`ARTICLE`). The type now requires it and all callers pass the correct group.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Live detail page in headless Chrome (anonymous) | Renders all sections; no GraphQL errors in console |
| Live `getComments` with `commentGroup: GAME` | Passed |
| Legacy `/property/detail?id=` | 307 → `/game/detail?id=` |
| Not yet exercised (no data / no test account) | Videos, system requirements, similar-games slider, authenticated like and comment submission |

## Frontend Migration (gameverse-next) — Phase 6

- **Homepage sections:** `TrendProperties`/`PopularProperties`/`TopProperties` renamed (git mv) to `TrendGames`/`PopularGames`/`TopGames`, now using `GET_GAMES`, `LIKE_TARGET_GAME`, and sorts `gameLikes`/`gameViews`/`gameRank`. The three near-identical Property cards were replaced by one `HomeGameCard` (`variant: trend | popular | top`): price/Free, upcoming/top badges (popular), description, platform chips, genres, views/likes.
- **HeaderFilter:** Location/Property type/Rooms dropdowns became Platform → Genre → Pricing; the advanced modal now covers text, game modes, featured-only, release-year range, and price range, and pushes a whitelisted `GamesInquiry` to `/game?input=`. Real-estate config (`propertyYears`, `propertySquare`) is no longer used by the header.
- **Styles/i18n:** homepage section selectors renamed in `scss/pc/homepage/homepage.scss` and `scss/mobile/main.scss`; chip/upcoming styles and wrapping genre menu added; en/kr/ru `Platform`/`Genre`/`Pricing` keys.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Live homepage in headless Chrome (anonymous) | Trending, Popular, Top Games, and Top Agents render backend data; no GraphQL errors |
| Header-filter URL shape on `/game` | Full filter returns the expected Game; `isFeatured: true` correctly returns none |
| Headless note | Homepage needs `--use-angle=swiftshader` (three.js scene requires WebGL) and autoplay disabled, otherwise hydration stalls — environment-only, not an app defect |
| Not exercised | Interactive dropdown clicks and authenticated likes |

## Frontend Migration (gameverse-next) — Phase 7

- **Agent/member:** `pages/agent/detail.tsx` lists agent Games via `GET_GAMES` + `GameBigCard` with `LIKE_TARGET_GAME`. `MemberProperties` → `MemberGames` (git mv); member tab `properties` → `games` (legacy value redirected); menu label/count use `memberGames`; follower/following default tab and the article total text fixed.
- **My Page lists:** `PropertyCard` → `MyGameCard`, `MyProperties` → `MyGames` (git mv). My Games uses `GET_AGENT_GAMES` with **Active/Upcoming** tabs (backend rejects `DELETE` in `getAgentGames`), status toggle ACTIVE↔UPCOMING, soft delete via `updateGame({ gameStatus: DELETE })`, and edit. The agent-only guard moved from render into an effect. `MyFavorites`/`RecentlyVisited` use `GET_FAVORITE_GAMES`/`GET_VISITED_GAMES` + `GameCard`. Menu categories `addProperty`/`myProperties` → `addGame`/`myGames`; legacy links redirect and `propertyId` maps to `gameId`.
- **Add/Edit Game (`AddNewGame`, git mv from `AddNewProperty`):** title, developer, publisher, release date, status (Active/Upcoming), pricing type with FREE forcing zero prices, price/discount, platform/genre/mode chip toggles, short description and overview with counters, video URLs, per-platform system requirements, multi-image upload to the `game` target (append, remove, cover badge, 5 per batch / 10 total), client validation mirroring backend DTO lengths and `validateGamePricing`, and edit mode via `?gameId=`.
- **Styles:** `memberProperties.scss`/`myProperties.scss`/`addNewProperty.scss` renamed to Game equivalents with selector renames; GameCard chip/price/badge styles made global for every `.card-config`.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Live agent detail (anonymous) | Agent Games render with GameBigCard |
| Live member page, legacy `category=properties` | Redirected to Games tab; MyGameCard row renders |
| Create/update payload shapes vs live schema (`coerceInputValue`, non-mutating) | `GameInput` and `GameUpdate` (incl. DELETE) valid |
| Apollo documents vs live schema | 36/47; the 11 failures are legacy Property documents removed in Phase 9 |
| Not exercised (needs an AGENT login) | My Games tabs/actions, Add/Edit submit, image upload, Favorites/Recently Visited rendering |

## Frontend Migration (gameverse-next) — Phase 8

- Admin catalog moved (git mv) to `pages/_admin/games` and `libs/components/admin/games/GameList.tsx`; sidebar menu now "Games"; temporary `/_admin/properties` → `/_admin/games` redirect.
- Uses `GET_ALL_GAMES_BY_ADMIN`, `UPDATE_GAME_BY_ADMIN`, `REMOVE_GAME_BY_ADMIN`. Tabs: All / Active / Upcoming / Deleted. Filters: text, platform, genre, type, featured. Table: id, title (links to detail unless deleted), price, owner (tolerates null `memberData`), platforms, type, featured switch (`isFeatured`, disabled while deleted), status badge menu (change status; deleted rows offer "Restore as Active/Upcoming"), and permanent removal only for deleted rows (backend requires `DELETE` status). Delete and permanent removal ask for confirmation. Redundant manual refetch-on-state effects were removed; Apollo refetches on variable change.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `/_admin/games` dev compile | 200 |
| `/_admin/properties` | 307 → `/_admin/games` |
| Admin inputs vs live schema (`AllGamesInquiry` with all filters, `AdminGameUpdate` featured/status) | Valid |
| Not exercised (needs an ADMIN login) | Listing, featured toggle, status changes, restore, permanent removal |

## Frontend Migration (gameverse-next) — Phase 9

Phases 0–8 committed as `591ada5` on `modification`.

- **Dead code removed:** `pages/property/*`, `libs/components/property/*` (generic comment `Review` moved to `libs/components/game/Review.tsx`), `PropertyBigCard`, `libs/types/property/*`, `libs/enums/property.enum.ts`, Property Apollo documents, `likeTargetPropertyHandler`, real-estate config (`availableOptions`, `propertyYears`, `propertySquare`, `topPropertyRank`), Property SCSS, the unused `mypage/Article.tsx`, and the homepage Advertisement video section.
- **Copy:** FAQ rewritten for a game catalog (no promises of unbuilt features such as checkout), About page copy rewritten and fabricated stats (4M/12K/20M) replaced with factual counts (5 platforms, 10 genres, 3 game modes), Notice, Footer (links to filtered catalog), Events (generic gaming events), page titles, per-page header descriptions, join/community branding. Locale keys: removed real-estate keys, added new descriptions in en/kr/ru.
- **Branding/imagery:** GAMEVERSE wordmark in `logoWhite.svg`; "NESTAR" removed from `logoText.svg`. Real-estate photos and video replaced with neutral, generated gaming-style placeholders in `public/img/gameverse/` (hero, page banners, about, join, events, 3D gallery tiles, game/article fallbacks). 54 unused real-estate assets deleted; `public/` shrank from ~70 MB to ~1.7 MB. Placeholders are intended to be swapped for real artwork at the same paths.
- **Kept intentionally:** temporary legacy redirects (`/property`, `/property/detail`, `/_admin/properties`) and legacy tab-name aliases on member/mypage.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Apollo documents vs live schema | 36/36 valid |
| Route smoke test (13 routes) | All 200; legacy routes 307 |
| Homepage / About / Join / CS in headless Chrome | Render with new branding and placeholders; live data loads; no GraphQL errors |
| Residual scan (Property / Nestar / real-estate terms, assets) | Only intentional legacy redirects/aliases remain |

## Frontend Redesign (gameverse-next) — Homepage chapter 00: Title screen

KPRVerse-inspired "Boot Sequence" direction (plan approved 2026-10-08). Only the first homepage section changed; Trending, Popular, Top, Agents, Community and Events are untouched.

- **Hero (`HomeHero.tsx`):** full-bleed ultraviolet duotone built from live top-ranked game covers (blur + grain), a sharp cut-corner "cartridge" plate with a ranked-game caption linking to `/game/detail?id=`, oversized staggered headline (Find. / Compare. / Play.), mono CTAs (`/game`, `/community?articleCategory=FREE`), HUD hairline frame. Data comes from `GET_GAMES` with exactly `TopGames.defaultProps` variables (shared Apollo cache entry).
- **Motion:** GSAP + ScrollTrigger (new dependency `gsap`). Desktop ≥900×560: 230vh sticky runway — covers advance with scroll, headline lines drift, then the stage shrinks/tilts out as a cartridge while the banner slides over it. Narrow screens: covers rotate every 5 s. `prefers-reduced-motion`: static.
- **Search console:** `HeaderFilter` restyled only via CSS (menus open upward); logic untouched.
- **Promotional banner:** live catalog readout (total games, platform/genre/mode counts from enums), scroll-driven platform marquee linking to `/game?input=` platform filters, existing `FiberContainer` 3D shelf in a cut-corner panel.
- **Homepage-only header skin:** `LayoutHome` adds `.gv-home-shell`; Top nav restyled under it. `Top.tsx`/`Footer.tsx` unchanged.
- **Fonts:** Archivo, Unbounded, JetBrains Mono linked in `_document.tsx` (used only inside `.gv-home`).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Live homepage in headless Chrome (CDP), 1440×900 scroll states, 820px, 390px mobile UA | Renders; no GSAP/GraphQL errors |
| Hero filter → Search | Pushes the same `/game?input=` shape (`platformList`/`genreList`/`typeList`) and `/game` renders results |
| Advanced filter modal | Opens with modes/text/year/price controls |
| Not exercised | Logged-in header state, Safari/Firefox, real touch devices |

## Frontend Redesign (gameverse-next) — Homepage chapter 01: Trending ("Level select")

- **`TrendGames.tsx`:** renders its own chapter markup (no longer uses the shared `HomeSection`). Query, `defaultProps` (likes DESC, limit 8), `likeGameHandler`, refetch and alerts unchanged. Section keeps `id="trending-games"`.
- **New `TrendPlate.tsx`:** cut-corner cover, rotated Unbounded like counter (real `gameLikes`), `No. 0n` index, Upcoming flag, uppercase title as a paper label straddling the cover edge, genres/platforms, price (discount aware), views, like button (same handler and aria). Whole plate clicks through to `/game/detail?id=` via a hit layer; the title link is the keyboard target.
- **Motion (GSAP):** ≥900×560 without reduced motion — sticky stage, vertical scroll drives the horizontal track (section height = track overflow + viewport, recomputed on refresh), progress line, covers pan inside frames (containerAnimation). Otherwise the existing `useHomeRail` scroll-snap rail with prev/next controls.
- **Styles:** white sheet with notched top edge over the black banner; scoped under `.gv-trend` / `.gv-plate`. `HomeGameCard` (trend variant now unused), `HomeSection` and `HomeRail` were not modified.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| 1440×900 scroll states (enter, start, 45%, 99%, exit) | Track travels, progress fills, labels above covers |
| Like while logged out | Existing "Please login first!" alert |
| Click on cover | Navigates to `/game/detail?id=…` |
| 390px mobile UA | Scroll-snap rail with controls |
| Hero regression | Unchanged |

## Frontend Redesign (gameverse-next) — Homepage chapters 02–07 (homepage complete)

All homepage sections now follow the "Boot Sequence" direction. Queries, variables, `defaultProps`, like handlers, refetches and alerts are unchanged in every component; only render markup, new presentation components and scoped styles changed.

- **02 Collection (`PopularGames` + new `CollectionCard`):** ultraviolet field, scroll-scrubbed fan of the 7 most viewed games (centre = #1), Unbounded odometer counting to `metaCounter.total`, "See all games". Fallback: snap row.
- **03 Leaderboard (`TopGames`):** night, pinned 540vh scene — scattered cover tiles converge, full-bleed cover per rank, giant rank numeral, detail (meta, price, views, like), live-highlighted ranked list with per-row like buttons, cartridge exit. Fallback: static scene for #1 + full list.
- **04 Character select (`TopAgents` + `TopAgentCard`):** giant AGENTS word, greyscale cut-corner portraits with parallax depths; hover/focus selects an agent (colour + readout of games/likes/views + View profile). "See all agents" kept.
- **05 Comms (`CommunityBoards` + `CommunityCard`):** signal-green field; news plates settle from a tilt on scroll; free board as a dated log (author, views, likes). Empty states link to the boards. Mobile placeholders untouched (not rendered on mobile index).
- **06 World map (`Events`):** angled event plates that tilt in, level at centre, tilt out; titles/descriptions as paper labels over the art edge. Static data unchanged.
- **07 Credits (new `HomeCredits` in `LayoutHome`):** looping GAMEVERSE wordmark under the footer, speed coupled to scroll velocity; homepage-only footer skin (black, mono labels, link spacing fix). Mobile footer container pinned to viewport width on the homepage.
- **Chapter index (new `HomeChapters`):** fixed right-edge chapter nav (≥1200px), IntersectionObserver active state, smooth jump (respects reduced motion), difference blend for any background.
- **Shared:** `homeMotion.ts` (scene media query, `pad`, cover/detail helpers); sheet-edge mixin with notched tabs between chapters; scrolled header made near-opaque.
- `HomeSection.tsx` and `HomeGameCard.tsx` are no longer imported (left in place); the old `.gv-section/.gv-card/.gv-bento/.gv-ranks/.gv-agents/.gv-community/.gv-events` CSS is now unused.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| 1440×900 scroll states for every chapter | Rendered as designed after fixes (leaderboard spacing, AGENTS width, event copy legibility, chapter-label overlap) |
| 390px mobile UA | No horizontal overflow (`scrollWidth` 390); Trend/Popular/Top/Agents fallbacks |
| 820px desktop window | Static fallbacks for all chapters |
| Leaderboard like (logged out) | Existing "Please login first!" alert; list highlight matches scene |
| Agent hover/focus | Selection readout updates |
| Chapter index jump | Lands on target section |
| Links | Game detail, community detail, agent detail hrefs unchanged |

## Homepage scroll restoration on Back (gameverse-next)

- **Problem:** returning from a game/agent page landed at the top of the homepage. Next's pages router does no scroll restoration by default, the homepage is short right after mount (lists fill in `onCompleted`, scroll-scene heights are set in effects), and GSAP ScrollTrigger switches `history.scrollRestoration` to `manual`. `scroll={false}` on links is unrelated (it only affects forward pushes).
- **Fix:** new `libs/hooks/useHomeScrollMemory.ts`, called once in `LayoutHome`. Saves scroll position (as chapter anchor + offset) with Next's history-entry `key` on `routeChangeStart`; on mount, restores only when the current history entry has the same key (Back/Forward), re-applying the position each frame until the layout is stable (max 4 s) and aborting on any user input.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Desktop: Trending mid-track → game → Back | Same `scrollY` (4927), same track position |
| Desktop: Leaderboard rank → game → Back | Same `scrollY`, same rank scene |
| Desktop: Agents → agent page → Back | Same `scrollY` |
| Mobile UA: Agents → agent page → Back | Same `scrollY` |
| Fresh visit via logo | Starts at top |

## New logo — "Cartridge G" (gameverse-next)

- Replaced the coral polyhedron logo with a game-specific mark: an acid-green (`#D7FF3A`) cartridge with the site's notched corner, a black G whose crossbar is a D-pad, and a GAMEVERSE wordmark in custom squared, chamfered capitals (pure vector, no font dependency).
- Same file paths, so no component changes: `public/img/logo/logoWhite.svg` (mark + white wordmark, 260×52, header/footer), `logoText.svg` (mark only, 40×40, admin sidebar, join page, community pages), `favicon.svg` (mark without outline, 64×64).
- `pages/_document.tsx`: favicon link type `image/png` → `image/svg+xml`.
- `scss/pc/community/community.scss` and `detail.scss`: community logo image no longer cropped to a circle (`object-fit: contain`).

| Check | Result |
| --- | --- |
| Rendered 16/32/40/160px marks on white, black, `#181a20` | Legible; outline holds on white |
| Header on `/`, `/account/join`, `/community` | New wordmark, no layout shift |
| Join form and community sidebar mark | Correct, full cartridge shape |
| Homepage footer | New wordmark at 52px height |
| `/_admin` sidebar | Not rendered (needs admin login); CSS is 90×90 square, so no distortion expected |
| `tsc --noEmit` | Passed |

## Game image quality — in-place replacement tool (gameverse-next)

- **Diagnosis:** the backend stores uploads byte-for-byte (no resize/recompression). All 31 files in `uploads/game` are JPEGs (named `.png`) of 299–738 px width — preview-size sources, upscaled 2–4× by the redesign's full-bleed and portrait placements.
- **Tool:** `scripts/replace-game-images.mjs` (`yarn images:replace`), plain Node, no new dependencies. `--init` creates `game-images/<Game Title>/` folders from the live API plus a README with size guidance; dry run maps files (name order, first = cover) to each game's existing upload filenames and shows sizes/warnings; `--apply` backs originals up to `game-images/_backups/<timestamp>/` (with manifest) and overwrites in place, so no database edits; `--restore <dir>` undoes. JPEG/PNG only (backend `validMimeTypes`); warns under 1920 px (cover) / 1280 px (others). `game-images/` is gitignored.
- **Verified** on a scratch copy of the uploads: mapping, warnings, WebP rejection, unmatched folder note, apply (dimensions changed), backup + restore (byte-identical). Real uploads untouched; 10 empty game folders + README left ready for the user.

## Game images replaced with official high-resolution art (gameverse-next)

- All 31 game image slots replaced in place via `yarn images:replace --apply` (no database changes). Backup of the originals: `gameverse-next/game-images/_backups/2026-10-08T15-44-20-441Z/` (undo with `--restore`).
- Sources (official publisher/store assets): Steam store `library_hero_2x` key art (3840×1240, cropped to 2048×1240 around the subject) and 1920×1080 screenshots for Apex Legends, Elden Ring, The Witcher 3, GTA V, PUBG, Counter-Strike 2; PlayStation Store 3840×2160 key art/screenshots for Genshin Impact; Riot's official VALORANT wallpaper packs (4K, cropped to remove logos); App Store screenshots for Minecraft and Clash of Clans (2208–2732 px, marketing captions cropped off). Screenshots with baked-in logos were excluded.
- Note: publisher-owned promotional art — fine for development/portfolio, replace with licensed assets before any commercial launch.
- Verified in headless Chrome: hero, Trending, Collection and Leaderboard render sharp at 1440×900.
- Follow-up: Clash of Clans and Minecraft covers replaced with official key art — Supercell's website hero (Electro Dragon + Barbarian King, 1681×729, the largest Supercell publishes) and the PlayStation Store Minecraft background art (Steve & Alex, 1920×1080, no logo). Backup: `game-images/_backups/2026-10-08T15-51-07-803Z/`.

## Events section photos (gameverse-next)

- Replaced the four placeholder SVGs with 2400 px photos under the Unsplash License (free, commercial use allowed, attribution optional): `public/img/gameverse/event-1.jpg` Indie Showcase — expo booth (Les Taylor, `rBMDVBAdRu4`); `event-2.jpg` Co-op Weekend — two controllers (JESHOOTS.COM, `photo-1493711662062`); `event-3.jpg` Retro Game Night — neon arcade (Carl Raw, `photo-1511512578047`); `event-4.jpg` Speedrun Marathon — gamer with glowing headset (Sean Do, `EHLd2utEf68`).
- `Events.tsx`: `imageSrc` paths `.svg` → `.jpg`; old `event-1..4.svg` removed (no other references). `tsc --noEmit` passed; verified in Chrome (images load at 2400 px).

## 3D shelf tiles (gameverse-next)

- `public/img/gameverse/tile-1..8.jpg` (used only by `FiberContainer`'s 3D shelf in the homepage banner) replaced with 1600×1000 crops of the official key art of eight popular games: tile-7 Elden Ring, tile-8 Genshin Impact, tile-1 GTA V, tile-4 The Witcher 3, tile-5 VALORANT, tile-6 Apex Legends (re-cropped from the 3840 px original to keep both characters), tile-2 Counter-Strike 2, tile-3 Minecraft. Same paths, no code changes; drei `<Image>` cover-fits each tile. Verified rendering in Chrome (WebGL via SwiftShader).

## Community seed articles (local database)

- Created three USER accounts via `signup` — `PixelPilot`, `RetroRiley`, `NightOwlGG` (demo data; password shared with the project owner, not stored in the repo).
- Posted 8 articles via `imageUploader` (target `article`) + `createBoardArticle`, two per board: NEWS "Ten games are now in the catalog", "How the Top Ranked list works"; FREE "What was your very first console?", "Anyone up for co-op this weekend?"; RECOMMEND "Why The Witcher 3 still holds up", "Cozy games for a rainy evening"; HUMOR "My cat is our new team captain", "\"One more match\" at 2 AM". Images are Unsplash-licensed photos (1600 px) stored in `uploads/article/`.
- Verified on the homepage Comms section and `/community`.

## Games listing page redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **New `LayoutCatalog.tsx`:** same Top / Chat / Footer and JWT refresh as `LayoutBasic`, without the legacy banner; shell class `gv-catalog-shell` scopes the homepage header/footer skin to `/game`. `LayoutBasic` is untouched (still used by other pages).
- **`pages/game/index.tsx`:** render only. Chapter 00 hero (duotone atmosphere + fanned cut plates from the current results, "ALL GAMES." display headline, live readout: total / active filters / sort, search console); chapter 01 results on a paper sheet (sticky filter panel, display count, "Showing x–y of z", sort menu, 3-column grid with a 2-column feature card on page 1, cut-corner pagination, empty state with reset). Mobile UA now renders the page instead of the old placeholder. All query, URL-sync, sort, pagination and like logic unchanged.
- **`Filter.tsx`:** handlers unchanged; markup → chip toggles over the same MUI checkboxes, fieldsets, squared selects/inputs; new presentation-only `part` prop (`search` | `panel`) so the text search sits in the hero.
- **New `CatalogCard.tsx`:** cartridge card (paper-label title, price chip, flags, platforms, genres, views, like). `GameCard` untouched (still used by My Favorites / Recently Visited).
- **New `scss/pc/game/catalog.scss`** (imported in `scss/pc/main.scss`): homepage token values re-declared under `.gv-catalog-shell`; reuses the `gv-cut*` / `gv-sheet-edge` mixins.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Interactions (CDP) | Platform chip → URL + chip on; sort → `gameRank`; reset; pagination page 2 (10 of 10); text search "witcher" → 1 result; like (logged out) → existing alert; empty state + reset |
| Layouts | 1440×900, 820 desktop window, 390 mobile UA (`scrollWidth` 390) |
| Homepage / GameCard / LayoutBasic | Unchanged (`git diff` empty) |

## Official store links ("Get it") — frontend-only (gameverse-next)

- Chosen over "Download for PC/Mac": most catalog games are not on Mac and many are console/mobile; GameVerse links out to official stores instead of hosting downloads.
- `libs/gameStores.ts`: title-keyed list (case/punctuation-insensitive) of official links — Steam, GOG, EA app, PlayStation Store, App Store, Google Play, publisher sites — for the 10 catalog games. Every URL checked to return 200; Epic Games Store pages were skipped (bot-protected, could not be verified). New games need a line added here (the backend has no store-link field).
- `StoreLinksMenu.tsx`: "Get it" button + MUI menu on each Games-page card (`CatalogCard`); `StoreLinks.tsx`: "Where to get it" block at the top of the game detail sidebar. Links open in a new tab with `rel="noopener noreferrer"`; components render nothing for games without links.
- Styles: `scss/pc/game/storeLinks.scss` (imported in `main.scss`); card genres now truncate to make room.
- Verified in Chrome: all 9 visible cards show "Get it"; The Witcher 3 menu → Steam / GOG / official site; detail page (Counter-Strike 2) → Steam / official site; opening the menu does not navigate the card. `tsc --noEmit` passed.

## Game detail page redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **`pages/game/detail.tsx`:** render only. All queries (`GET_GAME`, similar `GET_GAMES`, `GET_COMMENTS`), mutations, handlers, state, defaultProps and the `?id=` router effect are unchanged. Now uses `LayoutCatalog` (same Top/Chat/Footer/JWT refresh; page title set to `<Game> | Gameverse`) with root `.gv-catalog.gv-gd`, so catalog tokens, header/footer skin, chapter labels, `CatalogCard` and pagination styles are reused, not forked. Mobile UA now renders the page instead of the old placeholder.
- **Chapters:** 00 Title (void, duotone of the game's cover, HUD frame, masked title split into two balanced lines and sized by the longest line, credits, description, discount-aware price, "Where to get it" jump, like chip, live readout, fanned plates of the game's images) → Briefing (paper: "About the game", overview as large editorial text, spec sheet, genre/platform tags linking to filtered `/game`, sticky side column with `StoreLinks` and the owner card) → Gallery (void: full-bleed crossfading active image, giant Unbounded index, cut thumbnails, prev/next; trailers when `gameVideos` exist) → System requirements (ultraviolet, only when present) → Comms (paper: comment log + form, empty state, pagination) → More like this (signal: up to 4 `CatalogCard`s + "See all" for the genres). Chapter numbers follow the chapters actually rendered.
- **Motion (GSAP):** single load reveal (title lines), hero atmosphere zoom and fan parallax, gallery art settle + numeral drift (`MOTION_QUERY`); similar cards tilt in and level out (`SCENE_QUERY`). Reduced motion: static.
- **`Review.tsx`:** now a log entry (`<li>`: mono date, greyscale cut avatar, author button keeping the existing `/mypage` / `/member` navigation, text); mobile placeholder removed. Only used by the detail page.
- **Styles:** new `scss/pc/game/gameDetail.scss` (imported after `catalog.scss`/`storeLinks.scss`); the old `scss/pc/game/detail.scss` (only `#pc-wrap #game-detail-page`) deleted. `GameBigCard` is untouched and still used by agent detail. Homepage, `/game`, `LayoutCatalog`, `CatalogCard`, `StoreLinks` markup unchanged.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| 1440×900, all chapters (Witcher 3, VALORANT, PUBG, Clash of Clans) | Render as designed; long/short titles fit |
| 390px mobile UA | Renders full page; `scrollWidth` 390 |
| 820px desktop window | Page fits; `scrollWidth` 960 comes from the shared header (`Top`), same on the approved `/game` page — pre-existing |
| Thumbnail click / prev-next | Active image, index and count update (04/04 on Clash of Clans) |
| "Where to get it" | Jumps to the store block below the fixed header |
| Like while logged out | Existing "Please login first!" alert |
| Similar game link | Loads the new game in place (title, chapters, motion re-init) |
| Unknown id | "Game not available." state with Back to all games |
| Comment log layout | Verified with DOM-injected sample entries (no game has comments; nothing written to the database) |
| Not exercised | Logged-in like/comment submit, games with videos or system requirements (none in data) |

## "Agent" shown as "Developer" — frontend only (gameverse-next)

Decision recorded in DECISIONS.md (resolves the NEXT_STEPS item about a Seller-facing alias). Backend contract untouched: `MemberType.AGENT`, `getAgents`, `getAgentGames`, `AgentsInquiry`, JWT, DB and batch ranking are unchanged; signup and admin filters still send `'AGENT'`.

- **Role label:** new `memberTypeLabel()` in `libs/utils.ts` (AGENT → "Developer"), used by the homepage roster, the roster tiles and the game detail owner card ("View Developer").
- **Routes:** `pages/agent` → `pages/developer` (git mv); links use `?developerId=`, the detail page also accepts the legacy `agentId`. `next.config.js` redirects `/agent` and `/agent/detail` (307, query kept). Updated hrefs in `Top`, `TopAgents`, `TopAgentCard`, `AgentCard` (also fixed its name link, which pointed to the literal `agentId: 'id'`), game detail and `LayoutBasic` banners.
- **Copy:** nav and banner i18n keys renamed to `Developers` / `Developer Page` / developer descriptions in en/kr/ru; homepage giant word DEVELOPERS (`.gv-roster__word` 18.4vw → 11.2vw so it spans like AGENTS did; design-system doc updated), "See all developers", chapter index; developer list placeholder/empty/total; signup radio; FAQ tab and answers; Notice; About; admin Games column and Users filter; mobile placeholders.
- **Studio relabel:** the `gameDeveloper` field is labelled "Studio" on game detail and in Add/Edit Game (label, placeholder, validation message). Field name and payload unchanged.
- Internal identifiers (component names, `agent*` variables, `.agent-*` classes, `GET_AGENTS`, `banner-agents.svg`) intentionally unchanged.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Visible-text scan for Agent/agent | Only enum values and identifiers remain |
| Routes `/`, `/developer`, `/developer/detail`, game detail, join, cs, about | 200 |
| `/agent`, `/agent/detail?agentId=…` | 307 to `/developer…`, legacy id renders the right member |
| Homepage roster 1440 / 390 mobile | DEVELOPERS fits, roles read "Developer", no horizontal overflow |
| Game detail | Owner "Developer", "View Developer", link `/developer/detail?developerId=…`, spec "Studio" |
| Not exercised (needs logins) | Admin column/filter, Add Game form, signup submit |
| Pre-existing, not changed | Developer detail logs an Apollo warning from `getCommentsRefetch({ variables: … })` |

## Developers listing redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **`pages/developer/index.tsx`:** render only. `GET_AGENTS` query, `LIKE_TARGET_MEMBER`, the `?input=` router effect, `sortingHandler` (same 4 sorts: Recent / Oldest / Likes / Views), `paginationChangeHandler`, `likeMemberHandler`, Enter-to-search and defaultProps unchanged. Now uses `LayoutCatalog` (title "Developers | Gameverse") with root `.gv-catalog.gv-dv`, reusing catalog tokens, header/footer skin, hero atmosphere, search console, sort control, empty state and pagination. Mobile UA renders the page instead of the old placeholder. Sort label is now derived from the active sort (it used to say "Recent" after reloading a sorted URL).
- **Chapters:** 00 Title (void, duotone of the first developer, "THE DEVELOPERS." load reveal, live readout: total / search / sort, lineup of cut portrait slivers with vertical name labels, search console with a submit button that applies the same filter as Enter) → 01 Character select (paper: giant name rows with index, counts, joined date and like; hover/focus selects a developer and a sticky panel crossfades to their colour portrait with stats, View profile and like; unselected names dim while pointing at the list) → 02 Insert coin (signal: logged-out visitors get "Create an account" → `/account/join`; developers get "Add a game" → `/mypage?category=addGame`; hidden for logged-in USERs).
- **New `libs/components/developer/DeveloperRow.tsx`** (exports `developerHref`, `developerImage`). `AgentCard.tsx` deleted (only this page used it), plus its `.agent-general-card` block in `scss/pc/general.scss` and `scss/pc/agent/agent.scss`. New `scss/pc/developer/developerList.scss`.
- **Motion:** single load reveal, atmosphere zoom (`MOTION_QUERY`), lineup slivers drift apart on scroll (`SCENE_QUERY`); selection uses CSS transitions; reduced motion static. Below 1100px the panel hides and rows show their own portrait.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| 1440×900 hero, roster, selection (hover row 3 → panel Miyazaki), join | Renders as designed |
| Search "miya" | Miyamoto, Miyazaki; readout "2 developers · Matching "miya"" |
| Sort → Likes | List re-sorted, button and readout "Likes" |
| Like while logged out | Existing "Please login first!" |
| Row click / name link | `/developer/detail?developerId=…` |
| `/agent` legacy link | 307 → `/developer` |
| 390px mobile UA | Full page, `scrollWidth` 390 |
| 820px desktop window | Page fits; 960px `scrollWidth` is the shared header (pre-existing, same on `/game`) |
| Not exercised | Logged-in like, developer "Add a game" CTA, more than one page of developers (only 6 exist) |

## Developer detail redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **`pages/developer/detail.tsx`:** only imports and the render block changed. `GET_MEMBER`, developer `GET_GAMES`, `GET_COMMENTS`, `CREATE_COMMENT`, `LIKE_TARGET_GAME`, all effects, `redirectToMemberPageHandler`, both pagination handlers, `createCommentHandler` (incl. the self-review guard), `likeGameHandler`, the submit-disabled rule and defaultProps are byte-identical. Uses `LayoutCatalog` (title "<name> | Gameverse") with root `.gv-catalog.gv-gd.gv-dd`, so catalog (atmosphere, grid, `CatalogCard`, pagination, empty state) and game-detail (crumbs, flags, credits, readout, CTAs, comment log/form, loading/not-found state) styles are reused rather than forked. Mobile UA renders the page instead of the old placeholder.
- **Chapters:** 00 Profile (void, duotone of the portrait, name sized by length with the single load reveal, Developer / Joined flags, address and phone, bio when present, "Full profile" → existing member-page handler, games jump, readout of games/followers/following/likes/views/articles, sharp cut portrait plate) → 01 Library (paper: "Games by <nick>", catalog grid with a feature card on page 1, cards tilt in on scroll, pagination, empty state) → 02 Reviews (ultraviolet: review log, form, pagination). Loading and "Developer not found." states added for missing ids.
- **`libs/components/agent/ReviewCard.tsx`:** log entry markup (same anatomy as the game comments; `fromMyPage` reply affordance kept). Only used by this page.
- **Styles:** new `scss/pc/developer/developerDetail.scss`; `scss/pc/agent/detail.scss` (only `.agent-detail-page`) deleted. `GameBigCard` no longer used by any page (file left in place). A `.review-card` block in `scss/pc/main.scss` is now unused (left in place).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| 1440×900 Profile / Library / Reviews (Leo) | Renders as designed; existing review shown |
| Games pagination | Page 2 → Clash of Clans, "Showing 10–10 of 10" |
| Full profile | `/member?memberId=…` (existing handler) |
| Unknown id | "Developer not found." with All developers link |
| 390px mobile UA | Full page, `scrollWidth` 390 |
| Pre-existing, not changed | Apollo warning from `getCommentsRefetch({ variables: … })` (reviews still load via the query's own variables) |
| Not exercised | Logged-in review submit, logged-in like |

## Community page redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **`pages/community/index.tsx`:** the original state, `GET_BOARD_ARTICLES` query, `?articleCategory` effect, `tabChangeHandler`, `paginationHandler`, `likeArticleHandler`, the "Write" push to `/mypage?category=writeArticle` and defaultProps (limit 6, `createdAt` ASC) are unchanged. Uses `LayoutCatalog` (title "Community | Gameverse") with root `.gv-catalog.gv-cm`. MUI `TabContext`/`TabList`/`TabPanel` kept (keyboard + ARIA); the four duplicated panels became one panel for the active board. Mobile UA renders the page instead of the placeholder.
- **Chapters:** 00 Comms (void, duotone of the newest post, "PLAYER COMMS." load reveal, readout of total posts across boards and the current board, newest post across all boards as a cut plate with a paper-label title, title-search console) → 01 Boards (paper: four board tiles with real post counts and latest title, board title and description, sort, "Write a post", feed with a feature plate for the first post on page 1 and log rows after it, pagination, empty states) → 02 Hot on the boards (signal: five most liked posts across every board).
- **UI-only discovery features, all on existing API fields:** title search (`search.text`), sort control (Oldest first = existing default, Newest first, Most liked, Most read — `availableBoardArticleSorts`), per-board totals and newest post (one `limit: 1` query per board), cross-board most liked (`search` without category). Likes anywhere also refresh the most-liked list. The feature plate's label follows the active sort ("First post", "Latest post", …).
- **New:** `libs/components/community/PostEntry.tsx` (feature/row; same detail link and author → member page / My Page rule as `CommunityCard`), `libs/components/community/communityMeta.ts` (board labels/descriptions, `articleExcerpt`, `articleHref`, `articleImage`), `scss/pc/community/communityList.scss`. `scss/pc/community/community.scss` (only `#community-list-page`) deleted. `CommunityCard` untouched (still used by My Page and member pages).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| 1440×900 hero, board tiles, feed, most liked | Real counts (3/2/2/2), newest post, 5 ranked posts |
| Tab → Recommendations, sort → Newest, search "witcher" | Board, sort and "Showing 1–1 of 1 matching "witcher"" update |
| Like while logged out | Existing "Please login first!" |
| Post title click | `/community/detail?articleCategory=FREE&id=…` |
| 390px mobile UA / 820px window | Full page, 2×2 board tiles (short labels on phones, full name kept as accessible name); 390 `scrollWidth` 390; 820's 960 is the shared header |
| Board URL bug (found here, fixed below with approval) | `/community?articleCategory=NEWS` opened the Free board; tab changes hid the board from the URL |

### Community board URL fix (approved 2026-10-09)

- **Cause:** the "default to FREE" effect ran on the first render, before the router had parsed the query, so it always pushed FREE; both pushes used `as: router.pathname`, hiding `?articleCategory` from the URL; and `initialInput.search.articleCategory` was mutated during render (shared defaultProps).
- **Fix (`pages/community/index.tsx`):** the URL is the source of truth for the board. State initialises from the query when the router is ready; one effect waits for `router.isReady`, syncs the board from `?articleCategory` (deep links, refresh, Back/Forward) and replaces a missing or unknown value with FREE; tab changes push a visible `?articleCategory=…`. Removed the defaultProps mutation and the `console.log` in the tab handler. Query, pagination, likes, write link and defaultProps otherwise unchanged; default sort stays `createdAt` ASC.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `/community?articleCategory=NEWS` (fresh load) | News board, News tab selected, News posts |
| `/community` and `?articleCategory=BOGUS` | Replaced with `?articleCategory=FREE`, Free board |
| News → click Humor → Back | URL `?articleCategory=HUMOR` + Humor board, then back to News |
| Homepage "News board" link (client navigation) | Lands on News |

## Community detail: "No data found" fix (backend, approved 2026-10-09)

- **Cause:** the three demo USER accounts (PixelPilot, RetroRiley, NightOwlGG) were set to `DELETE` on 2026-10-09 02:10–02:11. The listing aggregation still joins their profiles, but `BoardArticleService.getBoardArticle` loaded the author with `memberService.getMember()`, which throws `NO_DATA_FOUND` for non-active members, so every post errored and the global Apollo error link showed "No data found!".
- **Fix (`apps/gameverse-api/.../board-article.service.ts`):** the author is loaded with `getMemberOrNull()` (same rule as Game owners); `BoardArticle.memberData` was already nullable. New `board-article.read.spec.ts`: deleted author → `memberData: null`; missing/deleted article still not found. 2/2 tests pass, API `tsc --noEmit` passes, the running API reloaded and returns the post.
- **Frontend:** posts and comments by deleted accounts show "Deleted account" without a profile link (new `activeAuthor()` in `communityMeta.ts`, used on the listing feed, hero and most-liked list, and in detail comments).

## Community detail redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **`pages/community/detail.tsx`:** state, `GET_BOARD_ARTICLE`, `GET_COMMENTS`, like (with `likeLoading`), create / update / delete comment (confirm), `goMemberPage`, pagination and defaultProps unchanged. Board navigation (`tabChangeHandler`) now keeps `?articleCategory` in the URL (was `as: '/community'`, which sent every board link to Free after the listing fix). Uses `LayoutCatalog`, root `.gv-catalog.gv-gd.gv-cd`; mobile UA renders the page.
- **Chapters:** 00 Post (void, duotone of the post image, crumbs, board + reading-time flags, title sized by length with the load reveal, byline, like / comments jump / copy link, readout, sharp image plate) → 01 Read (paper: sticky action rail, long-form column with the Toast UI viewer restyled for reading — Archivo 18px / 1.75, lead paragraph, headings, cut images, quotes, code — end-of-post like, board switcher and Write) → 02 Thread (ultraviolet: comment log with Author tag, own-comment Edit/Delete, inline 0/100 counter, Enter submits) → 03 Keep reading (signal: up to 3 newer posts on the same board).
- **UI-only extras:** reading progress bar (share of the article in view), copy link (Clipboard API with a fallback), reading time, related posts via `GET_BOARD_ARTICLES`, comments jump, accessible edit dialog (MUI `Dialog` replaces the per-comment `Backdrop`; same state and handlers), "Post not available" state.
- **Files:** new `scss/pc/community/communityDetail.scss`; `scss/pc/community/detail.scss` (only `#community-detail-page`) deleted; `TViewer.tsx` wrapper restyled (Viewer and renderers unchanged; only used here); `communityMeta.ts` gained `articlePlainText`, `readingMinutes`, `activeAuthor`.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Open a post from the listing | Renders; no "No data found!" alert |
| Like / comment while logged out | Existing "Please login first!"; counter 12/100 |
| Copy link (real user gesture) | Copies, no error |
| Board switcher → News | `/community?articleCategory=NEWS`, News board |
| Unknown id | "Post not available." |
| Reading progress | 0 at top, 1 once the article end is visible |
| 390px mobile UA / 820px | Full page; 390 `scrollWidth` 390; 820's 960 is the shared header |
| Not exercised (needs login) | Comment create, edit, delete; logged-in like |

## My Page redesign (gameverse-next, follows docs/GAMEVERSE_DESIGN_SYSTEM.md)

- **`pages/mypage/index.tsx`:** follow / unfollow / like-member / member-redirect handlers, the logged-out redirect and the legacy tab-name redirect are unchanged; only the render changed. Uses `LayoutCatalog` (title "<section> | Gameverse") with root `.gv-catalog.gv-gd.gv-mp`; mobile UA renders the page. Chapters: 00 Player one (void, duotone of the avatar, cut avatar, nick sized by length, role / address / current section, Edit profile + Add a game or Write a post) → 01 Console (paper: section navigation + active panel).
- **`MyMenu.tsx`** (My Page only): grouped console — Studio (Developers only: Add game, My games), Library, Social, Community, Account (profile, admin link for ADMIN, logout confirm). Each item shows a live total from its own read-only `limit: 1` query (favorites, visited, followers, following, articles, active + upcoming games), refreshed when the section changes. JWT snapshot counts are not shown (they go stale; `getMember` on yourself would record a view).
- **Sections:** new `MyPageHead`. `MyProfile` (labelled fields, photo preview, Enter submits, same disabled rule), `MyGames` (status tabs with count, table header, empty state; rows still `MyGameCard`), `MyFavorites` / `RecentlyVisited` (catalog grid), `MyArticles` (community `PostEntry` rows instead of the shared `CommunityCard`), `WriteArticle` + `Teditor` (board radio chips, display title input, restyled editor, Publish — same handlers), `AddNewGame` (same form and logic; header, no image-based select arrows, renders on mobile).
- **Shared components:** `GameCard` (only used by My Page) now uses the catalog card anatomy — favorites keep a filled heart that removes the favorite, visited has no like button. `MyGameCard` (also used by the member page) only gained `data-status` and renders on mobile; `MemberFollowers/Followings` (also used by the member page) only lost the component-level mobile placeholder. Their My Page look is CSS scoped under `.gv-mp`; the member page is unchanged.
- **Styles:** new `scss/pc/mypage/gvMyPage.scss`; the 8 old `scss/pc/mypage/*.scss` files (all scoped to `#my-page` / removed ids) deleted.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Logged out → `/mypage` | Redirects to `/` (unchanged) |
| Signed in as Leo (Developer), 1440 | Hero, console totals (My games 10, Favorites 10, Visited 3, Followers 1, Following 0, Articles 0) and every section render; no alerts, no overflow |
| My games | Active/Upcoming tabs (10 / 0), status menu "Mark as Upcoming", Edit opens Genshin Impact with 3 images (nothing saved) |
| Write article | Toast UI editor loads with board chips and title |
| 390px mobile (signed in) | All sections fit (`scrollWidth` 390); console becomes a swipeable strip; game rows keep status + actions |
| Not exercised (would change real data) | Saving profile/game, upload, delete, status change, unfavorite, follow/unfollow, publishing |
| Reload redirect bug | Found here; fixed below with approval |

### My Page reload redirect fix (approved 2026-10-09)

- **Cause:** `pages/mypage/index.tsx` redirected home when `userVar` had no `_id`. On a full load the page's effect runs before the layout's effect restores the user from the stored token, so every reload or direct visit while signed in bounced to `/` (also true before the redesign with `LayoutBasic`).
- **Fix:** redirect only when there is no user **and** no saved token (`getJwtToken()`). Logout still redirects because `logOut()` removes the token.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Signed in: open `/mypage?category=myGames` directly, then reload | Stays on My games (Leo, 5 rows) |
| Token removed, open `/mypage` | Redirects to `/` |
| Logout from the console (confirm) | Token cleared, lands on `/` |

## Admin redesign — Stage 0: Support backend (gameverse, approved 2026-10-09)

- New `components/notice` (module, resolver, service) on the existing `Notice` schema (+ `noticeTopic`, `NOTICE` category, compound index) and new `components/inquiry` with `schemas/Inquiry.model.ts`; DTOs in `libs/dto/notice` and `libs/dto/inquiry`; `SupportTopic` and `InquiryStatus` enums; `availableNoticeSorts`, `availableInquirySorts` and `escapeRegex` in `libs/config.ts`. Contract in BACKEND_MIGRATION.md.
- `scripts/seed-cs-content.ts` + `scripts/data/cs-content.ts`, `npm run seed:cs`.

| Check | Result |
| --- | --- |
| Jest (all) | 12 suites / 43 tests passed (new: notice service 6, inquiry service 6, seed 2) |
| API + batch `tsc --noEmit`, `build:api`, `build:batch` | Passed |
| Live schema | 11 new operations exposed |
| Seed dry-run / apply / re-apply / verify | 31 to insert → 31 inserted → 0 → verified |
| Live end-to-end (Admin + a developer account, throwaway records removed afterwards) | 14/14: draft hidden from public, non-admin and anonymous blocked, remove rules, answer visible to the asker |

### Stage 0 follow-ups (2026-10-09)

- **Event flag:** `Notice.noticeEvent` (schema, DTOs, input/update) restores the former "event" highlight; the seed sets it and back-fills it once on already-seeded notices that have no value (re-run flags 0). Applied: 1 notice flagged.
- **Public `/cs` reads the API:** `libs/components/cs/Notice.tsx` (`getNotices` NOTICE, newest first, numbered, event highlight, original dates) and `Faq.tsx` (`getNotices` FAQ by topic, original order) — hardcoded data removed; same layout (the CS page redesign is separate). New frontend `libs/enums/notice.enum.ts`, `libs/types/notice`, `libs/types/inquiry`, and Support documents in `apollo/{user,admin}/{query,mutation}.ts`. All 47 Apollo documents validate against the live schema.

## Admin redesign — Stage 1: shell, shared components, Users (gameverse-next)

- **Shell (`LayoutAdmin.tsx`):** admin check, token restore, redirect and logout logic unchanged. New "Control Room" markup: black sidebar (logo, Control room tag, admin identity, grouped navigation, View site, Logout), sticky top bar (breadcrumb from the route, account menu), skip link, page titles `<Page> · Admin | Gameverse`; below 1100px the sidebar is a drawer with a scrim. Keeps `id="pc-wrap"` + `#bunker` so not-yet-migrated pages keep their legacy styles.
- **`AdminMenuList.tsx`:** same routes, grouped Manage (Users, Games, Community) / Support (FAQ, Notices); active item from the URL; exports `adminNavGroups` and `adminPageTitle`.
- **Shared kit `libs/components/admin/ui/AdminUi.tsx`:** `AdminPageHeader`, `AdminTabs` (with counts), `AdminSearch` (Enter/submit/clear), `StatusChip` (tones live/hold/alert/off/neutral; opens menus), `AdminEmpty`, `useAdminDensity` + `DensityToggle` (saved per browser).
- **Users (`pages/_admin/users/index.tsx`, `MemberList.tsx`):** all handlers unchanged (tabs, search, type filter, paging, rows per page, role/status update via the same menus). Status tabs show real totals (`getAllMembersByAdmin` `limit: 1` per status, refreshed after changes); table with avatar + nick + id, role and status chips, empty/loading/error states, density toggle.
- **Styles:** new `scss/pc/admin/gvAdmin.scss` (loaded after `admin.scss`); `admin.scss` stays until Games, Community and Support are migrated.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Signed in as Admin, 1440 | Tabs All 14 / Active 13 / Blocked 0 / Deleted 1; tab switch; search "leo" → Leo; clear; compact density; status menu lists the other statuses (closed without changing anything) |
| Legacy Games / FAQ pages inside the new shell | Render with their previous styles |
| 820px | Sidebar opens as a drawer over a scrim |
| Not exercised (would change real accounts) | Applying a role or status change |

## Admin redesign — Stage 2: Games (gameverse-next)

- **Page (`pages/_admin/games/index.tsx`):** inquiry state and every handler unchanged (status tabs, text search, platform/genre/type/featured filters, paging, rows per page, status menu, featured switch, delete confirm, permanent remove). Now uses the shared kit: `AdminPageHeader`, `AdminTabs` with real totals (`getAllGamesByAdmin` `limit: 1` per status, refreshed after changes), `AdminSearch` (Enter / Search / clear — the old submit-on-blur is gone, matching Users), labelled `gv-admin-select` filters, `DensityToggle`.
- **Table (`GameList.tsx`):** cover thumbnail + title + id (links to the game unless deleted), developer links to the member page, price with struck-through original when discounted, platforms, type, views, square featured switch (disabled while deleted), status chip (Active / Upcoming / Deleted) opening the same menu ("Restore as …" for deleted), icon button for permanent remove; loading / error / empty states.
- **Styles:** additions in `scss/pc/admin/gvAdmin.scss` (`gv-admin-link`, `gv-admin-game__*`, `gv-admin-switch`, `gv-admin-row-actions`, `gv-admin-iconbtn`, dimmed deleted rows).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `next dev` → `/_admin/games` | Compiles (page + SCSS), 200 |
| Count query input vs live `AllGamesInquiry` schema | Valid (`page`, `limit`, `search` required) |
| Signed-in visual check (1440 / 820 / 390) | **Not done** — no browser available in this session |
| Not exercised (would change real data) | Status change, featuring, delete, permanent remove |

## Admin redesign — Stage 3: Community (gameverse-next)

- **Page (`pages/_admin/community/index.tsx`):** inquiry state and handlers unchanged (status tabs, board filter, paging, rows per page, status menu, permanent remove). Shared kit: `AdminPageHeader`, `AdminTabs` with real totals (`getAllBoardArticlesByAdmin` `limit: 1` per status, refreshed after changes), labelled board filter using the public board names (`communityBoards`), `DensityToggle`. No search box: `ABAISearch` has no text field. Title typo "Arricle List" gone.
- **Fixes:** debug `console.log`s removed; after a permanent remove the list refetch now passes `{ input }` (it passed `{ variables: { input } }`, which only worked because Apollo merged the old variables).
- **Table (`CommunityArticleList.tsx`):** cover + title + id (links to the article unless deleted), board name, writer avatar + nick (links to the member page), views, likes, posted date, status chip. Deleted articles show a plain "Deleted" chip and the remove button — no restore, because `updateBoardArticleByAdmin` only matches active articles. Loading / error / empty states.
- **Styles:** `gv-admin-article__title`, `gv-admin-writer` in `gvAdmin.scss`.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `next dev -p 3100` → `/_admin/community`, `/_admin/games` | Both compile, 200 (server stopped afterwards; port 3000 left free) |
| Signed-in visual check | **Not done** — no browser available in this session |
| Not exercised (would change real data) | Deleting an article, permanent remove |

### Stage 3 follow-up: restore deleted articles (approved 2026-10-09)

- **Backend (gameverse):** `updateBoardArticleByAdmin` matches any status, so `DELETE → ACTIVE` restores; the author's `memberArticles` counter follows real status changes only (−1 delete, +1 restore, 0 otherwise). New `board-article.admin.spec.ts` (4 tests).
- **Frontend:** the Community status chip on deleted rows opens "Restore as Active" again, next to the remove button.

| Check | Result |
| --- | --- |
| Jest (all) | 13 suites / 47 tests passed |
| API `tsc --noEmit` | Passed |
| Running API (watch) | Restarted with the change |
| Not exercised (would change real data) | Restoring a real article |

## Admin redesign — Stage 4: Support (gameverse-next)

All three Support pages were static placeholders (no queries, no handlers). They now use the Stage 0 API.

- **FAQ + Notices (`pages/_admin/cs/faq.tsx`, `notice.tsx`):** both render `NoticeManager` with a kind from `supportMeta.ts` (FAQ: topic column and filter, oldest first like the public page; Notices: event switch, newest first). Status tabs All / Published / Drafts / Deleted with real counts, title search, density toggle, paging. Status chip menu: Publish / Move to drafts / Delete (confirm) / Restore as draft or published; permanent remove only for deleted rows (confirm); edit button on the others.
- **`NoticeEditor` dialog:** create / edit with topic (FAQ), title and content (counters, API limits 3–150 / 3–5000, inline errors), event checkbox (Notices), Draft / Published choice. Toast on save.
- **Inquiries (`pages/_admin/cs/inquiry.tsx`):** opens on the Pending queue (oldest first; other tabs newest first), tabs Pending / Answered / Closed / All with counts, title search, topic filter. Rows show title + preview, asker, topic, asked / answered dates, status. **`InquiryAnswerDialog`:** the question, reply box (2–2000; "Update reply" once answered), Close inquiry, Reopen (back to Answered if a reply exists, else Pending; dialog stays open). Remove only for closed inquiries.
- **Sidebar:** "Inquiries" added under Support (it was reachable only by URL).
- **Removed:** `libs/components/admin/cs/FaqList.tsx` (placeholder rows, now unused). `NoticeList.tsx` and `InquiryList.tsx` rewritten.
- **Styles (`gvAdmin.scss`):** tokens also declared on `.gv-admin-dialog` (dialogs render in a portal); `gv-admin-btn` (cut-corner primary, ghost, small), dialog, fields, segment, checkbox, inquiry thread, support cells.
- **`admin.scss` kept on purpose:** every admin page is migrated, but its rules are scoped to `#pc-wrap`, which the public layouts also use (e.g. it fixes `.MuiAppBar-root`). Remove it only with a visual pass over public pages.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| `next dev -p 3100` → all six admin routes | Compile, 200 (server stopped afterwards) |
| Notice / inquiry list, count and create inputs vs live API | Accepted by schema validation (anonymous calls stop at the auth guard) |
| Signed-in visual check, creating / answering / status changes | **Not done** — no browser in this session; would also change real data |
