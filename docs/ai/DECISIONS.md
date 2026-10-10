# Architectural Decisions

## Decision Log

| Decision | Rationale | Risks | Alternatives considered |
| --- | --- | --- | --- |
| Use **Gameverse** as the canonical product and repository name | It matches the repository, remote, agent instructions, package metadata, and completed application rename | Future rebranding would require another coordinated rename | Retain Nestar; introduce a temporary codename |
| Separate branding migration from business-domain migration | Keeps the first change reviewable and prevents filesystem, GraphQL, database, and product changes from being mixed | The repository temporarily presents Gameverse branding over a real-estate domain | Rename Property to Game in the same change; rebuild the backend from scratch |
| Rename Nest projects and directories to `gameverse-api` and `gameverse-batch` | Removes visible Nestar identifiers from application structure and deployment paths | Internal scripts or deployments using old paths must be updated | Rename only greetings/package metadata; retain old aliases |
| Do not retain `nestar-*` aliases | Produces one canonical project identity and allows residual-identifier checks to be definitive | Consumers of old CLI project names fail immediately | Temporary aliases with a deprecation window |
| Preserve GraphQL contracts during the identity migration | Existing frontend and API consumers remain functional | Real-estate terminology remains visible in the Gameverse API | Immediate breaking schema rename; parallel versioned API |
| Preserve MongoDB models and collections | Avoids data migration and rollback risk during a branding change | Collection and field names remain domain-inappropriate | Rename collections immediately; dual-read/dual-write migration |
| Preserve Property and Agent terminology temporarily | These names affect GraphQL, DTOs, database fields, aggregations, counters, and batch logic | Continued coupling can make later migration harder | Mechanical renaming, which would create an invalid Game model; immediate domain redesign |
| Keep `gameverse-api` as the default Nest project | Preserves existing `npm run build`, `start`, and development semantics | Developers may overlook the batch build | Build all apps by default; require explicit project selection everywhere |
| Preserve all batch schedules and calculations | Scheduled behavior was outside the branding scope | Existing ranking semantics remain real-estate-specific | Disable jobs; rename jobs; redesign rankings immediately |
| Adjust batch cross-app import paths without extracting a library | Minimum change needed to keep both applications compiling | API and batch remain tightly coupled by relative imports | Create a shared Nest library during the rename; duplicate schemas |
| Change only the two REST welcome strings at runtime | Makes the visible runtime identity consistent while limiting behavior changes | Tests and consumers asserting the exact old text must update | Keep old strings; introduce versioned health endpoints |
| Repair stale e2e typings/imports as test-only work | Repository-wide typechecking otherwise failed independently of business logic | Small test diff extends beyond pure string replacement | Exclude tests from typechecking; defer repairs |
| Declare lint config imports as direct dev dependencies | Makes lint execution reproducible rather than relying on transitive packages | Adds dependency-lockfile changes to the rename | Rewrite the ESLint configuration; continue relying on transitive dependencies |
| Lint only content-changed TypeScript files | Validates the rename without generating a repository-wide formatting diff | Existing legacy lint debt remains | Format the entire repository; only verify ESLint starts |
| Treat frontend mappings as provisional | No Next.js frontend source is available in this workspace | Proposed paths may not match the actual frontend | Invent exact paths; defer all frontend documentation |
| Replace Property with Game as a breaking contract | The approved migration explicitly rejects aliases and dual reads | Existing Property clients must migrate before deployment | Parallel Property/Game APIs; compatibility adapters |
| Preserve `MemberType.AGENT` as Game owner | Existing authorization and ownership behavior remains usable | Seller terminology remains provisional | Rename or add a Seller member type |
| Use an enrichment manifest for legacy documents | Real-estate metadata cannot safely infer platforms, genres, modes, publishers, or developers | Production cutover depends on a complete reviewed manifest | Discard data; create placeholder Game metadata |
| Generate immutable unique Game slugs | Stable URLs should survive title edits | Slug corrections require a later administrative workflow | Client-supplied or title-synchronized slugs |
| Derive `isUpcoming` from `GameStatus.UPCOMING` | Avoids duplicate persisted lifecycle state | Release date and status can intentionally differ | Persist and synchronize a separate boolean |
| Keep generic Game comments separate from reviews | Structured ratings/reviews need a later ownership-aware model | Game has both comment and reserved review counters | Treat legacy comments as reviews; remove Game comments |
| Persist Game popularity rank | Existing batch sorting remains efficient | Rank is eventually consistent with social counters | Calculate at query time; feature only by admin flag |
| Include target group in Like/View identity | Polymorphic ObjectIds can collide across collections | Requires index migration and duplicate preflight | Preserve unsafe two-field uniqueness |
| Backfill and temporarily guard `memberGames` | Legacy member documents can omit the new non-null GraphQL field before the full catalog migration | Missing values temporarily appear as zero until backfilled | Make the GraphQL field nullable; require the full catalog migration immediately |
| Revalidate JWT members against MongoDB | Stale JWT snapshots allowed a missing member to create an orphan Game and could retain outdated roles | Protected requests add one member lookup and existing tokens for removed/blocked accounts stop working | Trust JWT claims until expiry; validate only Game creation |
| Keep Game owner projections nullable while enforcing ownership on writes | MongoDB does not enforce cross-collection references, so a later member removal must not make a valid public Game unreadable | Public responses can expose `memberData: null` for inconsistent legacy data | Fail the whole Game read; remove orphan Games from catalog lists |
| Call the AGENT role "Developer" in the frontend only; show `gameDeveloper` as "Studio" | Visitors see a games term instead of the Nestar real-estate one, while `MemberType.AGENT`, `getAgents`/`getAgentGames`, JWT claims, DB values and batch ranking stay unchanged (no migration, reversible) | UI and API vocabularies differ; a listing member is not necessarily the game's studio, so the studio field had to be relabelled to avoid two different "Developers" on one page | Keep "Agent"; Curator; full backend rename with member migration |
| Board article reads keep a deleted author as `memberData: null` | A deleted (or missing) author made `getBoardArticle` throw "No data found!", so every post by that member became unreadable and the frontend showed a global alert; Game reads already follow this rule | Posts by deleted accounts stay public with an anonymous byline ("Deleted account") | Hide such posts; restore accounts; keep throwing |
| Reuse the orphaned Notice schema for notices + FAQ, and give 1:1 inquiries their own collection | Notices and FAQ entries share one shape (title, body, status, author); inquiries have an owner, a reply and a workflow that would overload Notice | Two support collections instead of one | One collection for everything; three separate modules |
| Seed the former hardcoded CS content instead of discarding it | The public CS page must not go empty when it switches to the API | Seed data must be maintained in `scripts/data/cs-content.ts` until it is edited in the admin | Start empty; keep frontend fallbacks |
| Store notifications per member, deliver live over the existing chat `ws` gateway | Offline members lose nothing; no new dependency (Socket.IO) and no second connection; per-member index keeps delivery targeted | Delivery is best effort and the socket does not reconnect by itself, so the frontend also refetches the count | Socket.IO; GraphQL subscriptions; polling only |
| One notification per member per event (fan-out on write, `dedupeKey` unique) | Simple per-member read state and pagination; repeats (unlike/like, unfollow/follow) never notify twice | Announcements write one document per active member | Shared announcement record + per-member read marker |

