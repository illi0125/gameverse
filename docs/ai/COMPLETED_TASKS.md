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
