# Backlog

Every piece of work gets a ticket here before any code is written (see "Working conventions" in `CLAUDE.md`). Tickets are numbered in build order. Later phases get broken into tickets when we reach them.

**Status:** ✅ Done · 🚧 In progress · 📝 Ticket written · ⬜ Not started

## Phase 0: Foundations
Goal: a verified user sees their real FPL squad within one minute of linking.

| Ticket | What | Status |
| --- | --- | --- |
| [FM-001](FM-001-repo-cleanup.md) | Repo cleanup after the NestJS scaffold | ✅ |
| [FM-002](FM-002-docker-compose-postgres-redis.md) | Docker Compose: Postgres and Redis locally | ✅ |
| [FM-003](FM-003-prisma-setup.md) | Prisma: connect to Postgres, first migration | ✅ |
| FM-004 | Config and env validation: the app refuses to start with a bad `.env` | ⬜ |
| FM-005 | CI: GitHub Actions runs lint, build and tests on every PR | ⬜ |
| FM-006 | Save one real FPL snapshot as seed data | ⬜ |
| FM-007 | `fpl` module: players, teams, fixtures and gameweeks tables, plus a sync job | ⬜ |
| FM-008 | `worker.ts`: second entry point, with BullMQ scheduled jobs | ⬜ |
| FM-009 | Auth: sign up and log in (needs the auth decision first) | ⬜ |
| FM-010 | FPL ID linking and verification with a one-time code | ⬜ |
| FM-011 | `GET /me/squad`: squad, bank, rank, next fixtures | ⬜ |

## Later phases
- **Phase 1, analysis:** projections, team rating, captain picks, transfer suggestions, AI explanations.
- **Phase 2, credits and wagers:** wallet and ledger, groups, wagers, settlement.
- **Phase 3, social:** mini-league recaps, notifications.