## Current Compatibility Boundaries

The Game migration intentionally preserves these interfaces:

- `MemberType.USER | AGENT | ADMIN` and Agent ownership authorization.
- Shared member, follow, board article, auth, and socket operation names.
- Resolver authorization rules.
- Existing environment-variable names.
- Cron expressions and execution times.
- WebSocket event behavior.

Property GraphQL/Mongoose contracts are no longer protected; they were replaced by the approved Game contract.

## Known Risks Carried Forward

### Authorization and authentication

- Public signup currently accepts `memberType`, allowing a caller to request a privileged role.
- Normal member updates expose `memberType` and `memberStatus`.
- JWTs still contain a broad snapshot of member data, although authorization now reloads the current active member and role from MongoDB.
- Password changes through the generic member update path are not re-hashed.

- **JWT secret was the literal string `"undefined"` at runtime (found and fixed 2026-10-10).** `AuthModule` read `process.env.SECRET_TOKEN` when the file was imported, before `ConfigModule.forRoot()` had loaded `.env`, so forged tokens were accepted. Now `JwtModule.registerAsync` + `ConfigService` (`components/auth/jwt.config.ts`), and the API refuses to start without a real secret. Tokens issued before the fix stop working; the frontend signs such a session out quietly (`apollo/client.ts`, `UNAUTHENTICATED` with a stored token).

### Files and transport

- GraphQL Playground and permissive credentialed CORS are enabled without environment-specific restrictions.
- WebSocket tokens use query parameters, and chat lacks persistence, payload validation, and rate limiting.

### Data consistency

- Denormalized counters are modified without transactions and can drift after partial failures or concurrency.

### Architecture

- The batch app imports implementation types directly from the API app.
- Migration and rollback still require coordinated API/batch deployment and a maintenance window.

These risks are documented rather than silently changed because security hardening and domain redesign require their own tests and rollout plans.
