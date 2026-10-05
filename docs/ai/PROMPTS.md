# Reusable Codex Prompts

These prompts are designed for focused follow-up sessions. Replace bracketed placeholders with repository-specific details when necessary.

## 1. Read-Only Backend Migration Analysis

```text
Analyze the current Gameverse NestJS GraphQL monorepo. Do not change any files.

Map:
- Nest applications and module dependencies
- GraphQL queries, mutations, DTOs, enums, and authorization guards
- Mongoose models, collections, references, indexes, and aggregation lookups
- scheduled jobs, WebSocket behavior, uploads, and environment variables
- remaining Nestar real-estate concepts and missing gameshop capabilities

Report migration blockers by severity, identify reusable modules, and provide evidence with file paths. Run only non-mutating validation checks.
```

## 2. Safe Branding Rename Plan

```text
Plan a compatibility-safe rename from [OLD_NAME] to [NEW_NAME].

Rename repository-visible and application-visible identifiers, but do not change:
- business logic
- GraphQL APIs or authorization
- MongoDB model/collection contracts
- environment-variable names
- scheduled-job behavior

Inventory every identifier first. Produce a decision-complete plan with exact paths, compatibility boundaries, residual-name scans, lint, typecheck, and independent builds for every Nest application. Do not implement until the plan is approved.
```

## 3. Narrow Rename Implementation

```text
Implement the approved [OLD_NAME] → [NEW_NAME] rename plan.

Constraints:
- preserve GraphQL and Mongoose domain files byte-for-byte unless explicitly listed
- preserve environment keys and cron expressions
- do not reformat unrelated source
- do not add compatibility aliases unless the plan requires them
- preserve existing user changes

Validate residual identifiers, changed-file scope, targeted lint, repository typecheck, and all Nest builds. Report any baseline defect separately from rename regressions.
```

## 4. Authorization Security Hardening

```text
Audit and harden Gameverse member authentication and authorization.

Focus on:
- public signup role assignment
- normal member update role/status fields
- password update hashing
- JWT payload minimization, current-role validation, blocked/deleted users, and revocation
- GraphQL AuthGuard/RolesGuard/WithoutGuard behavior

First add regression tests that demonstrate each vulnerability. Then implement the smallest compatible fix. Do not rename GraphQL operations or change unrelated domain logic. Run targeted tests, typecheck, lint, and both Nest builds.
```

## 5. Game Catalog Domain Design

```text
Design the first Gameverse Game catalog domain using the current Property implementation only as a behavioral reference, not as a schema to rename mechanically.

Clarify product decisions for:
- game identity and slug/SKU
- platforms, genres, publishers/developers, editions, and release dates
- pricing, discounts, currency, inventory, and availability
- seller ownership and admin moderation
- images/media, likes, wishlist, views, comments/reviews, and ranking

Produce a decision-complete plan covering Mongoose schemas/indexes, GraphQL types/inputs/operations, authorization, data flow, edge cases, tests, and compatibility with the existing Property API. Do not implement until all high-impact product choices are resolved.
```

## 6. GraphQL Compatibility Migration

```text
Plan a versioned GraphQL migration from the existing Property/Agent contract to Game/Seller APIs.

Inventory all current operations, DTOs, enums, fragments, aggregation helpers, and consumers. Define:
- parallel old/new operation period
- field and type mappings
- deprecation policy
- client rollout order
- schema snapshot checks
- removal criteria and rollback

Do not remove or rename an existing operation until every known consumer has migrated. Explicitly identify concepts without a safe one-to-one mapping, such as PropertyLocation, SOLD status, rent, barter, rooms, and beds.
```

## 7. MongoDB Migration Strategy

```text
Design a MongoDB migration strategy for Nestar Property data and the new Gameverse Game catalog.

Determine whether legacy data should be discarded, archived, transformed, or retained alongside new collections. Cover:
- collection and index creation
- idempotent migration scripts
- validation and dry-run reports
- dual-read/dual-write requirements
- referential records in likes, views, comments, notifications, and members
- batch-job transition
- backups, rollback, observability, and acceptance thresholds

Do not mutate data. Produce an executable migration and rollback plan first.
```

## 8. Next.js Frontend Inventory and Migration

```text
Analyze the Nestar Next.js frontend for migration to Gameverse. Do not change files during the initial analysis.

Inventory:
- router mode and all routes/layouts
- Property, Agent, Member, Community, and Admin components
- GraphQL documents, fragments, generated hooks/types, and cache policies
- auth/token handling, uploads, WebSocket integration, environment variables, and assets
- tests, mocks, fixtures, Storybook, and deployment configuration

Replace the provisional mappings in docs/FRONTEND_MIGRATION.md with verified paths. Then produce a phased plan that applies branding first, adds a compatibility adapter, and migrates pages only after corresponding Game APIs exist.
```

## 9. Test-Suite Repair

```text
Repair the Gameverse test infrastructure without changing production behavior.

Goals:
- make npm test discover intentional unit tests
- isolate API and batch e2e tests from development/production MongoDB
- add deterministic setup/teardown
- add GraphQL schema compatibility snapshots
- cover authorization, property lifecycle, counters, and both REST welcome endpoints
- run API and batch builds in CI

Preserve existing API contracts. Explain any test-only refactor, and report coverage gaps that require later product decisions.
```

## 10. Shared Library Extraction

```text
Plan extraction of schemas, DTOs, enums, and shared configuration currently imported by gameverse-batch from gameverse-api.

Create a proper Nest monorepo library boundary without changing runtime behavior, injection tokens, MongoDB models, collections, cron schedules, or GraphQL names. Include dependency direction, path aliases, incremental moves, build configuration, tests, and rollback. Ensure both applications build independently after each step.
```

