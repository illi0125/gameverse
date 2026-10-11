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

## Help (CS) page redesign (gameverse-next, 2026-10-09)

- **Layout:** `/cs` moves from `LayoutBasic` (legacy banner header) to `LayoutCatalog` like the other redesigned pages; root `.gv-catalog.gv-cs`. Routing unchanged: `?tab=notice|faq` (default `notice`) via the same `changeTabHandler`; `inquiry` added as a third tab. The `device === 'mobile'` placeholders ("CS PAGE MOBILE", "FAQ MOBILE"…) are replaced by the responsive page.
- **Chapters:** 00 Help desk (void hero: masked headline with the page's one load reveal, live readout of FAQ/topic/notice counts, topic shortcuts, latest event/notice plate, help search console) → Desk (paper: 01 FAQ / 02 Notices / 03 Ask us tabs) → 04 Still stuck (signal: Ask the team, Ask the community → `/community?articleCategory=FREE`) → footer.
- **FAQ (`Faq.tsx`):** one query for every published FAQ (`limit 200`, original order) instead of one per topic; topic rail with real counts (sticky on desktop, horizontal rail below 1100px), numbered questions, one answer open at a time (as before), instant search over question and answer with highlighted matches and an empty state.
- **Notices (`Notice.tsx`):** same query and order; dated log with Unbounded numbers, Signal "Event" flag, Read more for long bodies.
- **Ask us (`Inquiry.tsx`, was a placeholder):** uses the Stage 0 member API (`createInquiry`, `getMyInquiries`) — no backend change. Topic chips, title (3–100) and message (5–2000) with counters and inline errors, sent confirmation; history with status (Waiting for reply / Answered / Closed), the team's reply, Show more. Signed out: sign-in gate; with a saved token it waits for the session restore instead of flashing the gate.
- **Files:** `pages/cs/index.tsx`, `libs/components/cs/{Faq,Notice,Inquiry}.tsx`, new `libs/components/cs/csMeta.ts`, `scss/pc/cs/cs.scss` (legacy `.cs-page` styles replaced).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Headless Chrome 1440 (CDP), all three tabs | Render; counts 29 answers / 7 topics / 2 notices; accordion single-open; topic switch; search "password" → 1 match highlighted; no-match empty state; Clear; Jump-to shortcuts; tab URLs `?tab=faq|inquiry` |
| 390 mobile UA | `scrollWidth` 390 (topic rail scrolls inside its own container) |
| 820 desktop | 960 / 805 — caused by the shared header (`user-box`, language button) and chat widget; identical on the approved Community page, not changed here |
| Not exercised | Signed-in Ask us (no test account in this session; sending would create a real inquiry) |

## Log in / Sign up redesign (gameverse-next, 2026-10-09)

- **Layout:** `/account/join` moves from `LayoutBasic` (legacy "Login/Signup" banner) to `LayoutCatalog`; root `.gv-catalog.gv-auth`. One night scene: the top-ranked game cover as duotone atmosphere (same `GET_GAMES` request as the homepage hero) and as a sharp cut plate linking to the game, a headline that swaps with the mode ("Welcome back." / "Press start."), real catalog readout, and the form on a cut paper plate. The `device === 'mobile'` placeholder ("LOGIN MOBILE") is replaced by the responsive page.
- **Unchanged logic:** `input` state, `loginView`, `viewChangeHandler`, `handleInput`, `doLogin` / `doSignUp` (same `logIn` / `signUp` calls, same `referrer` redirect), same button-disabled rule, member type values `USER` / `AGENT` (now a two-option radio, was two checkboxes acting as one).
- **Frontend-only improvements:** password field is `type="password"` (was plain text) with a show/hide toggle; `autocomplete` hints; real `<form>` so Enter submits; inline errors mirroring the API limits (nickname 3–12, password 5–12, phone required) block a request that would fail; "Logging in…" / "Creating account…" busy state prevents double submits; `console.warn` / `console.log` of the input (which printed the password) removed.
- **Removed (did nothing):** "Remember me" checkbox (no state, the session always persists) and the empty "Lost your password?" link → replaced by "Forgot your password? Find help" → `/cs?tab=faq` (the FAQ answer for this topic).
- **Files:** `pages/account/join.tsx`, `scss/pc/account/join.scss` (legacy `.join-page` styles replaced).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Headless Chrome 1440 (CDP, real key input) | Both modes render; switch via tabs and the bottom link; submit disabled until filled; short values → inline errors, no request; reveal toggles `password`/`text`; Developer selects `AGENT`; title per mode |
| Real failed login (unknown nickname) | Click and Enter both submit with busy state; existing `logIn` → `logOut()` reloads the page, no token stored (unchanged behaviour) |
| 390 mobile UA | `scrollWidth` 390; headline lines not clipped |
| 820 desktop | 960 / 805 from the shared header + chat widget (same as Community / CS) |
| Not exercised | Successful sign-up (would create a real account), successful login (no test credentials) |

### Login / sign-up error handling fix (approved 2026-10-09)

- **Cause:** `libs/auth` matched the old Nestar messages ("Definer: login and password do not match", "Definer: user has been blocked!"), which the Gameverse API never sends, so its own alert never fired; `logIn` / `signUp` then caught the error and called `logOut()`, which reloads the page. The Apollo error link had already opened a raw-message SweetAlert, which the reload wiped. A network error also crashed on `graphQLErrors[0]`.
- **Fix:** `requestJwtToken` / `requestSignUpJwtToken` throw a readable message mapped from the API's `Message` values (unknown nick, wrong password, blocked, nick/phone in use; validation details; network; generic). `logIn` / `signUp` rethrow instead of `logOut()` + reload. The join page shows one `sweetMixinErrorAlert` (not awaited, so the form is usable at once) and does not redirect. `apollo/client.ts` error link skips its global alert for the `Login` and `Signup` operations only. Success path (token storage, `updateUserInfo`, referrer redirect) unchanged; debug `console.log`s removed.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Unknown nickname (Enter) | One alert "No account with that nickname…", no reload, fields kept, no token, `?referrer` kept |
| Wrong password for an existing account | One alert "Wrong password. Please try again.", no reload |
| Sign up with a taken nickname | One alert "That nickname or phone number is already in use.", stays on Sign up with fields kept, nothing created |
| Not exercised | Successful login / sign-up (no credentials were provided) |

## Live chat widget redesign (gameverse-next, 2026-10-09)

- **Scope:** `libs/components/Chat.tsx` (default export, rendered by the desktop branches of LayoutHome / LayoutBasic / LayoutFull / LayoutCatalog — integration untouched). Same socket contract and logic: `socketVar` / `userVar`, `onmessage` switch on `info` / `getMessages` / `message`, `socket.send({ event: 'message', data })`, empty-message alert, `handleOpenChat`, `getInputMessageHandler`, `getKeyHandler`, `onClickHandler`, launcher reveal after 100 ms and hide on route change, `ScrollableFeed` auto-scroll.
- **Visuals (`scss/pc/chat/gvChat.scss`, legacy `.chatting` block removed from `main.scss`):** ink launcher with a Signal icon cell and mono "Live chat" label (inverts while open); window as a cut plate — black HUD header (`00 Comms` chip, LIVE CHAT title, live status), paper message area, theirs = paper bubbles with avatar, mine = ink bubbles, notched last bubble of each group; composer with Signal send button when there is text. z-index 1040 (above the header, below SweetAlert 1060 and MUI modals 1300).
- **Frontend-only additions:** unread counter for other people's messages that arrive while closed (badge + launcher `aria-label`, cleared on open); sender grouping (name on the first, avatar on the last of consecutive messages; guests share one group since the contract has no guest id); connection readout from socket `open` / `close` / `error` listeners (Connecting / N online / Offline) and a guarded send when not connected (was an exception); focus to the input on open, Escape closes and returns focus to the launcher; closed window is `inert` + `aria-hidden`; placeholder names the sender ("Message as Leo" / "Message as Guest"); `socket` undefined guard; long text wraps; narrow windows (<640px) get a square launcher and a full-width sheet with `dvh` / safe-area sizing; reduced motion respected. No timestamps or date separators: messages carry none.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Live socket, 1440 (CDP) | Launcher bottom-right; window `inert` while closed; 3 messages from a second guest client while closed → badge "3", label "3 new messages"; open → focus in input, badge cleared, status "1 online"; history (`getMessages`) on reload; grouping name-first / avatar-last; long unbroken text wraps (no horizontal scroll), feed at bottom; empty send → "Message is empty!"; Escape closes, focus back on launcher |
| 600px window | Full-width sheet 12px from the edges, launcher 52×52 |
| Not exercised | Own-message (ink) bubbles as a signed-in member — guest messages are never "mine" (unchanged identity rule) |
| Note | Three `[test]` guest messages were sent to the local dev socket (in-memory, last 5 kept, cleared on API restart) |

### Live chat follow-up: own messages on the right, close on outside click (approved 2026-10-09)

- **Cause (own messages on the left):** the chat socket sends the JWT in its URL once, when the app first loads (`reconnect: false`). Logging in on `/account/join` does not reload the page, so the socket stayed a Guest connection: the server attached no member to the messages, they never matched `userVar._id`, and other people saw them as "Guest". Guests' own messages could never match either.
- **Fix:** `apollo/client.ts` exports `reconnectChatSocket()` (closes the current chat socket, opens a new `LoggingWebSocket` with the current token → `socketVar`); `libs/auth` `logIn` / `signUp` call it after storing the token (no GraphQL subscriptions use this socket). `Chat.tsx` also remembers texts sent from this tab and marks their echo as mine, so a Guest's own messages are on the right too; "mine" = sent from this tab, or `memberData._id === userVar._id` (signed in on any device). Mine never group with another Guest; unread ignores own messages.
- **Outside click:** while open, a `pointerdown` anywhere outside the widget closes it (inside the window or on the launcher does not; SweetAlert popups opened by the chat do not count as outside). Escape and the X still close.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Browser (guest) sends two messages, another device sends one | Browser: own two on the right ("You", grouped), other device's on the left ("Guest") |
| Pointer down inside the window | Stays open |
| Pointer down on the page | Closes |
| Launcher | Still toggles open / closed |
| Not exercised | Signed-in reconnect after log in (no credentials in this session) |

## SweetAlert restyle (gameverse-next, approved plan 2026-10-09)

- **Single entry point:** every popup goes through `libs/sweetAlert.ts` (no other file imports `sweetalert2`), so the 87 call sites are untouched. All exports keep their names, parameters and results; `sweetConfirmAlert` / `sweetLoginConfirmAlert` still resolve `true` only on `isConfirmed`.
- **How:** a private `GvSwal = Swal.mixin({ buttonsStyling: false, customClass: {...}, showClass, hideClass })` replaces `Swal.fire` in every export; `iconHtml` square glyph chips (✓ ! ? i) replace the round animated icons; button colors removed (CSS owns them); explicit Confirm / Cancel labels ("Login" kept). The toast is `GvSwal.mixin({ toast: true, ... })` with the same timer and `enable_forward` reload.
- **Styles:** new `scss/pc/common/gvAlert.scss`, imported in `scss/pc/main.scss` after the homepage partial (global for desktop, mobile and admin). Paper plate with the cartridge notch and ink border, uppercase Archivo title, square chips (success Signal, error red, question Ultraviolet), mono buttons (Cancel outline first, Confirm solid ink with the cut, Signal fill on focus), stacked full-width under 480px; ink toast with a Signal progress bar (column gap only: Swal's toast grid spans the icon over 99 rows); scale-in / fade-out motion, fade only with reduced motion; Swal z-index 1060 kept.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| All exports present (module loaded from the dev bundle) | 11 / 11 |
| `sweetConfirmAlert`: Confirm / real Enter / Cancel / Escape / backdrop | true / true / false / false / false |
| `sweetLoginConfirmAlert`: "Login" | true |
| Error, error handling, centered success, toast | Styled; toast 340×56 top-end, auto-dismisses |
| 390 mobile UA | Popup 16px from both edges, buttons stacked, no overflow |

## Homepage intro "Press Start" (gameverse-next, approved plan 2026-10-09)

- **Reference:** `design-references/reference1.mov` (3.5s: letter-by-letter headline with a colour-flicker trail, side labels, twinkling sparkles, flood of growing circles into the site). Adapted to the design system instead of copied: Void stage, Archivo 850 `PRESS / START / GAMEVERSE`, flicker in Signal / UV / Haze / paper, mono `PLAYER 1` · `READY`, Signal ■ and Haze + sparks, cut-corner (`gv-cut`) UV → Signal plates instead of circles.
- **Timing (~3.8s):** typing 0–1.6s (70ms per letter, 3-letter flicker trail settling to paper), labels 0.8s, sparks 1.3–2.4s, flood 2.5–3.3s, stage lifts `yPercent -100` 3.3–3.8s while the hero's existing load reveal starts (hand-over at 3.42s). Any key or press skips (seek to the flood, `timeScale 2.6`, ~0.5s). Reduced motion: static headline 0.8s, 0.3s fade. 6s fail-safe removes the overlay; scroll locked on `<html>` while it plays.
- **Once per session:** `introGate.ts` (`gv-intro-seen` in sessionStorage, written at the hand-over, so a reload mid-intro replays it). `_document.tsx` adds a pre-paint script + inline rule (`html[data-gv-intro=skip] .gv-intro:not(.is-playing)`) so repeat loads and client-side returns to `/` never flash the overlay.
- **Hero:** `HomeHero` sets its words/rules hidden and runs the same reveal tweens via `onIntroDone` (immediately when there is no intro). Scroll timeline and marquee unchanged.
- **Files:** new `libs/components/homepage/{HomeIntro.tsx,introGate.ts}`, new `scss/pc/homepage/homeIntro.scss` (imported in `scss/pc/main.scss`), `libs/components/layout/LayoutHome.tsx` (both branches), `libs/components/homepage/HomeHero.tsx`, `pages/_document.tsx`, `docs/GAMEVERSE_DESIGN_SYSTEM.md` (Intro row).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Headless Chrome 1440 (CDP), frames 0.3–4.3s | Typing 12 → 19 letters, labels, sparks, plate flood, lift into hero; hero word held at `yPercent 110` during the intro, 0 after; overlay removed; scroll restored; key stored |
| Reload in the same tab | Overlay `display:none` from the first sample, hero reveal plays immediately |
| Escape at 0.8s | Overlay gone 0.55s later |
| Reduced motion (emulated) | Static headline, removed ~1.1s |
| 390 mobile UA | `scrollWidth` 390; labels stacked above/below the headline without overlap |
| Not exercised | Real Archivo rendering in headless (Google Fonts fell back to Poppins, same as the hero) |

## Site cursor (gameverse-next, 2026-10-09)

- **Reference:** `design-references/reference2.mov` (6.8s): native pointer hidden; a small white dot on the pointer and a ~32px thin white ring that eases after it (~70–80px behind on fast moves, centred at rest); a soft pink trail from the page's fluid background that fades when the pointer stops; no hover change.
- **Gameverse version (`libs/components/common/GvCursor.tsx`, mounted once in `pages/_app.tsx`):** 6px square dot + 36px cut-corner ring (SVG, the cartridge notch) easing at 0.16/frame (frame-rate independent), UV radial afterglow at 0.07/frame that fades ~0.7s after rest (replaces the fluid trail). White with `mix-blend-mode: difference`: dark on paper, light on void, lime on UV. One rAF loop that sleeps when settled; positions via `translate3d` on refs (no React renders).
- **States:** clickables (`a`, `button`, ARIA button/tab/menuitem/option/checkbox/radio/switch, `label`, `summary`, `.MuiButtonBase-root`, `[data-cursor="hover"]`) → ring scales 1.55 and fills (inverts what's under it), dot hides; press → 0.8 (1.3 on clickables); text inputs / textarea / contenteditable → custom cursor hidden, native I-beam; leaving the window or entering an iframe → hidden until the next move.
- **Scope:** only with `(hover: hover) and (pointer: fine)` (re-checked live); touch keeps the system behaviour. Reduced motion: ring follows instantly, no glow. `cursor: none` is applied through `html.gv-cursor-on` only while active. z-index 2147483000+ (above SweetAlert and MUI modals).
- **Files:** new `libs/components/common/GvCursor.tsx`, new `scss/pc/common/gvCursor.scss` (imported in `scss/pc/main.scss`), `pages/_app.tsx`, `docs/GAMEVERSE_DESIGN_SYSTEM.md` (Cursor row).

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Headless Chrome 1440 (CDP mouse events) | Hidden until the first move; 400px jump: ring 58% there after 60ms, settled ~400ms; afterglow visible while moving |
| Hover (logo link, join button) / press | Ring fills and inverts the logo; `gv-cursor-down` on press |
| Text input (`/account/join`) | Custom cursor opacity 0, native `text` cursor |
| Void hero / UV games hero / white paper | Readable on all three (light, lime, dark) |
| Reduced motion | Ring = pointer every frame, glow off |
| Touch emulation (coarse pointer) | Not enabled; native cursor untouched |
| Not exercised | Real trackpad feel, Safari / Firefox |

## One responsive site — phones (gameverse-next, approved plan 2026-10-09)

- **Problem:** in Chrome's iPhone view the homepage was a thin strip on the left, with the avatar far away at the right edge. Fixed desktop widths (`#pc-wrap .container` 1300px, header `.router-box` 617px / `.user-box` 270px, footer 1300px) made the page wider than the screen, so the browser zoomed out to fit it. `useDeviceDetect` checks only once, when the page mounts, so turning on device mode kept the desktop version. After a reload, phones got the leftover Nestar mobile version instead: plain text links, "HEADER FILTER MOBILE" / "EVENT CARD"-style stubs, and no chat.
- **One layout:** `LayoutHome`, `LayoutCatalog`, `LayoutBasic`, `LayoutFull`, `Top`, `Footer`, `pages/index.tsx` and the homepage `Events`, `CommunityBoards`, `CommunityCard`, `HeaderFilter` no longer branch on `device`. Every device renders `#pc-wrap` (with Chat). `useDeviceDetect` is kept for pages not yet migrated. `TrendGames` / `TopAgents` still use it only for their `is-compact` class.
- **Fluid shell:** `#pc-wrap .container` and `#footer .footer-container` are `min(1300px, 100% − 2 × clamp(16px, 4vw, 40px))`. Header nav and user box are `auto` / flex. Below 900px the header is 64px (nav and language hidden, menu button shown), and the footer stacks (left column auto height, wrapping link columns, column bottom line). Below 480px the Login button moves into the drawer.
- **Menu drawer (`Top.tsx`, `scss/pc/common/gvNavDrawer.scss`):** MUI `Drawer` from the right: Void panel, numbered display links (My Page when signed in, active page in Signal, `aria-current`), language buttons using the same `langChoice`, cut-corner Login / Register or ghost Logout (`logOut()`). Closes on the X, Escape, backdrop and any route change. The menu button has `aria-expanded` / `aria-controls`.
- **Docs:** "Small screens" row in `docs/GAMEVERSE_DESIGN_SYSTEM.md`.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Passed |
| Headless Chrome, iPhone UA, after a real load: `/` at 430 and 390 | `scrollWidth` = viewport. Header, hero, filter, all chapters, footer and credits fit; rails scroll inside themselves |
| iPhone UA 390: `/game`, `/developer`, `/community`, `/cs`, `/account/join`, `/about` | No horizontal overflow |
| Desktop 820: `/`, `/game`, `/cs`, `/account/join` | No overflow (the earlier 960/805 overflow from the header is gone) |
| Desktop 1440 | Homepage header and hero unchanged |
| Drawer | Opens (`aria-expanded` true), Home marked active, Games link → `/game` and the drawer closes, Escape closes |
| Not exercised | Signed-in drawer (Logout), language switch from the drawer, real devices / Safari |

**Follow-ups (one page at a time):** `pages/member`, `pages/about`, `MemberMenu`, `MemberGames`, `MemberArticles`, `common/GameBigCard`, `common/CommunityCard` still render their old mobile markup on phones, now inside the new header and footer.

## Mobile homepage (gameverse-next, approved plan 2026-10-10)

- **Audit (before):** 360 / 390 / 430px iPhone UA + 844×390 landscape. 360px scrolled sideways by 8px (the indented "COMMUNITY." line, which also widened the fixed header). Leaderboard spotlight and the Developers readout never changed on touch (scroll-scene / hover only). Hero showed no headline or art on the first screen. Developers 1,549px and Events 2,038px tall. Tap targets 15–36px, mono text 11px, WebGL shelf running on phones. Page 10,337px at 390 (13,327px landscape).
- **Approach:** new `scss/pc/homepage/homeMobile.scss` (imported after `homepage.scss`). Every rule sits behind `max-width: 899px`, phone landscape (`max-width: 932px and max-height: 520px`) or `hover: none`, so desktop rules are untouched. Markup changes are additive; no queries, mutations, routes or data changed.
- **Chapters:**
  - Hero: headline first, then cover plate, then copy and CTAs, then a 2×2 console with a full-width Search bar; menus open downward over the banner. Landscape: two columns. Cover ticks are tappable, and the 5s timer restarts on every change and pauses off screen.
  - Banner: the 3D shelf becomes a CSS strip of the same tiles on narrow / touch screens (`HomeShelf.tsx`, `next/dynamic`, so three.js loads only where it shows).
  - Trending: square covers, like counter as a tab on the cover, "Swipe" indicator.
  - Collection: one-time deal-in; the count ticks up on appear.
  - Leaderboard: compact spotlight and list on about one screen; rank + thumbnail button picks the spotlight (`useMediaQuery`, so desktop markup is unchanged); one-time cover assemble.
  - Developers: centre-snapping portrait rail selects the developer.
  - Comms: date moved into the meta line; one-time tilt settle.
  - Events: swipe rail with arrows.
- **Shell:** 44px touch targets (menu button, Login, logo link, likes, row titles, board headings, footer links and input). Mono text ≥ 12px. Hover resets and press states under `hover: none`. Chat launcher is icon-only in phone landscape and has no sticky hover. The advanced-search modal is a fluid, scrollable sheet on phones.
- **GSAP:** `MOBILE_MOTION_QUERY` in `homeMotion.ts`: short, unpinned, unscrubbed tweens with `once: true`. `ScrollTrigger.config({ ignoreMobileResize: true })`. The credits loop pauses off screen. Removed the dead `useDeviceDetect` `is-compact` classes from `TrendGames` / `TopAgents`.
- **Files:** new `scss/pc/homepage/homeMobile.scss`, `libs/components/homepage/HomeShelf.tsx`. Changed `scss/pc/main.scss` (import, 44px header controls), `scss/pc/chat/gvChat.scss`, `libs/components/layout/LayoutHome.tsx`, `homepage/{HomeHero,TrendGames,PopularGames,TopGames,TopAgents,CommunityBoards,Events,HomeCredits}.tsx`, `homepage/homeMotion.ts`, `docs/GAMEVERSE_DESIGN_SYSTEM.md` ("Mobile homepage" section).

| Check | Result |
| --- | --- |
| `yarn tsc --noEmit` | Passed after every phase |
| Desktop 1440×900 and 1280×800, 19 scroll positions each, pixel diff against two pre-change baselines | Page heights identical (18,420 / 20,515px); remaining differences only in frames that also differ between the two baselines (scrub timing, late images, credits marquee) |
| 360 / 390 / 430 / 844×390 | `scrollWidth` = viewport; no tap target under 44px except stretched card links; no text under 12px; no WebGL canvas; no console errors |
| Page length | 390: 10,337 → 8,180px; landscape: 13,327 → 8,486px |
| Touch (CDP touch events, 390) | Tick switches cover; Platform menu opens below and sets "PC"; modal fits 16px from both edges; Swipe bar 14% → 39%; row 4 pick → PUBG spotlight, scrolled clear of the header; centring the 4th portrait selects Miyazaki; Events arrow scrolls 346px |
| Reduced motion | No autoplay, no cover tiles, static count; every tap control still works |
| Intro at 390 | Plays and hands over to the new hero |
| Not exercised | Real iOS Safari / Android Chrome, signed-in likes from the new targets |

**Follow-ups:** the advanced-search modal still uses the legacy Nestar styling (rounded, coral) on every device. The footer label reads "nee live … Support?" on desktop too (copy, not layout). Next page per the plan: Games listing.

## Page scrollbar (gameverse-next, 2026-10-10)

- **Before:** the page scrollbar was hidden everywhere (`scrollbar-width: none`, `body::-webkit-scrollbar { display: none }` in `scss/pc/main.scss`); `scss/app.scss` still carried an unused Nestar grey scrollbar.
- **Now:** `scss/pc/common/gvScrollbar.scss` (imported in `main.scss`), mouse / trackpad devices only. 10px Void track with an Ultraviolet thumb; hover light UV, drag Signal. Firefox gets the standard properties, guarded by `@supports not selector(::-webkit-scrollbar)` so Chrome 121+ keeps the WebKit hover / drag states. `scrollbar-gutter: stable`, MUI / SweetAlert2 body padding cancelled and the locked gutter painted Void. While the intro locks `<html>`, body no longer grows a second bar. Only `html` / `body` scrollbars are styled. The hide rules and the old grey scrollbar were removed. `body { overflow-y: scroll }` kept. No JS, GSAP or layout changes.

| Check (Chrome headless, real scrollbars) | Result |
| --- | --- |
| 1440 and 820: `/`, `/game`, `/developer`, `/community`, `/cs`, `/account/join`, `/about` | 10px bar on every page; no horizontal overflow except `/about` at 820, which already overflowed with hidden scrollbars (legacy image, 851px) |
| Homepage hero scrub, wheel (600px), End key (to max), thumb drag (→ 10,585px, scene scrubbed) | All work |
| Hover / drag | Thumb `#8B78FF` / Signal |
| MUI advanced-search modal, SweetAlert error | Header stays put (logo 65px, Login 1279px); gutter stays Void |
| Intro | Content width 1430px during and after (no jump at hand-over) |
| 390 touch emulation | No custom bar (native overlay), no gutter, touch scroll works |
| `yarn tsc --noEmit` | Passed |
| Not exercised | Safari (remote automation not enabled), Firefox (not installed) |

## About page redesign + About link (gameverse-next, approved plan 2026-10-10)

- **Before:** `/about` was still the Nestar page in `LayoutBasic` (legacy banner). Phones saw `ABOUT PAGE MOBILE`. It had an empty "Our Developers" block, a made-up "Trusted by" logo row (Amazon, AMD, Cisco, Dropcam, Spotify), a fake phone number and a "Learn More" button that did nothing. No link on the site led to it, and it overflowed by 851px at 820.
- **Now (`pages/about/index.tsx`, `withLayoutCatalog`, root `.gv-catalog.gv-about`):** five chapters, all with real data.
  - 00 About (Void, the `/cs` hero atmosphere, `ONE CATALOG. / EVERY PLATFORM.` with the page's only load reveal). Live readout of `getGames` / `getAgents` `metaCounter` totals. CTAs to `/game` and `/developer`.
  - 01 Mission (Paper; Unbounded counts from the enum sizes: 5 platforms, 10 genres, 3 modes; platform chips into `/game`).
  - 02 How it works (Ultraviolet; Players / Developers / Community cut plates. The Developers plate goes to `/mypage?category=addGame` for an AGENT, otherwise `/account/join`).
  - 03 Top developers (Paper; top 5 by `memberRank`, greyscale portraits that colour and lift on hover or focus; hidden when the list is empty).
  - 04 Questions (Signal; links to `/cs?tab=inquiry` and `/cs`).
  - Read-only queries. No mutations, routes or backend changes.
- **Styles:** `scss/pc/about/about.scss` was rewritten as `.gv-about` (the legacy `#pc-wrap .about-page` rules were removed; nothing else used them). It reuses the catalog tokens, `.gv-chapter`, `.gv-cat-hero__*` and the `gv-cut` / `gv-cut-btn` / `gv-sheet-edge` mixins. Breakpoints are 1100 / 900 / 640. Under 640 the portraits become a snap rail. `hover: none` gets press states, and reduced motion turns off transitions and lifts.
- **About link (user's choice):** footer Quick Links replaced six dead labels with real links: About Us → `/about`, FAQs → `/cs?tab=faq`, Notices → `/cs?tab=notice`, Contact Support → `/cs?tab=inquiry`. Terms, Privacy, Pricing and Services were dropped because those pages don't exist. The phone drawer (`Top.tsx`) gets a mono secondary `About Us` link (`.gv-nav-drawer__sublink`), Signal + `aria-current` on `/about`. The desktop header is unchanged. `LayoutBasic`'s unused `/about` banner case was removed.
- **Docs:** About paragraph and drawer note in `docs/GAMEVERSE_DESIGN_SYSTEM.md`.

| Check | Result |
| --- | --- |
| `yarn tsc --noEmit` | Passed after each step |
| Headless Chrome 1440×900, 1280×800, 820 | All chapters render. Readout "10 games · 7 developers" (live DB); 5 portraits link to `/developer/detail?developerId=…`. No overflow (the old 851px overflow at 820 is gone). Display titles clear of the side column |
| iPhone UA 360 / 390 / 430, 844×390 | `scrollWidth` = viewport; no text under 12px; no tap target under 44px; no console errors |
| Reduced motion | Hero headline static (`transform: none`), content visible |
| Footer (`/about`) | About Us / FAQs / Notices / Contact Support hrefs correct |
| Drawer at 390 | `About Us` on `/about`: Signal, `aria-current="page"`, 44px; on `/game`: Haze, not current |
| Not exercised | Backend down (the user's API was left running), signed-in AGENT step link, real devices / Safari |

## Notification system — Phase 1: database + notification service (gameverse, approved 2026-10-10)

Approved scope (defaults accepted): ten real events (likes on games, articles and profiles; comments on games, articles and profiles; follow; new game from a followed developer; game release to members who liked it; inquiry answered; admin removal of a game or article; announcement published), one stored notification per member per event, the existing `ws` gateway for real time, and a frontend bell, dropdown and `/notifications` page. Built in six phases with a review after each.

- **Schema (`schemas/Notification.model.ts`, previously unused; the dev database had no `notifications` collection):** types `LIKE, COMMENT, FOLLOW, NEW_GAME, GAME_RELEASE, INQUIRY_ANSWER, MODERATION, ANNOUNCEMENT`; groups add `INQUIRY, NOTICE`. New optional `inquiryId`, `noticeId`, `commentId`, `readAt`; required internal `dedupeKey`. `authorId` and `receiverId` stay required. Indexes `{receiverId, createdAt:-1}`, `{receiverId, notificationStatus}`, unique `{dedupeKey}` (created in the dev database when the watch server reloaded). Field names used by `scripts/migrate-property-to-game.ts` are unchanged.
- **`NotificationService` (`components/notification/`, registered in `ComponentsModule`, exported; nothing calls it yet):**
  - `notify(event, receiverId)` and `notifyMany(event, receiverIds)` drop the actor and duplicate receivers. They validate the type/group pair and require the group's target ID (GAME → `gameId` …), then upsert with `$setOnInsert` on the dedupe key (`type:group:ref:author:receiver[:extra]`) in unordered `bulkWrite` batches of 500. They return only newly stored notifications and never throw: a failure is logged and an E11000 race keeps the inserted part.
  - Audience helpers: `notifyFollowers` (follows by `followingId`), `notifyGameLikers` (GAME likes), `notifyActiveMembers` (ACTIVE members, cursor in batches).
  - Titles are clipped to 120 characters and descriptions to 200. No links are stored; the frontend builds them from type and IDs.
- **DTO / types:** `libs/dto/notification/notification.ts` (`Notification`, `Notifications`, nullable `authorData`; `dedupeKey` not exposed), `libs/types/notification.ts` (`NotificationEvent`, `StoredNotification`).

| Check | Result |
| --- | --- |
| `notification.service.spec.ts` | 12/12: stored as WAIT on its dedupe key; no self-notification; repeat event not stored twice; `dedupeExtra` allows a deliberate repeat; invalid pair / missing target / blank title / unknown type rejected; fan-out dedupe; batches 500/500/201; database failure returns null, E11000 keeps the partial result; clipping; follower, liker and active-member audiences |
| `npx jest` (all) | 14 suites, 59 tests passed |
| `build:api`, `build:batch` | Compiled |
| `tsc --noEmit` | Only the 2 existing errors in `member.service.spec.ts` (untouched) |
| ESLint (new files) | 0 errors; the service has no warnings |
| Running API (watch reload) | Boots; `getNotices` still answers |

## Notification system — Phase 2: API, authorization, read states (gameverse, 2026-10-10)

- **Operations (`components/notification/notification.resolver.ts`, all `AuthGuard`; the receiver is always `@AuthMember('_id')`, never client input):**
  - `getMyNotifications(input: NotificationsInquiry): Notifications`. `page ≥ 1`, `limit` 1–50; `search.typeList` (≤ 8 `NotificationType`s) and `search.unreadOnly`. Newest first (`createdAt`, `_id`). `dedupeKey` is projected out, and the actor is joined as nullable `authorData`.
  - `getUnreadNotificationCount: Int`, counted from stored WAIT documents (indexed).
  - `markNotificationRead(notificationId: String): Notification`. A malformed ID returns `Bad Request`. The update filters `{_id, receiverId: me, WAIT}`. It is idempotent: an already-read notification returns unchanged with its first `readAt`. Another member's ID is "No data found!" and nothing changes.
  - `markAllNotificationsRead: Int` returns how many were marked.
- **DTO:** `libs/dto/notification/notification.input.ts` (`NotificationsInquiry`, `NotificationsSearch`).
- **Incident during the phase:** the search input was first named `NISearch`, which `notice.input.ts` already uses. Code-first GraphQL refused to build the schema, so the watch server's app exited on reload (3007 down for a few minutes). Renamed to `NotificationsSearch`, and the watch server came back by itself. New guard test `libs/dto/graphql-names.spec.ts` fails on any duplicate `@InputType`/`@ObjectType` class name (verified against the old name).
- **Security finding (existing, not fixed):** the runtime JWT secret is the literal `"undefined"` (see DECISIONS → Known Risks). Live checks below used tokens signed the way the running server does.

| Check | Result |
| --- | --- |
| `notification.read.spec.ts` | 10/10: own-receiver match, sort, skip/limit, dedupe key projected out, author lookup nullable; unread and type filters stay inside the receiver; count filter; mark-one filter, readAt, projection; idempotent re-mark; other member's ID → not found; mark-all filter and count; AuthGuard on all four; malformed ID rejected and receiver taken from the token; `limit` 50 OK, 51 and `page` 0 rejected |
| `npx jest` (all) | 16 suites, 70 tests passed |
| `build:api`, `build:batch` | Compiled |
| `tsc --noEmit` | Only the 2 existing errors in `member.service.spec.ts` |
| ESLint (new files) | 0 errors |
| Live, running API, two members, 2 temporary notifications (removed after; collection back to 0) | Anonymous → "Bearer Token is not provided!"; A lists 2 (with `authorData`), count 2, LIKE filter → [LIKE]; B lists 0; B marking A's notification → "No data found!" and A still has 2 unread; malformed ID → Bad Request; limit 51 → rejected; A mark one → READ with readAt, again → same readAt, count 1; mark all → 1, count 0; `dedupeKey` not in the `Notification` type |

## Security fix: JWT secret (gameverse + gameverse-next, approved 2026-10-10)

- **Problem:** the running API signed and verified tokens with the literal string `"undefined"`. `JwtModule.register` read `process.env.SECRET_TOKEN` when `auth.module.ts` was imported, before `ConfigModule.forRoot()` loaded `.env`. Anyone could forge a token for any member, including admins.
- **Fix:** `components/auth/jwt.config.ts` (`jwtOptionsFactory`) used through `JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService] })`. A missing, blank or `"undefined"` secret stops the API from starting. Expiry is unchanged (30d).
- **Frontend (`apollo/client.ts`):** when a request (other than Login/Signup) returns `UNAUTHENTICATED` while a token is stored, `logOut()` runs once and no error popup is shown. Old tokens, and those of deleted or blocked members, end as a clean guest session.
- **Effect:** everyone signed in before the fix has to log in again.

| Check | Result |
| --- | --- |
| `jwt.config.spec.ts` | 3/3: secret from config; refuses missing, blank or `"undefined"`; a token signed with `"undefined"` is rejected |
| Live API | Token signed with `SECRET_TOKEN` accepted; token signed with `"undefined"` → UNAUTHENTICATED |
| Headless Chrome, stale token, `/mypage` | Token removed within 1.5s, no SweetAlert; then the page's existing guest redirect to `/` |
| `yarn tsc --noEmit` (frontend) | Passed |

## Notification system — Phase 3: real-time delivery (gameverse, 2026-10-10)

- **Gateway (`socket/socket.gateway.ts`, exported by `SocketModule`):** a `memberClients` index (memberId → that member's open connections) is filled on connect from the verified token and emptied on disconnect; guests are not indexed. New `isMemberOnline`, `onlineMembers`, `notifyMember(memberId, payload)`, which sends only to that member's OPEN connections and returns how many got it. Chat (`info`, `getMessages`, `message`) is unchanged.
- **Service:** after `notifyMany` stores notifications, `deliver` sends `{event: 'notification', notification, unread}` to online receivers only. It does one author lookup (nick, image, type) and one grouped unread-count aggregate for all online receivers, and nothing at all if nobody is online or nothing new was stored. The payload has no dedupe fields. `markNotificationRead` (when something changed) and `markAllNotificationsRead` (when the count changed) send `{event: 'notificationCount', unread}` to the member's other tabs. Delivery is best effort: failures are logged, and storage results are returned anyway.
- **Payload contract for the frontend:** `notification` uses the `Notification` GraphQL shape plus `authorData {_id, memberNick, memberImage, memberType}`; `notificationCount` carries only `unread`.

| Check | Result |
| --- | --- |
| `notification.live.spec.ts` | 7/7: payload with author and count to an online receiver; no queries or sends when offline; nothing for a duplicate; one count query for a fan-out, offline skipped; storage survives a delivery failure; count pushed after mark one / mark all; no push when nothing changed or offline |
| `socket.gateway.spec.ts` | 4/4: only that member's tabs (not other members or guests); closed connections forgotten; non-OPEN skipped; chat still reaches everyone |
| `npx jest` (all) | 19 suites, 84 tests passed |
| `build:api`, `build:batch` | Compiled |
| `tsc --noEmit` | Only the 2 existing errors in `member.service.spec.ts` |
| ESLint | New and changed code 0 errors; the gateway's 4 existing errors are unchanged |
| Live, running API, real sockets (A ×2 tabs, B, guest, forged token), 2 temporary notifications (removed) | Mark one → both A tabs `unread 1`; mark all → both `0`; B, guest and forged socket receive nothing; nothing sent when there is nothing to mark; after closing tab 2 only tab 1 receives; chat message still broadcast |
| Not exercised live | The `notification` event itself (no event is wired until Phase 5); covered by the unit tests |

## Notification system — Phase 4: bell, dropdown, Notification Center (gameverse-next, 2026-10-10)

- **Data layer:** `GET_MY_NOTIFICATIONS`, `GET_UNREAD_NOTIFICATION_COUNT` (`apollo/user/query.ts`), `MARK_NOTIFICATION_READ`, `MARK_ALL_NOTIFICATIONS_READ` (`apollo/user/mutation.ts`). Types `libs/types/notification/*`. `libs/enums/notification.enum.ts` extended (existing file; values only added). `liveNotificationVar` in `apollo/store.ts`.
- **`useNotificationFeed` (called once, in `Top`):** count query (skipped for guests), refetched on window focus or the tab becoming visible (the socket does not reconnect on its own). Socket `notification` / `notificationCount` events write the count into the Apollo cache, and a new notification goes into `liveNotificationVar`. It uses `addEventListener('message')`, so the Chat widget's `onmessage` is untouched, and the listener is removed on unmount or socket change.
- **`NotificationBell`:** replaces the static, non-working `NotificationsOutlinedIcon`. Signed-in only, left of the avatar, and outside `.lan-box`, so it stays on phones.
  - Dropdown (≥900px): latest 8 (`network-only` when opened), Mark all read, footer link, loading / error / empty states. Escape, outside click and route change close it.
  - Opening an entry marks it read (count refetched) and follows its link.
  - Below 900px the bell is a link to `/notifications`.
- **`NotificationItem` + `notificationMeta.ts`:**
  - Wording, glyph and tone per type.
  - Links are built only from type plus validated 24-hex IDs. Game → `/game/detail?id=`, article → `/community/detail?id=` (the page takes its category from the article), profile events → `/member?memberId=<actor>`, inquiry → `/cs?tab=inquiry`, announcement → `/cs?tab=notice`, moderation → `/mypage?category=myGames|myArticles`.
  - A deleted actor reads "A deleted account". A profile event's title is hidden when it repeats the actor.
- **`/notifications` (`LayoutCatalog`):**
  - Filters live in the URL (`?category=&unread=1`, shallow).
  - 20 per page with Load more (deduplicated).
  - Live arrivals for the current category go on top.
  - Mark one / mark all update the list in place (and drop rows under Unread only). The title shows `(n)`.
  - Guest gate, loading placeholder rows, error with Try again, empty copy per filter.
- **Drawer:** "Notifications" with a Signal count (signed-in) above About Us. New `Notifications` locale key (en / kr / ru).
- **Styles:** `scss/pc/common/gvNotifications.scss` (bell, portal dropdown, shared rows), `scss/pc/notifications/notifications.scss` (page); both imported in `scss/pc/main.scss`. Design system doc: new "Notifications" section and drawer note.

| Check | Result |
| --- | --- |
| `yarn tsc --noEmit` | Passed |
| Headless Chrome 1440, signed-in member, 11 temporary notifications of all 8 types (removed after; collection back to 0) | Old icon gone; bell "Notifications, 8 unread" / badge 8; dropdown 8 rows, first "Leo liked your game" → `/game/detail?id=…`; Escape closes; opening an entry navigates and the badge goes 8 → 7 |
| `/notifications` 1440 | Title "(7) Notifications"; readout "7 unread · 11 notifications"; 6 day groups; 7 Mark read buttons; Activity tab → `?category=activity` and only Like / Comment / Follower; Unread only → 2 rows, all unread; Mark read → row leaves, badge 6; Mark all → 0 unread rows, badge gone, "All caught up", button disabled |
| Live, other tab (GraphQL from outside the browser) | Mark one → badge 3 → 2; mark all → badge gone, readout "All caught up", title without count |
| Bell in other layouts (home, member, about, game detail) | Same 44px position, badge correct, no overflow |
| 390 iPhone UA | `scrollWidth` 390; bell is a link to `/notifications`; no text under 12px; no tap target under 44px; tabs swipe; drawer "Notifications 9+" active on the page |
| Guest | No bell; gate "Sign in to see your notifications" |
| Console errors | None |
| Not exercised | A live `notification` arrival (nothing creates one until Phase 5), ESLint (the frontend has no ESLint config), Safari / real devices |

## Notification system — Phase 5: real events wired (gameverse, 2026-10-10)

- **Wired (each module imports `NotificationModule`; `NotificationService` imports no domain module, so there are no cycles):**
  - `GameService`: like (owner, only when the like is added), `createGame` → followers (background), UPCOMING → ACTIVE in `updateGame` / `updateGameByAdmin` → likers (background, `announceRelease`), admin DELETE → owner (`MODERATION`, `dedupeExtra` = deletion time). `updateGameByAdmin(input, adminId?)`; the resolver passes `@AuthMember('_id')`.
  - `BoardArticleService`: like → author; admin DELETE (not a restore) → author (`MODERATION`). `updateBoardArticleByAdmin(input, adminId?)`; the resolver passes the admin it already received.
  - `MemberService`: profile like → that member (title = liker's nick, self-likes skipped). `FollowService.subscribe` → followed member (title = follower's nick).
  - `CommentService.createComment`: game / article / profile owner. The owner comes from the counter update's returned document (no extra query), and the comment text becomes `notificationDesc`. A missing target sends nothing.
  - `InquiryService.answerInquiry` → asker (`dedupeExtra` = `answeredAt`, so each re-answer is new).
  - `NoticeService`: `createNotice` ACTIVE NOTICE, or `updateNotice` that turns a notice into a public NOTICE (reads the previous status and category first) → every active member, in the background. Later edits to a live notice stay quiet.
- **Safety:** single notifications are awaited but `notify` never throws; fan-outs use `void`. New `NotificationService.memberNick` never throws. Tests prove that likes, game creation, inquiry answers and notice publishing succeed with the notification database down.
- **Tests:** `notification.events.spec.ts` (19). Shared stub `notification/notification.testing.ts`. Existing game / board-article / inquiry / notice specs now pass the stub (arity only; prettier re-wrapped one block in `inquiry.service.spec.ts`).

| Check | Result |
| --- | --- |
| `notification.events.spec.ts` | 19/19: game like / unlike / database down; new game → followers, creates even if the lookup fails; release by owner and by admin; no release on other edits; admin removal signed by the admin, nothing on restore or a repeat delete; article like and admin removal / restore; comment on game / article / profile with excerpt; missing target; profile like with name, not on unlike or self; follow; inquiry answer with `dedupeExtra`, answer survives database down; announcement on publish only (not draft or FAQ), on draft → ACTIVE and FAQ → NOTICE, not on edit; notice saves with database down |
| `npx jest` (all) | 20 suites, 103 tests passed |
| `build:api`, `build:batch` | Compiled |
| `tsc --noEmit` | Only the 2 existing errors in `member.service.spec.ts` |
| ESLint, changed files vs `HEAD` | No file has more errors than before (several have fewer) |
| Live, running API, real mutations and sockets (developer Leo, player David, Admin) | Like Genshin Impact → Leo gets LIKE; unlike + like → nothing new; self-like → nothing; profile like → LIKE/MEMBER; follow → FOLLOW; unfollow + follow → nothing new; comment → COMMENT with the text; inquiry answered → David gets INQUIRY_ANSWER; temporary UPCOMING game → David (follower) gets NEW_GAME; set ACTIVE after David's like → GAME_RELEASE; admin delete → Leo gets MODERATION; notice draft → nothing; published → both get ANNOUNCEMENT, 12 stored = active members minus the admin; edit → nothing. Unread counts in the payloads increased one by one |
| Cleanup after the live run | Like / follow state, comment, inquiry, game, notice and 22 notifications (including NEW_GAME copies to Leo's other followers) removed; snapshot of counters, likes, follows and collection sizes identical before and after |

## Notification system — Phase 6: verification (gameverse + gameverse-next, 2026-10-10)

- **End to end in the browser (David signed in, Leo acting through the API; reverted afterwards):** Leo likes David's profile → the open Notification Center shows "Leo liked your profile" (unread, on top) within ~0.5s, badge 1, title "(1) Notifications", the bell rings. Five client-side navigations later there is still exactly one socket `message` listener (instrumented `WebSocket.prototype`). With the dropdown open, Leo follows David → the list refreshes to "Leo started following you" above the like, "2 unread". Opening it goes to `/member?memberId=<Leo>` and the badge drops to 1. Chat send still works (own message rendered, no popups). Shown count = stored WAIT count = API count (1).
  - A first run left the follow entry on `/game` and showed a chat "not connected" popup: Next.js dev compiled `/member` on demand and reloaded. With pages compiled the same run passes; a direct repro of the click navigates within 0.5s.
- **Fixes from this phase:**
  - `socket.gateway.ts`: a connection that closes while its token is still being checked is no longer registered (previously its disconnect ran first, so it stayed in `clientsAuthMap` and the new per-member index, making `isMemberOnline` falsely true). The counter stays balanced. New test.
  - `Notification.model.ts`: list index is now `{receiverId, createdAt:-1, _id:-1}` to match the sort (explain showed an in-memory sort); the superseded dev index was dropped (collection empty).
  - `/notifications` hero headline capped at `min(17vw, 22vh)` below 900px, so phone landscape shows the headline and readout on the first screen.
- **Security re-run against the current API:** guest → "Bearer Token is not provided!"; member B sees 0 of A's notifications, and marking A's → "No data found!" (A unchanged); malformed ID → Bad Request; limit 51 rejected; forged `"undefined"` token rejected on GraphQL and gets nothing on the socket; socket events reach only the receiver's tabs (not other members or guests); `dedupeKey` not exposed. Schema: `NotificationsInquiry {page, limit, search{typeList, unreadOnly}}`, `markNotificationRead(notificationId)`; no operation takes a recipient.
- **Indexes (explain):** list → `receiverId_1_createdAt_-1__id_-1` (no in-memory sort); unread filter, count, mark all and live grouped count → `receiverId_1_notificationStatus_1`; mark one → `_id_`; dedupe upsert → `dedupeKey_1`; follower fan-out → `followingId_1_followerId_1`. **Open:** game-liker fan-out scans `likes` (no `likeRefId`-first index); proposed in NEXT_STEPS, not changed (touches the Like model).
- **Query cost by design:** a like or comment adds one `bulkWrite`, plus (only if the receiver is online) one author lookup and one grouped count. Profile likes and follows add one nick lookup. Reads are single indexed queries. Fan-outs write in batches of 500 in the background.
- **Frontend regression (headless Chrome):** the whole Phase 4 suite passes again; 360, 390 and 844×390: no overflow, no text under 12px, no tap target under 44px; reduced motion: no headline reveal and no bell animation; guest gate; no console errors.

| Check | Result |
| --- | --- |
| `npx jest` (backend) | 20 suites, 104 tests passed |
| `build:api`, `build:batch` | Compiled |
| `tsc --noEmit` backend / `yarn tsc --noEmit` frontend | Only the 2 existing `member.service.spec.ts` errors / passed |
| ESLint | No changed file has more errors than at `HEAD` |
| Data after all live runs | `notifications` collection 0 documents; counters, likes, follows and collection sizes as before |

### Notification system — summary

Ten real events (likes on games, posts and profiles; comments on games, posts and profiles; follows; new games from followed developers; releases of liked games; support answers; moderation removals; announcements) create stored, per-member notifications with duplicate and self-notification protection. They are delivered live over the existing chat socket to the receiver's open tabs only, and shown in a navbar bell, a dropdown and the `/notifications` Notification Center. Found and fixed along the way: the runtime JWT secret was the literal `"undefined"`, a GraphQL type-name clash that stopped the API, and closed sockets registered after disconnect.

## Cinematic page transitions — GameVerse Portal + Artwork Expansion (gameverse-next, 2026-10-11, awaiting review)

- **Scope (as requested, not global yet):** Home ↔ Games listing ↔ Game detail (`transitionRoutes.ts`). No API, auth, state, route, layout or page-design changes; no new dependencies (GSAP 3.13 already present).
- **Approach:** one `PortalTransition` component in `_app` (persists across pages; renders after mount, so no hydration mismatch).
  - Plain left clicks on links between in-scope routes are intercepted in the capture phase. `preventDefault` makes Next's `Link` skip its own push; the component's `onClick` still runs. The same destination is pushed with its locale at 70% of the cover, and the reveal waits for both the full cover and `routeChangeComplete`.
  - Back/Forward and programmatic navigation are not intercepted: a fast cover starts on `routeChangeStart`.
  - Never intercepted: query-only changes (filters, another game id), out-of-scope routes, modifier or middle clicks, `target`/`download`, `[data-no-transition]`.
  - Newest destination wins during a cover (pending pushes are cancelled through a generation counter).
  - Fail-safes: each cover resolves within 1.2s whatever happens to its timeline; route error → reveal; cancelled route → wait for the newer one; 8s watchdog removes the overlay. The overlay blocks clicks only while active.
- **Artwork Expansion:** the source is the clicked card's `.gv-cat-card__art img` (visible and loaded); the target is the detail hero's first `.gv-gd-hero__plate`. Its image must be loaded (waits ≤ 1.6s), otherwise the art dissolves (phones, where the fan is hidden, slow images, or a redirect mid-flight). Off with reduced motion.
- **Intro:** reaching `/` through the portal calls `markIntroDone()`, so the intro doesn't play right after a portal (decision to review).
- **Files:** new `libs/components/transition/{PortalTransition.tsx,transitionRoutes.ts}`, `scss/pc/common/gvPortal.scss`; changed `pages/_app.tsx` (mount), `scss/pc/main.scss` (import), `docs/GAMEVERSE_DESIGN_SYSTEM.md` ("Page transitions").

| Check (production build on :3011, API URLs from `.env.development` passed through the environment) | Result |
| --- | --- |
| `yarn tsc --noEmit`, `yarn build` | Passed / compiled |
| Listing → detail (art), detail → listing, listing → home (portal), Back (fast portal) | Correct destination every time; URL at ~0.51–0.56s after the click; overlay 1.1–1.3s in total (≈0.85s of animation + the new page's first render); no overlay left; no intro after the portal |
| Query-only (footer "Free Games" on `/game`), out of scope (Games → Developers) | No overlay |
| Rapid: 3 clicks on a card + "Home" during the cover | One route start; ends on `/`; overlay gone after 1.2s |
| Keyboard Enter on "Games" | Covered (portal from the link), lands on `/game`; focus then on body as before; route announcer reads the page title; portal has 0 focusables |
| Home Back scroll memory after a portal round trip | 9873 → 9873 |
| ScrollTrigger after transitions | Home hero scene scrubs after a portal arrival; detail fan parallax runs after the art transition |
| Stalled route / route error / cancelled route (router events emitted in page) | Watchdog frees the screen at ~8s (no click blocking afterwards); error reveals in ~0.9s; cancelled waits, then the watchdog |
| Reduced motion | Fade only, 0.46s in total, no art flight |
| 390 phone | Art (light) 1.09s, drawer → Games light portal 1.03s, no overflow, game title on two lines |
| SweetAlert / chat | Alert above everything (z 1060), portal idle; chat opens |
| Console errors | None |
| Not exercised | Real devices / Safari; very slow networks (only the watchdog path was simulated) |
| Note | A production build needs `REACT_APP_API_*` in its environment (they are only in `.env.development`); not changed |

## White screen before the homepage intro (gameverse-next, 2026-10-11)

- **Cause:** on a fresh visit the page was fully white for ~1.6s (≈0.5–2.1s) before PRESS START. In `next dev`, Next hides `<body>` (`style[data-next-hide-fouc]`) until its JS-injected CSS is ready; `<html>` had no background, so the browser's white canvas showed. The white body background comes from MUI `CssBaseline` (also JS).
- **Fix:**
  - `pages/_document.tsx`: inline `html{background:#000}` first in `<head>`, so the canvas is black from the first byte.
  - `scss/app.scss`: `html{background-color:#fff}` once the stylesheet applies (pages look exactly as before), but `html:has(style[data-next-hide-fouc])` stays black while dev still hides the body.
  - The scrollbar's dialog-lock rule (Void gutter) is unchanged and still wins.

| Check | Result |
| --- | --- |
| Dev, fresh uncached visit to `/`, screencast (3 runs) | Before: white frames at 542 / 1175ms. After: no white frame; black → PRESS START |
| After load: `/`, `/game`, `/about`, `/member`, `/account/join`, `/notifications` | `html` and `body` `rgb(255,255,255)`, as before |
| Dialog lock (`body` overflow hidden) | `html` turns Void (unchanged) |
| Production, `/` / `/game` / `/about`, normal and throttled | Homepage dark from the first frame; other pages styled from the first frame; no white or black flash |
| `yarn tsc --noEmit` | Passed |

### Transition redesign: GameVerse Shutter replaces the Portal (gameverse-next, 2026-10-11, awaiting review)

- **Feedback:** Home ↔ Games "feels like it crashed". Likely causes: a UV plate with a black hole popping out of the click point; a static black screen with a giant word; the GSAP timeline stalling while the new page rendered; and on Back the new page appeared before the cover, then was covered and revealed again.
- **New design (same architecture, interception, fail-safes and Artwork Expansion):** five Void slats (three on phones) with a UV leading edge and the cartridge notch sweep up one after another and continue upward to reveal the page (cover 0.44s, reveal 0.5s, 36ms stagger). A small HUD (`■ GAMEVERSE`, destination, running Signal line) fades in only if loading takes longer than a moment. The slats are CSS transitions on `transform` driven by classes (`is-covering` → `is-revealing`, `is-resetting` to rest), so they run on the compositor and don't freeze during the page render. Back/Forward and programmatic navigation: the closed shutter fades in over 70ms (before the swap), then sweeps away downward for Back/Forward (`popstate` sets the direction). Reduced motion: the slats fade.
- **Files:** `libs/components/transition/PortalTransition.tsx` (portal cover/reveal replaced by `coverShutter` / `revealShutter`, `revealAny` for errors), `scss/pc/common/gvPortal.scss` (slats, HUD, instant close, reduced motion; old plates and frame removed), design system "Page transitions".

| Check (production build) | Result |
| --- | --- |
| Screencast Home → Games / Back to Home | Continuous sweep in → short HUD hold → sweep out; longest gap between painted frames 59 / 66ms; Back no longer shows the homepage before the cover |
| Flows | Listing → detail (art) 1.30s, detail → listing 1.29s, listing → home 1.34s, Back 0.65s; query-only and out-of-scope: no overlay; no intro after the transition |
| Edge | Rapid clicks → one route, ends on `/`; keyboard OK; Home Back scroll 9873 → 9873; reduced motion 0.49s; phone art 1.10s, drawer → Games 1.20s, no overflow |
| Fail-safes | Stalled route freed at ~8s; error reveals in 0.57s; cancelled waits, then the watchdog |
| Coordination | Home hero scene scrubs; detail parallax runs; focus as before; 0 focusables; SweetAlert above, portal idle; chat opens |
| `yarn tsc --noEmit`, `yarn build` | Passed; no console errors |
- **Follow-up (2026-10-11):** larger transition HUD on request. Destination word `clamp(3.5rem, 7vw, 7.5rem)` (was `clamp(1.75rem, 3.2vw, 3rem)`; 101px at 1440, 62px at 390), kicker 15px (13px on phones), Signal loading line 3px × `clamp(220px, 22vw, 360px)`. Checked at 1440 and 390: no overflow, no console errors.

## Shutter transitions on every public page (gameverse-next, approved 2026-10-11)

- **Scope:** `transitionRoutes.ts` now allows every public page and excludes only the admin panel (`/_admin`, both directions). Still never: query-only changes (filters, tabs, another id), shallow routes, modified clicks, `target`/`download`, `[data-no-transition]`.
- **Audit before widening:** no `Link` uses `replace`/`shallow`/`legacyBehavior`; every `preventDefault` in public pages is a form submit or an on-page hash jump (never intercepted); the mount-time `router.replace` calls (developer, member, mypage, community) are query-only or shallow, so they are skipped.
- **Labels:** the HUD names the section (Developers, Community, Help, About, My Page, Profile, Notifications, Log in); item pages (`*/detail`, `/member`) use the clicked card's or title link's own text (≤ 60 characters), e.g. the developer's name or the post title.
- **Files:** `libs/components/transition/transitionRoutes.ts` (scope, labels, `isItemPage`), `PortalTransition.tsx` (labels for all item pages), design system doc.

| Check (production build, signed in) | Result |
| --- | --- |
| Tour: Home → Developers → developer detail → Community → post detail → CS → About (footer) → My Page → Notifications (bell dropdown) → Games → game detail (art) → Home (logo) | Every hop covered, correct destination, overlay cleared in 1.32–1.42s; labels "Developers", "Minamino", "Community", the post title, "Help", "About", "My Page", "Notifications", "Games", "Genshin Impact", "Home" |
| Query-only link on `/developer`, link to `/_admin` | No transition |
| Phone drawer → Community / Games, 6 runs (also right after an admin visit) | Covered, cleared in 1.17–1.21s every time; no overflow at 390 |
| Console errors / `yarn tsc --noEmit` | None / passed |
| Note | In the very first tour one phone run kept the overlay past 6s (after an admin redirect and Back steps); it did not reproduce in 7 later runs; the 8s watchdog still bounds it |

## Game page uses the same Shutter + Back direction fix (gameverse-next, 2026-10-11)

- **Request:** Games card → Game detail looked different from every other page (Artwork Expansion). Removed it: the card click now uses the same Shutter, with the game's title in the HUD. `PortalTransition.tsx` was rewritten around the Shutter only (no GSAP timelines, artwork markup or `art` mode); `gvPortal.scss` lost the artwork styles. Long HUD titles wrap to two lines on phones.
- **Bug found and fixed:** Back swept up instead of down. Next starts a Back/Forward route change from its own `popstate` handler, before any listener of ours (even capture phase), so a popstate flag was always late. Direction now comes from Next's history entry keys: a list of keys seen in this tab plus our position; when a route change starts, `history.state` already holds the destination entry, and an earlier known key means Back (down), otherwise up.

| Check (production build) | Result |
| --- | --- |
| Games card → detail | 5 slats, no artwork element, label "Apex Legends", 1.34s; card cover never hidden |
| Directions: click, click, Back, Back, Forward, click | up, up, down, down, up, up |
| Site tour (all public pages, signed in), phone drawer | Every hop covered, correct destination, cleared; no overflow at 390 |
| Edge / fail-safes | Rapid clicks end on `/` with one route start; keyboard OK; Home Back scroll 9873 → 9873; reduced motion 0.48s; stalled route freed at ~8s; error reveals in 0.57s |
| `yarn tsc --noEmit`, `yarn build`, console | Passed; no errors |

## Header language switch redesign (gameverse-next, 2026-10-11)

- **Scope:** design only. `langClick` / `langClose` / `langChoice`, the `lang` state, `localStorage.locale` and the locale route push are unchanged.
- **Trigger:** 44px square hair-bordered button next to the bell/avatar: flag + mono code (`EN` / `KR` / `RU`) + caret; white with black text while open (caret flips), Signal focus outline, press `scale(.96)`.
- **Menu:** MUI `Menu` with a Void panel (no radius or shadow, like the notification dropdown): head `■ LANGUAGE` · count; rows built from the existing `languages` array: mono index `01–03`, flag, uppercase Archivo 800 label, mono code. Current language = `selected` (3px Signal bar, Signal index/code, focus lands on it when opened); keyboard focus = Signal outline.
- **Bug fixed through CSS:** `langChoice` reads `e.target.id`, but the Korean flag image had `id="uz"`, so clicking the flag itself stored `uz`. The images are gone, and the item's children have `pointer-events: none`, so the click target is always the `<li>` with the right id.
- **Files:** `libs/components/Top.tsx` (markup; removed the inline `StyledMenu` and its `alpha`/`styled` imports), new `scss/pc/common/gvLangMenu.scss` (imported in `main.scss`), `main.scss` (old `.btn-lang` / `.img-flag` rules under `.lan-box` removed; `lan-box` margin 28 → 14px). The paper selector is `.MuiPaper-root.MuiPopover-paper.gv-lang-menu` to beat the global `.MuiPaper-root.MuiMenu-paper { padding: 8px }`.

| Check (dev, 1440×900, `/game`) | Result |
| --- | --- |
| Click flag in row → `/kr/game`, `locale=kr`; keyboard ↓ + Enter → `/ru/game`, `ru`; click label → `/game`, `en` | Passed |
| Closed / hover / open / keyboard focus / selected states | Rendered as designed; no console errors |
| `yarn tsc --noEmit` | Passed |

## Production audit — Phase 1 report + Group 1 fixes (gameverse-next, 2026-10-11)

- **Audit:** full report in `gameverse-next/docs/PRODUCTION_AUDIT.md`. Verdict **NOT READY**: 8 critical items. Backend: signup as ADMIN, self-promotion via `updateMember`, plain-text password updates, HTML/SVG uploads. Data safety: `MONGO_DEV` = `MONGO_PROD`. Frontend: open redirect, password in the console. Dependencies: vulnerable `next@14.2.0` and backend packages.
- **Group 1 fixed (frontend only, no API or design change):**
  - **C6:** `pages/account/join.tsx` `safeReferrer()`. After log in or sign up, only same-site paths are followed; anything else goes home.
  - **C7:** `apollo/client.ts` no longer logs every operation (variables included passwords) or every socket frame. GraphQL and network error logs stay.
  - **H10:** `libs/sweetAlert.ts` uses `titleText` instead of `title`, so messages are plain text. Same element and classes, same look.

| Check | Result |
| --- | --- |
| `yarn tsc --noEmit` | Passed |
| `safeReferrer` cases (path, `//`, `/\`, `https:`, `javascript:`, empty, missing, array) | All as expected |
| Injected GraphQL error with `<b>` / `<img onerror>` (Playwright route, no DB access) | Literal text in the GameVerse alert, nothing executed |
| Console on `/game`, `/`, `/developer`, `/community`, `/cs`, `/account/join` | No request/socket logs. Only page error: headless Chrome has no WebGL for the 3D shelf (environment) |

## Production audit — Group 2: frontend stability (gameverse-next, 2026-10-11)

- **H12 `/member` on phones and iPads:** removed the `device === 'mobile'` placeholder branches ("MEMBER PAGE MOBILE" and others) from `pages/member/index.tsx`, `MemberMenu`, `MemberGames`, `MemberArticles` and `common/CommunityCard` (4 lines each, plus the unused hook). The page's fixed 1260px frame forced a 1260px layout viewport on phones, so `memberPage.scss` gained one `max-width: 899px` block: frame full width, menu stacked above the list, follower rows wrap. Desktop rules are unchanged. The page itself is still the legacy (not redesigned) design.
- **H13:**
  - `pages/developer/index.tsx` uses a guarded `parseInput`: a malformed `?input=` falls back to the defaults.
  - New `pages/404.tsx` and `pages/500.tsx`, plus `AppErrorBoundary` in `_app.tsx`. It resets when the path changes and offers "Reload page" and "Back to home".
  - All three share `libs/components/common/GvErrorState.tsx`, which reuses the "Developer not found" state (`.gv-gd-state`, chapter label, `gv-gd-cta`). The only new style is `&__actions` in `gameDetail.scss`.
- **H14:** `Top.tsx` registers the navbar `scroll` listener once in a `useEffect`, with removal on unmount (`passive`). It used to be added on every render and never removed.
- **H17:** `Chat.tsx` ignores non-JSON socket frames, and new messages use a functional `setState` (no in-place push; `messagesList` left the effect dependencies).

| Check | Result |
| --- | --- |
| `yarn tsc --noEmit` | Passed |
| `/member` (iPhone 13), tabs games / followers / followings / articles | No placeholder text; layout width 390 on every tab (was 1260); desktop 1440 unchanged |
| `/developer?input={broken` | List renders with the default input, no errors |
| `/no-such-page`, desktop and phone | GameVerse 404, title "Page not found \| Gameverse", no overflow |
| Window scroll listeners (CDP `getEventListeners`) over 6 client navigations with scrolling | Constant (2) |
| Chat: injected non-JSON frame + 2 messages | No exception; each message shown once |
| Error boundary | Typecheck only; no safe way to force a render error in the real app |

## Production audit — Group 3: indexing, 3D shelf, security headers (gameverse-next, 2026-10-11)

- **H15:**
  - New `public/robots.txt` disallows `/_admin`, `/mypage`, `/notifications` and `/account`, including the `/kr` and `/ru` prefixes.
  - `_document.tsx` no longer sets a site-wide `robots index,follow` (it is the default).
  - `noindex, nofollow` (`key="robots"`) on `LayoutAdmin` (also in its signed-out render, which shows nothing but now emits the tag), `/mypage`, `/notifications` and `/account/join`. The 404, 500 and error states are `noindex`.
- **H16:** `FiberContainer` `<Canvas frameloop="demand">`. The shelf redraws only when the scroll damping calls `invalidate()`.
- **H11, `next.config.js`:**
  - `poweredByHeader: false`.
  - On every route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation and payment off).
  - Production builds only: `Strict-Transport-Security: max-age=15552000` (no `includeSubDomains`) and `Content-Security-Policy-Report-Only`. Its API origins come from the `REACT_APP_*` env vars; it allows Google Fonts and YouTube frames, `frame-ancestors 'none'`, `object-src 'none'`. Switch it to enforcing after watching production reports.
- **New finding C9:** `REACT_APP_*` exist only in `.env.development`, so a production build without them in its environment has no API URL. Hosting must provide them at build time.

| Check | Result |
| --- | --- |
| `yarn tsc --noEmit`, `yarn build` | Passed (built once plain, once with the dev API env loaded) |
| Headers on the production server | All present; no `X-Powered-By` |
| Robots | `robots.txt` served; noindex in the HTML of the private pages and `/kr/mypage`; none on public pages |
| CSP report-only, 9 pages incl. game detail (Chrome) | 0 violations, no page errors |
| 3D shelf (SwiftShader WebGL) | 0 draw calls in 2 s idle, 261 while scrolling; images render |

## Production audit — Group 4: backend critical security C1–C4 (gameverse, approved 2026-10-11)

GraphQL contract unchanged: same operations, fields and types.

- **C1 `signup`:** `memberType: ADMIN` is refused with `NOT_ALLOWED_REQUEST` before anything is created. USER, AGENT and omitted work as before.
- **C2 `updateMember` (self-service):** `memberType`, `memberStatus` and `_id` are dropped from a copy of the input before saving. Only `updateMemberByAdmin` can change role or status. The My Page profile form never sent them (it sends `_id`, nick, phone, address, image).
- **C3:** `memberPassword` in `updateMember` or `updateMemberByAdmin` is hashed with `AuthService.hashPassword`. It was stored in plain text and locked the account out.
- **C4 uploads:**
  - `MemberResolver.saveImage()`, used by `imageUploader` and `imagesUploader`, writes to `uploads/<target>/<uuid>.upload`. It reads the first bytes (`detectImageExtension` in `libs/config.ts`: PNG signature or JPEG `FF D8 FF`), then renames to `<uuid>.png` / `<uuid>.jpg`, or deletes the file and returns `PROVIDE_ALLOWED_FORMAT`.
  - The client's filename extension is no longer used (`getSerialForImage()` takes no argument). The MIME check stays as a first filter.
  - Read-stream errors, e.g. exceeding `maxFileSize`, now reject with `UPLOAD_FAILED` and remove the partial file instead of hanging (audit M7).
  - `main.ts`: `uploadsGuard` (`libs/middleware/uploads.middleware.ts`) in front of `express.static('./uploads')` serves only `.png` / `.jpg` / `.jpeg` (404 otherwise), with `X-Content-Type-Options: nosniff`. All existing upload files were jpg / jpeg / png.
- **Tests:**
  - `member.security.spec.ts`: signup ADMIN refused; USER, AGENT and none allowed; self-update strips role, status and `_id`; password hashed in both update paths and not hashed without a password; PNG/JPEG detection; real temp-directory `saveImage` runs: png and jpg stored, HTML and SVG rejected and removed, stream error fails and cleans up, target allow-list kept.
  - `uploads.middleware.spec.ts` (supertest): images served with nosniff; `.html`, `.svg`, directory and `.upload` return 404.
  - `member.service.spec.ts`: stale typings fixed (6th constructor argument, explicit generic), so repo-wide `tsc` passes again.

| Check | Result |
| --- | --- |
| `tsc -p tsconfig.json --noEmit` (whole repo incl. specs) | Passed |
| `jest` | 22 suites, 125 tests passed |
| `npm run build:api`, `npm run build:batch` | Passed |
| ESLint on changed lines and new files | No new problems besides the repo's existing `no-unsafe-*` pattern for `as any` mocks |
| Live API | Not exercised: the dev DB is production (C5). **Restart the API on :3007 to load the changes** |

## Production audit — Group 5: backend hardening H3, H5, H6 (gameverse, 2026-10-11)

No new dependencies; GraphQL contract unchanged.

- **H3:** `getAgents`, `getAllMembersByAdmin` and `getBoardArticles` search with `new RegExp(escapeRegex(text), 'i')`, like games, notices and inquiries already did. A `@MaxLength` on `search.text` would not run until nested search inputs are validated (audit M2), so the length limit waits for M2.
- **H5 (`app.module.ts`):**
  - `playground` and `introspection` are off when `NODE_ENV=production`. `NODE_ENV` comes from the start command, as in `start:prod`.
  - `validationRules: [queryLimitsRule]` (`libs/security/query-limits.ts`): at most 8 levels deep and 5 top-level fields per operation; aliases count, fragments are followed, introspection fields are exempt.
  - The frontend's 50 operations reach depth 4 and use 1 root field each (measured).
- **H6:**
  - `main.ts` uses `enableCors({ origin: resolveCorsOrigins() })` (`libs/security/http-security.ts`). It takes the origins from `CORS_ORIGINS` (comma-separated). Without it, development allows only `http(s)://localhost|127.0.0.1[:port]`, and production throws, so the API does not listen. It is resolved after `NestFactory.create`, so a value in `.env` is picked up.
  - `x-powered-by` is disabled. The `securityHeaders()` middleware sets nosniff, `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`, plus HSTS in production.
- **Deployment:** set `CORS_ORIGINS` to the production frontend origin(s) in the API environment.
- **Tests:**
  - `query-limits.spec.ts`: frontend-shaped queries pass; depth and fragment depth are rejected; alias floods are rejected and 5 aliases are allowed; introspection is not counted.
  - `http-security.spec.ts`: origin parsing, dev localhost only (`localhost.evil.example` refused), production without the variable throws, headers set, HSTS only in production.
  - `member.security.spec.ts`: regex text is escaped in the member searches.

| Check | Result |
| --- | --- |
| `tsc -p tsconfig.json --noEmit`, `jest` | Passed; 24 suites, 135 tests |
| `build:api`, `build:batch` | Passed |
| Built API on :3017, `NODE_ENV=production` without `CORS_ORIGINS` | Refuses to start with a clear message |
| Same, with `CORS_ORIGINS=https://gv.example` | Allowed origin echoed; `evil.example` gets no CORS headers; headers present, no `X-Powered-By`; Playground 400; introspection refused; `getGames` works; 6 aliased `login`s → validation error, none executed; `getAgents` text `(a+)+$` → literal search, empty result |
| Same, development mode | `localhost:3000` allowed with `authorization`, `content-type` and `apollo-require-preflight`; Playground and introspection work; `/uploads` image 200 `image/png` |
| ESLint on the new files | No problems besides the repo's existing `no-unsafe-*` pattern |

## Production audit — Group 6: personal data exposure H1, H2, H9 (gameverse + gameverse-next, 2026-10-11)

- **Decision (user):** phone and address are private for everyone, players and developers. Only the member themselves and admins see them.
- **H1 (API), `components/member/member-privacy.resolver.ts`:**
  - `@ResolveField` on `Member.memberPhone` / `memberAddress`. It covers every `Member` in the schema, top-level and nested (`memberData`, `authorData`, `followerData`, `followingData`).
  - The viewer is the member the guards put on `req.body.authMember`. Values are returned only when the viewer is that member or an `ADMIN`; otherwise phone is `''` (the field stays `String!`) and address is `null`. Login and signup have no viewer, and the frontend reads only `accessToken` from them.
  - Registered in `MemberModule`. Contract unchanged.
- **H2 (chat), `socket/socket.gateway.ts`:** `toChatMember()` → `{ _id, memberNick, memberImage }` for join, leave and message events and the stored history. Live notifications already projected nick, image and type only.
- **Frontend:**
  - `MemberMenu` renders the phone row only when there is a number.
  - The developer page already hid its contact line when empty.
  - My Page and the admin header read your own data from the token, and the admin users list keeps phone numbers (admin).
- **H9, `libs/components/community/TViewer.tsx`:**
  - The iframe renderer outputs only YouTube / youtube-nocookie `/embed/<11-char id>` URLs (`youtubeEmbedSrc`) with fixed `src`, `title`, `width` and `height`. Everything else is dropped.
  - No existing post had an iframe (8 scanned). The viewer's sanitizer strips `sandbox` / `allow`, so they are not set.
- **Note:** the dev API runs `nest start --watch`, so backend changes, including Groups 4–5, went live on :3007 without a restart.
- **Deployment:** `CORS_ORIGINS=https://gameverse.kr,https://www.gameverse.kr` goes in the production API environment, not the local `.env`. See the checklist in `gameverse-next/docs/PRODUCTION_AUDIT.md`.

| Check | Result |
| --- | --- |
| Backend `tsc`, `jest` | Passed; 25 suites, 144 tests (`member-privacy.spec.ts`: hidden for visitor, signed-out, other player and other developer; shown to self (string or ObjectId id) and to admins; chat member shape) |
| Anonymous GraphQL against the API | 0 members expose phone or address in `getAgents` (7), `getMember`, `getGames.memberData` (10), `getBoardArticles.memberData` (2), `getComments.memberData` (1); schema types unchanged |
| Post with injected iframes (Playwright response interception, no DB write) | Only the YouTube frame rendered; `evil.example` and `javascript:` dropped; `onload` removed; text kept; no script ran |
| `/member` as a visitor | No phone row |
| Frontend `yarn tsc --noEmit` | Passed |

## Production audit — Group 7: safe dependency updates C8 (gameverse-next + gameverse, 2026-10-11)

Rule (user-approved): same-major updates and removal of unused packages only; no major upgrades. Package files were backed up before starting.

- **Frontend (yarn):**
  - `next` 14.2.0 → 14.2.35.
  - Removed `react-scripts`, `react-tree`, `view`, `styled-components`, `babel-plugin-styled-components`, `js-cookie`: zero imports in `pages`, `libs`, `apollo`, `scss` and the configs; no Babel config.
  - Transitive `i18next-fs-backend` 2.2.0 → 2.6.8: lock entry refreshed within `next-i18next`'s `^2.1.5`.
  - `yarn audit` (dependencies): 741 → 109 advisories, critical 39 → 4.
- **Backend (npm):** `npm audit fix` without `--force`. Lockfile only, `package.json` unchanged: `proxy-addr` 2.0.8, `express` 4.22.3, `body-parser`, `qs`, `axios` 1.20, `engine.io`, …; an extraneous `uuid@14` was pruned. `npm audit --omit=dev`: 34 → 29, critical 1 → 0.
- **Not updated (majors):** Next 15, Apollo Server 5, Nest 11, `graphql-upload` 15+, axios 1.x on the frontend, a new `swiper` major, and the Toast UI editor's DOMPurify. Listed with their exposure in `PRODUCTION_AUDIT.md` → "Residual dependency risks".
- **Note:** the dev API on :3007 (`nest start --watch`) loads the new backend packages on its next restart or reload.

| Check | Result |
| --- | --- |
| FE after each step (Next update; react-scripts removal; other removals + i18n) | `tsc` passed; `next build` passed (with the dev API env); browser tour of 13 pages, desktop and iPhone 13: 0 problems (content, errors, overflow); chat opens; security headers present; 5 transitions (header, card → detail, Back, Community, logo) covered and cleared at 0.65–1.47 s |
| FE i18n | `/kr/game` and `/ru/game` render 게임 / 개발자 / 커뮤니티 and Игры / Разработчики / Сообщество |
| BE | `tsc` passed; `jest` 25 suites, 144 tests; `build:api` and `build:batch` passed |
| Built API on :3017 | REST and GraphQL OK; phone still hidden; auth required where expected; CORS `localhost:3000`; images 200; multipart parsed (auth enforced); guest chat round-trip delivered |

## Production audit — Groups 8 and 9: abuse limits and token hygiene (gameverse + gameverse-next, 2026-10-11)

- **H4:** `libs/security/attempt-limiter.ts`: `AttemptLimiter` (in-memory sliding window) and `AuthAttemptService` (provider in `MemberModule`).
  - Limits: login 10 per 15 min per IP + lower-cased nickname, reset on success, plus 50 per 15 min per IP; signup 10 per hour per IP. Over the limit: `Message.TOO_MANY_ATTEMPTS` (HTTP 429 exception); the login form shows the server text.
  - `MemberResolver.signup/login` take `@Context()` for the client IP. `main.ts` sets Express `trust proxy` from `TRUST_PROXY`.
  - Password length policy (5–12) unchanged: changing it changes signup rules.
- **H7:** `libs/security/chat-limits.ts` + `socket.gateway.ts`.
  - `@WebSocketGateway({ maxPayload: 16 KB, verifyClient })`. Browser origins must be in the CORS list; no Origin header is allowed.
  - `acceptChatText`: string, 1–500 chars, never modified, because the frontend matches its own messages by text. `ChatRateLimiter`: 5 per 5 s per connection, forgotten on disconnect. Log text is one line, at most 80 chars.
  - Guests can still post. Frontend chat input has `maxLength={500}`.
- **H8 (partly), `components/auth/jwt.config.ts`:** production refuses `SECRET_TOKEN` shorter than 32 chars (dev warns); `expiresIn` comes from `JWT_EXPIRES_IN`, default `7d` (was 30d). Deferred: slimmer token payload (My Page reads phone/address from it) and the token in the socket URL.

| Check | Result |
| --- | --- |
| Backend `tsc`, `jest` | Passed; 27 suites, 162 tests (attempt limiter + resolver limits, chat limits, JWT strength / lifetime incl. exp − iat = 7 days) |
| Built API on :3017 | 11th login for one nickname → "Too many attempts…", another nickname still answered; socket from `https://evil.example` → 401, from `localhost:3000` → connected; 7 rapid guest messages → 5 delivered, object payload dropped; 20 KB frame → closed 1009; production + current 17-char secret → refuses to start; dev → warning, starts |

## Production audit — Phase 3 final verification (2026-10-11)

- **Verdict: READY WITH WARNINGS.** Full results, the not-verified areas and the deployment settings are in `gameverse-next/docs/PRODUCTION_AUDIT.md` → "Phase 3 — Final verification".
- **Automated:**
  - Frontend: tsc + Next 14.2.35 build passed; `yarn audit` 109 (4 critical).
  - Backend: whole-repo tsc passed, jest 27 / 162, both builds passed; `npm audit` 29 (0 critical).
  - Not run: e2e (shared production DB) and frontend lint (no config).
- **Live:**
  - 13 pages × desktop / phone with 0 problems; 5/5 transitions; phone drawer; language switch; escaped alerts; visitor privacy; 0 CSP violations; robots / noindex; headers.
  - API in production mode (temporary strong secret, `CORS_ORIGINS=https://gameverse.kr`): all probes as intended. With the current short secret it refuses to start.
- **New finding M31:** desktop CLS 0.199 on game detail. The footer under the 720 px loading state is pushed off-screen; a one-line CSS fix is recorded, not applied.
- **Before deploy:** separate DB (C5), a new `SECRET_TOKEN` of 32+ chars, `CORS_ORIGINS` (+ `TRUST_PROXY`), production `REACT_APP_*` at build time (C9).

## M31 fix: layout shift on game detail (gameverse-next, 2026-10-11)

- `scss/pc/game/gameDetail.scss`: `.gv-gd .gv-gd-state` `min-height: max(80vh, 560px)` → `max(100vh, 560px)` + `max(100svh, 560px)` (same pattern as the hero). The loading, not-found and error states, and the 404 / 500 / error-boundary pages that reuse them, now fill the screen, so the footer is no longer pushed down when the data arrives.

| Check (production build, 3 runs each) | Result |
| --- | --- |
| CLS game detail | Desktop 0.199 → 0; phone 0 |
| CLS developer detail / 404 | Desktop 0.061 (good) / 0; phone 0 / 0 |
| `yarn tsc --noEmit`, `next build`, tour 13 pages × desktop / phone | Passed; 0 problems |
