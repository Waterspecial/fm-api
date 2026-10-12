# FM-002: Run Postgres and Redis locally with Docker Compose

**Type:** Task    **Phase:** 0 (Foundations)    **Estimate:** S

## Summary
Add a `docker-compose.yml` that starts Postgres and Redis on your machine with one command, plus a `.env.example` that lists the connection settings the app will need.

## Background / Why
Every feature from here on needs a database and a cache:
- **Postgres** stores everything permanent: players, fixtures, users, wagers and the credits ledger. Prisma (FM-003) will connect to it.
- **Redis** holds BullMQ's job queues (FPL sync, projections, settlement) and cached results, like projections per gameweek. See "Planned stack" in `CLAUDE.md`.

We could install Postgres and Redis directly on the Mac, but then every developer ends up with a different version and configuration, and they're hard to reset. Docker Compose runs each one in an isolated **container**, with the exact versions written in a file that's committed to git. Anyone who clones the repo gets the same setup with `docker compose up -d`, and you can wipe it and start fresh in seconds.

This is item 1 under "Local setup" in the PRD.

## Scope (what to do)
1. **Create `docker-compose.yml`** in the repo root with two services:
   - `postgres`
     - Image pinned to a major version: `postgres:17-alpine`.
     - Environment: `POSTGRES_USER=fm`, `POSTGRES_PASSWORD=fm`, `POSTGRES_DB=fm`. These are local-only dev credentials, never used in production.
     - Port `127.0.0.1:5432:5432`, so it's reachable from your Mac but not from other machines on your network.
     - A named volume `pgdata` mounted at `/var/lib/postgresql/data`, so data survives restarts.
     - A healthcheck using `pg_isready`.
   - `redis`
     - Image pinned: `redis:7-alpine`.
     - Port `127.0.0.1:6380:6379`. Mac port 6380 is used because Homebrew Redis already runs on 6379 on this machine. See Technical notes.
     - A healthcheck using `redis-cli ping`.
2. **Create `.env.example`** listing the variables the app will read, with local values:
   ```
   DATABASE_URL=postgresql://fm:fm@localhost:5432/fm
   REDIS_URL=redis://localhost:6380
   ```
   Copy it to `.env` (already gitignored) to use it. Real secrets never go in either file.
3. **Update `CLAUDE.md`'s Commands section** with the Docker commands listed under "How to test".

## Acceptance criteria
- [ ] `docker compose up -d` starts both containers with no errors.
- [ ] `docker compose ps` shows both services as `healthy`.
- [ ] Postgres answers a query (see "How to test").
- [ ] Redis answers `PONG` to a ping.
- [ ] Data survives `docker compose down` followed by `docker compose up -d`.
- [ ] `.env.example` is committed and `.env` is not.
- [ ] `CLAUDE.md` lists the Docker commands.

## Technical notes
- **Image vs container:** an *image* is a packaged, read-only template, like `postgres:17-alpine`. A *container* is a running copy of that image. Compose reads the YAML file and creates the containers for you.
- **Why pin versions:** `postgres:latest` could become a new major version tomorrow and break your data folder. A pinned `17` stays on Postgres 17. We'll check this matches the version Railway gives us in production.
- **`-alpine`:** a variant built on Alpine Linux, which makes the image much smaller and quicker to download.
- **Port mapping `127.0.0.1:5432:5432`:** read it as `your-mac-address:mac-port:container-port`. Binding to `127.0.0.1` keeps the database off your Wi-Fi network.
- **Volumes:** containers are disposable. Without a volume, deleting the container deletes your database too. A named volume (`pgdata`) stores the data outside the container. `docker compose down -v` deletes volumes as well, which is the "wipe everything" reset.
- **Healthchecks:** Compose runs a small command (`pg_isready`, `redis-cli ping`) every few seconds, so you, and later CI, can tell when a service is actually ready, not just started.
- **Port clash (found during the work):** Redis installed with Homebrew was already listening on the Mac's port 6379, and only one program can listen on a port. Rather than stop the Homebrew Redis, we forward the Mac's port 6380 to the container's 6379. Inside the container, Redis still uses its normal port. Check for clashes before starting with `lsof -nP -iTCP:<port> -sTCP:LISTEN`.
- **Why Redis has no volume:** its data here (job queues and cache) can always be rebuilt, so losing it on reset is fine.
- **`.env` vs `.env.example`:** `.env` holds your real values and is never committed. `.env.example` is the committed list of *which* variables exist, so a new developer knows what to fill in.
- **Prerequisite:** OrbStack must be running, because it provides the Docker daemon on this Mac.

## Out of scope
- Connecting the NestJS app to the databases (FM-003, Prisma, and a later ticket for BullMQ).
- The seed script that loads an FPL snapshot.
- The GitHub Actions CI workflow.
- Production databases on Railway.

## How to test
```bash
docker compose up -d                 # start both services in the background
docker compose ps                    # both should show "healthy" after a few seconds
docker compose exec postgres psql -U fm -d fm -c "select version();"   # prints the Postgres version
docker compose exec redis redis-cli ping                               # prints PONG
docker compose logs -f postgres      # follow the logs (Ctrl+C to stop)
docker compose down                  # stop and remove containers (data kept)
docker compose down -v               # stop and ALSO delete the database volume (full reset)
```
