# FM-001: Repo cleanup after the NestJS scaffold

**Type:** Task    **Phase:** 0 (Foundations)    **Estimate:** S

## Summary
Bring `CLAUDE.md` in line with the NestJS scaffold we've already committed, record the PRD's open questions so they aren't lost, and stop committing a build cache file.

## Background / Why
Commit `7e62b2e` scaffolded the NestJS project, but `CLAUDE.md` still says "No code has been written yet" and tells readers not to invent commands. Anyone reading it (a teammate, or Claude in a later session) would get the wrong picture of the repo.

Reading the PRD alongside the scaffold also turned up some gaps that will block Phase 0 work if nobody writes them down (see Scope, step 3).

Separately, `tsconfig.build.tsbuildinfo` was committed by accident. TypeScript writes this file to speed up rebuilds. It changes on every build, so it creates noisy diffs and merge conflicts and should never be in git.

## Scope (what to do)
1. **Update the Status section of `CLAUDE.md`.**
   - Replace "No code has been written yet" with a short description of the current state: a NestJS scaffold with no feature modules yet.
   - List the real commands from `package.json`:
     - `npm run start:dev`: run the API with auto-reload
     - `npm run build`: compile TypeScript into `dist/`
     - `npm run lint`: lint with oxlint
     - `npm test`: unit tests (Vitest, `*.spec.ts`)
     - `npm run test:e2e`: end-to-end tests (`test/*.e2e-spec.ts`)
     - `npm run format`: format with Prettier
   - Note that the Node version is pinned to 24 in `.nvmrc` (run `nvm use`).
2. **Fix the Planned stack section.** Change "Jest or Vitest" to "Vitest", since that decision is already made.
3. **Add an "Open questions" section to `CLAUDE.md`** covering the following:
   - FPL ID verification (FR-02) and the "squad within 1 minute" requirement (FR-04) both need an FPL call, but the API must never call FPL per request. Proposed answer: the API queues a BullMQ job, the worker calls FPL, and the client polls for the result.
   - The data model has no tables for a manager's picks, bank and rank, their gameweek points, or idempotency keys. `users` has no auth columns.
   - Auth approach: our own JWT and password hashing, or a hosted provider? This needs an ADR.
   - The 6 wager lifecycle states aren't written down. The diagram didn't export from the PRD.
   - `settlements.winner_id` must be nullable so a tie can refund both sides.
4. **Add a "Working conventions" section to `CLAUDE.md`.** It says that every feature gets a ticket in `docs/tickets/FM-XXX-short-name.md`, written before any code, using this ticket's template.
5. **Stop tracking the build cache.**
   - Add `*.tsbuildinfo` to `.gitignore`.
   - Run `git rm --cached tsconfig.build.tsbuildinfo`. This removes the file from git's tracking but leaves it on disk.

## Acceptance criteria
- [ ] `CLAUDE.md` no longer says no code exists, and it lists the real commands.
- [ ] `CLAUDE.md` says Vitest, not "Jest or Vitest".
- [ ] `CLAUDE.md` has an "Open questions" section with the five items above.
- [ ] `CLAUDE.md` describes the ticket convention.
- [ ] `.gitignore` contains `*.tsbuildinfo`.
- [ ] After `npm run build`, `git status` doesn't show `tsconfig.build.tsbuildinfo`.
- [ ] `npm run lint`, `npm run build` and `npm test` still pass.

## Technical notes
- **What `CLAUDE.md` is for:** it's the onboarding doc for the repo. Claude Code reads it at the start of every session, so out-of-date instructions there cause wrong behaviour later. Keep it short and true.
- **What `.gitignore` does:** it tells git which files never to start tracking. It does **not** untrack a file that's already committed. That's why step 5 also needs `git rm --cached`.
- **`git rm --cached` vs `git rm`:** `--cached` removes the file only from git's index (the staging area) and leaves your local copy alone. Plain `git rm` would delete the file from disk too.
- **Why `*.tsbuildinfo` exists:** `tsconfig.json` sets `"incremental": true`. TypeScript then stores build info so the next compile only rebuilds what changed.

## Out of scope
- Answering the open questions. Each answer becomes its own ADR in `docs/adr/` later.
- Editing the PRD.
- Rewriting the boilerplate `README.md`. That's a later ticket, once there's something real to describe.

## How to test
```bash
npm run lint      # should report no errors
npm run build     # should compile into dist/
npm test          # the scaffold's sample test should pass
git status        # tsconfig.build.tsbuildinfo should not show up as modified
```
