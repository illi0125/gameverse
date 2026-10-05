# Next Engineering Session

Tasks are ordered by risk reduction and dependency. Priorities are relative to the next engineering session rather than calendar deadlines.

## Backend Cleanup

| Priority | Task | Prerequisite | Expected outcome |
| --- | --- | --- | --- |
| P0 | Remove `memberType` from public signup and normal member updates | Add authorization regression tests | Users cannot self-assign `ADMIN` or other privileged roles |
| P0 | Restrict normal member status changes and hash password updates | Define allowed self-service fields | Member updates cannot bypass account or password security |
| P0 | Replace broad/stale JWT payload authorization with minimal claims and current-member checks | Decide token revocation/session policy | Role and block-status changes take effect predictably |
| P0 | Constrain upload targets to an allowlist and enforce resolved-path containment | Inventory valid upload categories | Authenticated users cannot write outside approved upload directories |
| P1 | Correct Property sold/deleted timestamp persistence | Add lifecycle service tests | Status transitions store the intended timestamps |
| P1 | Include target group in Like/View uniqueness and queries | Plan index migration for existing data | Polymorphic interactions cannot collide across entity types |
| P1 | Make denormalized counter updates transactional or reconcilable | Confirm MongoDB transaction support | Likes, follows, comments, and counters resist partial failure |
| P2 | Extract shared schemas/types used by API and batch into a Nest library | Stabilize current builds and import graph | Batch no longer imports implementation files from the API app |
| P2 | Design the Game catalog domain | Product decisions for platform, edition, inventory, seller, and pricing | Approved Game schema and GraphQL contract ready for implementation |

## Frontend Migration

| Priority | Task | Prerequisite | Expected outcome |
| --- | --- | --- | --- |
| P0 | Obtain the Next.js repository and record router/version/tooling | Frontend workspace access | Verified inventory replaces provisional assumptions |
| P0 | Inventory routes, components, GraphQL documents, generated types, and environment variables | Frontend repository available | Authoritative Nestar → Gameverse mapping |
| P1 | Apply branding-only changes | Inventory complete | Gameverse presentation with unchanged backend operations |
| P1 | Add a GraphQL data-access and UI-model adapter layer | Identify current client/codegen stack | Property data can drive temporary Gameverse UI safely |
| P2 | Migrate catalog/detail, wishlist/recent, seller, and admin vertical slices | Game backend contract approved | Incremental feature migration with rollback points |
| P2 | Remove old routes and terminology | All consumers migrated and redirects defined | No residual Nestar real-estate UI contract |

## Testing

| Priority | Task | Prerequisite | Expected outcome |
| --- | --- | --- | --- |
| P0 | Repair default Jest discovery | Choose unit/e2e naming conventions | `npm test` discovers intentional tests instead of exiting with zero tests |
| P0 | Isolate e2e MongoDB state | Select test database/container strategy | Repeatable tests never use development or production data |
| P0 | Add authorization regression coverage | Security rules agreed | Signup/update/JWT privilege defects cannot regress |
| P1 | Add service tests for Property lifecycle and counters | Test model strategy available | Existing bugs are captured before refactoring |
| P1 | Snapshot or diff the generated GraphQL contract | Stable schema-generation test harness | Breaking API changes are explicit in review |
| P1 | Run API and batch builds in CI | CI provider selected | Both Nest applications are validated on every change |
| P2 | Add frontend route, adapter, and GraphQL document tests | Frontend inventory and migration underway | UI migration remains compatible through each phase |

## Documentation

| Priority | Task | Prerequisite | Expected outcome |
| --- | --- | --- | --- |
| P1 | Replace remaining Nest starter README sections | Confirm supported local/deployment workflow | Repository onboarding reflects Gameverse rather than the framework template |
| P1 | Document environment setup without committing secrets | Confirm development/test variable requirements | Reproducible local startup and test configuration |
| P1 | Maintain current/proposed GraphQL compatibility matrix | Game schema design begins | Backend and frontend coordinate versioned operation changes |
| P2 | Add MongoDB migration and rollback runbook | Data retention strategy selected | Domain migration can be rehearsed and reversed safely |
| P2 | Update this decision log after each approved domain choice | Architecture review cadence established | Decisions remain discoverable and internally consistent |

## Recommended Session Exit Criteria

- P0 authorization behavior is specified and covered by failing regression tests before production code changes.
- Frontend inventory is complete or its absence is recorded as a blocker.
- Both Nest builds and the GraphQL compatibility check pass.
- Decisions made during the session are reflected in `DECISIONS.md`.

