# FM-005: Run lint, build and tests on every PR with GitHub Actions

**Type:** Task    **Phase:** 0 (Foundations)    **Estimate:** S

## Summary
Add a GitHub Actions workflow that runs on every pull request (and every push to `main`). It installs the project, checks formatting and lint, builds, runs the unit tests, applies our migrations to an empty Postgres, and runs the e2e tests against it. A PR shows a green tick or a red cross, so broken code is caught before it's merged.

## Background / Why
Right now, checking a change depends on remembering to run five commands locally, on the right Node version, with Postgres up. We've already been caught by this: the e2e test only failed when someone happened to run it, and the shell was on Node 22 twice.

**CI** ("continuous integration") runs the same checks automatically, on a clean machine, every time. It catches:
- code that only works on your laptop (because of a leftover file or a local setting),
- a forgotten `npm run format` or lint warning,
- a migration that doesn't apply cleanly to an empty database, which is exactly what production does.

The PRD ("CI/CD with GitHub Actions") lists the full PR pipeline. This ticket builds the parts we can run today. The rest is added by the tickets that create the things it checks (see Out of scope).

## Scope (what to do)
1. **Add a `format:check` script** to `package.json`: `prettier --check "src/**/*.ts" "test/**/*.ts"`. Unlike `format`, it only reports and never changes files, which is what CI needs.
2. **Create `.github/workflows/ci.yml`:**
   - **Triggers:** `pull_request` (any branch) and `push` to `main`.
   - **One job, `check`,** on `ubuntu-latest`.
   - **A Postgres service container:** `postgres:17-alpine`, user, password and database all `fm` (the same as `docker-compose.yml`), port `5432`, and a `pg_isready` health check so the job waits until it's ready.
   - **Job environment variables:**
     ```
     NODE_ENV=test
     DATABASE_URL=postgresql://fm:fm@localhost:5432/fm
     REDIS_URL=redis://localhost:6379
     ```
     `REDIS_URL` only needs to pass validation (FM-004). Nothing connects to Redis yet, so no Redis container.
   - **Steps, in order:**
     1. Check out the code.
     2. Set up Node from `.nvmrc`, with npm's download cache turned on.
     3. `npm ci`
     4. `npx prisma generate` (the client is gitignored, so CI must build it)
     5. `npm run format:check`
     6. `npm run lint -- --deny-warnings` (in CI, a warning fails the build)
     7. `npm run build`
     8. `npm test`
     9. `npx prisma migrate deploy` (applies every migration to the empty CI database)
     10. `npm run test:e2e`
3. **Open this ticket's PR and check the workflow runs green** on GitHub (the "Checks" tab).
4. **Turn on branch protection for `main`** in GitHub (Settings → Branches → add rule): require a pull request and require the `check` job to pass before merging. This is a setting on GitHub, not a file, so the project owner does it in the browser.
5. **Update `CLAUDE.md`:** add `npm run format:check`, and a line saying CI runs on every PR and what it checks.

## Acceptance criteria
- [x] `.github/workflows/ci.yml` exists and runs on this ticket's PR.
- [x] The run is green, and every step listed above appears in the log.
- [x] A deliberately broken commit turns it red (for example, a lint warning or a failing test). Revert it afterwards.
- [x] `prisma migrate deploy` applies `init_teams` to the empty CI database.
- [x] The e2e test passes in CI against the Postgres service container.
- [x] `main` is protected: merging needs a PR and a passing `check`.
- [x] `npm run format:check` exists and passes locally.
- [x] `CLAUDE.md` mentions CI and `format:check`.

## Technical notes
- **Workflow, job, step:** a *workflow* is one YAML file. It has *jobs*, which run on a fresh virtual machine (a "runner") each time. A job is a list of *steps*, run in order. If any step fails, the job stops and goes red.
- **`npm ci` vs `npm install`:** `npm ci` installs exactly what `package-lock.json` says, and fails if it doesn't match `package.json`. It never changes the lock file, so CI tests exactly what's committed.
- **Service containers:** GitHub starts the Postgres container next to the job, like our `docker-compose.yml` does locally. The job reaches it on `localhost:5432`.
- **`migrate deploy` vs `migrate dev`:** `dev` is for your machine. It creates new migrations and can reset the database. `deploy` only applies migrations that already exist, never creates or resets anything, and is what production will run. Using it in CI proves the committed migrations work from scratch.
- **Why `prisma generate` before `build`:** the generated client in `src/generated/prisma` is gitignored, so it doesn't exist on a fresh checkout. Without it, the build fails on the `PrismaService` import.
- **Caching:** `actions/setup-node` with `cache: npm` saves npm's download folder between runs, which makes `npm ci` much faster after the first run.
- **Action versions:** pin each action to its current major version (for example `actions/checkout@v5`). Check the latest at write time rather than copying old examples.
- **Node version:** read from `.nvmrc` (`node-version-file: .nvmrc`), so CI and your laptop can't drift apart.
- **No secrets needed:** everything in this workflow uses throwaway local values. Real secrets come with the deploy ticket.

## Out of scope
- Building the Docker image (needs a Dockerfile, in the deploy ticket).
- Checking `openapi.json` matches the code (comes with the first API endpoints and Swagger setup).
- Testcontainers integration tests (come with the first module that has real database logic).
- Deploying on merge to `main`, GHCR and Railway (a later ticket).
- Dependabot, CodeQL and preview deployments.

## How to test
```bash
npm run format:check          # passes locally
git push                      # open the PR, then watch GitHub → the PR → "Checks"
```
On GitHub:
1. The `CI / check` run goes green, and each step shows in the log.
2. Push a commit with a lint warning (for example, an unused variable). The run goes red at the lint step. Revert it, and it goes green again.
3. After merging, try to push straight to `main`. GitHub refuses it.
