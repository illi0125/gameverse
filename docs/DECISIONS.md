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

## Protected Compatibility Boundaries

The completed rename deliberately treated these as frozen interfaces:

- GraphQL query, mutation, object, input, and enum names.
- Resolver authorization rules.
- Mongoose schemas, indexes, references, and collection names.
- Environment-variable names.
- Cron expressions, job constants, method names, and formulas.
- WebSocket event behavior.

Any future change to these boundaries should be planned as a separate compatibility or data-migration project.

## Known Risks Carried Forward

### Authorization and authentication

- Public signup currently accepts `memberType`, allowing a caller to request a privileged role.
- Normal member updates expose `memberType` and `memberStatus`.
- JWTs contain a broad snapshot of member data and are trusted without rechecking current database status or role until expiry.
- Password changes through the generic member update path are not re-hashed.

### Files and transport

- Upload targets are interpolated into filesystem paths without a strict allowlist or containment check.
- GraphQL Playground and permissive credentialed CORS are enabled without environment-specific restrictions.
- WebSocket tokens use query parameters, and chat lacks persistence, payload validation, and rate limiting.

### Data consistency

- Property lifecycle timestamps are assigned to local variables rather than persisted in the update object.
- Like and View uniqueness excludes the target group, which is unsafe for polymorphic targets.
- Denormalized counters are modified without transactions and can drift after partial failures or concurrency.
- Comment deletion does not reconcile target counters.

### Architecture

- The batch app imports implementation types directly from the API app.
- Notice and Notification schemas are currently orphaned.
- Domain terminology is spread through DTOs, aggregations, indexes, upload folders, and scheduled ranking logic.

These risks are documented rather than silently changed because security hardening and domain redesign require their own tests and rollout plans.

