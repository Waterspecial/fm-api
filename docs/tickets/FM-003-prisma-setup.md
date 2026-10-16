# FM-003: Connect the app to Postgres with Prisma

**Type:** Task    **Phase:** 0 (Foundations)    **Estimate:** M

## Summary
Install Prisma, describe our first table (`teams`) in a schema file, create it in the local Postgres with a migration, and give NestJS a shared `PrismaService` that the modules use to read and write the database.

## Background / Why
FM-002 gave us a running Postgres, but the app can't talk to it yet. The PRD chose **Prisma** as the ORM (an "object-relational mapper"). It lets us:
- describe tables in one file, `prisma/schema.prisma`, instead of writing SQL by hand,
- generate **migrations**: versioned SQL files that create or change tables, committed to git so every database (local, CI, production) ends up identical,
- query with **typed TypeScript**, so `prisma.team.findMany()` returns `Team[]`, and a typo in a column name fails at compile time, not in production.

We start with `teams` (the 20 Premier League clubs) because it's the simplest FPL table in the PRD's data model. The other FPL tables come in FM-007.

## Scope (what to do)
1. **Install packages** (each one explained and approved before installing):
   - `prisma` (dev dependency): the CLI for `migrate`, `generate` and `studio`.
   - `@prisma/client`: the query library the app uses at runtime.
   - `@prisma/adapter-pg` and `pg`: the Postgres driver Prisma uses to connect.
2. **Initialise Prisma** with `npx prisma init`, which creates `prisma/schema.prisma` and a config file. Point it at `DATABASE_URL` from `.env`.
3. **Add the `Team` model** to the schema:
   | Field | Type | Notes |
   | --- | --- | --- |
   | `id` | Int, auto-increment | Our own primary key |
   | `code` | Int, unique | FPL's permanent club code (Arsenal is always 3). Matches clubs across seasons |
   | `fplId` | Int | FPL's id for this season (1–20). Renumbered every season, so not unique |
   | `name` | String | e.g. "Arsenal" |
   | `shortName` | String | e.g. "ARS" |
   | `strengthOverallHome` / `Away` | Int | FPL's overall strength ratings. FPL's single `strength` field is always null |
   | `strengthAttackHome` / `Away` | Int, optional | FPL sometimes sends 0 |
   | `strengthDefenceHome` / `Away` | Int, optional | FPL sometimes sends 0 |
   | `createdAt` / `updatedAt` | DateTime | Set automatically |

   Map it to a snake_case table `teams` (with `@@map` and `@map`), to match the PRD's naming.
4. **Create the first migration** with `npx prisma migrate dev --name init_teams`. This writes the SQL to `prisma/migrations/` and applies it to the local database.
5. **Add a `PrismaModule` and `PrismaService`** in `src/prisma/`:
   - `PrismaService` extends `PrismaClient`, connects when the app starts and disconnects when it stops.
   - `PrismaModule` is marked global, so any module can inject `PrismaService` without importing it each time.
   - Register it in `AppModule`.
6. **Add npm scripts:** `db:migrate` (`prisma migrate dev`), `db:generate` (`prisma generate`) and `db:studio` (`prisma studio`).
7. **Gitignore** the generated client folder if Prisma is configured to output it inside `src/`.
8. **Update `CLAUDE.md`** with the new commands.

## Acceptance criteria
- [ ] `npm run db:migrate` creates the `teams` table in the local Postgres.
- [ ] `prisma/migrations/` contains the `init_teams` migration and it's committed.
- [ ] `npm run db:studio` opens Prisma Studio and shows the empty `teams` table.
- [ ] `npm run start:dev` starts the app and connects to Postgres with no errors.
- [ ] Stopping Postgres (`docker compose down`) makes the app fail to start with a clear connection error, which proves it really connects.
- [ ] `npm run lint`, `npm run build` and `npm test` pass.
- [ ] `CLAUDE.md` lists the database commands.

## Technical notes
- **Schema → migration → client:** you edit `schema.prisma`, `migrate dev` turns the change into SQL and applies it, and `generate` rebuilds the typed client. In Prisma 7, `migrate dev` no longer runs `generate`, so run both after every schema change: `npm run db:migrate`, then `npm run db:generate`.
- **Never edit an applied migration.** To change a table, edit the schema and create a *new* migration. Production applies migrations in order with `prisma migrate deploy` (a later CI ticket).
- **Why our own `id` *and* `fplId`:** FPL's ids are outside our control. Keeping our own primary key means the rest of our schema never depends on them.
- **Prisma version:** use the current major version and follow its NestJS guide. Recent versions need a `prisma.config.ts` file and a driver adapter (`@prisma/adapter-pg`), and they work with our ES-module setup (`"type": "module"`). Check the docs at install time rather than copying older tutorials.
- **Table ownership** (see `CLAUDE.md`): `teams` is FPL data, so later only the worker writes to it. This ticket only creates the table.
- **Prerequisites:** OrbStack running, `docker compose up -d`, and a `.env` copied from `.env.example`.

## Out of scope
- Other FPL tables and the sync job that fills them (FM-007).
- User, wager and ledger tables (later tickets).
- Seed data (FM-006).
- Running migrations in CI or production.
- Integration tests with Testcontainers.

## How to test
```bash
docker compose up -d          # Postgres must be running
npm run db:migrate            # creates the teams table
npm run db:studio             # browse the database in your browser
npm run start:dev             # app starts and connects (Ctrl+C to stop)
npm run lint && npm run build && npm test
```
