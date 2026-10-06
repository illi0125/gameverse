# Next Engineering Session

## P0 Security and Reliability

| Task | Expected outcome |
| --- | --- |
| Remove `memberType` from public signup and normal member updates | Users cannot self-assign privileged roles |
| Restrict self-service status changes and hash password updates | Member updates cannot bypass account/password controls |
| Minimize JWT claims and recheck current member status/role | Role and block changes take effect predictably |
| Isolate e2e MongoDB state | Tests never use development or production data |
| Run a migration dry run against a sanitized database copy | Manifest, backups, indexes, references, and rollback are rehearsed before production |

## P1 Catalog Follow-up

| Task | Expected outcome |
| --- | --- |
| Add transaction or reconciliation handling around runtime social counters | Likes, views, comments, and counters resist partial failures |
| Add an authenticated GraphQL schema integration harness | Breaking contract changes are captured automatically |
| Add structured Game reviews and ratings | Reserved counters gain an ownership-aware source of truth |
| Add a distinct wishlist model | Favorites/likes no longer have to stand in for wishlist behavior |
| Wire the Notification feature module | The migrated Game notification schema gains API behavior |

## P2 Architecture and Commerce

| Task | Expected outcome |
| --- | --- |
| Extract API/batch shared models and enums into a Nest library | Batch stops importing API implementation files |
| Add inventory, cart, order, and payment domains | Gameverse can support purchasing workflows |
| Decide whether Agent should gain a Seller-facing alias | UI terminology can evolve without changing `MemberType.AGENT` |
| Replace remaining Nest starter README sections | Repository onboarding matches the active Game catalog |

## Required Session Exit Checks

- Focused tests pass.
- API and batch typechecks/builds pass.
- No active runtime Property identifiers return.
- Decisions and completed work are recorded in the AI handoff documents.
