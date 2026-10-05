---
name: backend-migration
description: Continue the Gameverse backend migration from Nestar property concepts to Gameverse product concepts while preserving the existing NestJS architecture.
---

# Gameverse Backend Migration

Use this skill when changing backend code for the Gameverse product migration.

## Workflow

1. Search for affected property/product references before editing.
2. Preserve the resolver/service/module structure already used by `gameverse-api`.
3. Keep DTOs, enums, and schemas in their existing folders.
4. Keep `MemberType.USER | AGENT | ADMIN` unchanged.
5. Use product terminology for catalog behavior and database lookups.
6. Update social modules consistently when product counters, likes, views, comments, or notifications are involved.
7. Update batch logic when product ranking or `memberProducts` affects rank calculations.
8. Update `docs/ai/COMPLETED_TASKS.md` after major completed work.