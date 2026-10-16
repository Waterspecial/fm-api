# FPL Companion: PRD and System Design

Oct 10, 2026 · @Water

## Product overview

An FPL companion that tells managers what to do before each deadline and lets them back their judgement against friends with free credit wagers.

**Problem.** FPL managers juggle fixtures, form, injuries and budget across several sites. Mini-leagues are competitive, but the official game offers little to do with that rivalry beyond a standings table.

**Target users.** Active FPL managers who play in at least one mini-league with friends or colleagues, check their team weekly, and want quick, explained advice rather than raw stats.

**Differentiation.**

| Product | Strength | Gap this app fills |
| --- | --- | --- |
| Official FPL app | Team management, official data | No projections, advice or rivalry features |
| Fantasy Football Manager apps | Mobile team management, widgets, leagues | No AI analysis, projections or wagers |
| Analysis tools (Fantasy Football Hub, Drafthound) | Projections and ratings | No social or wager layer |

**Product principles.**

- Every recommendation comes with a reason a manager can read in ten seconds.
- Projections show uncertainty and never promise points.
- Credits have no cash value, cannot be bought and cannot be cashed out.
- The app never asks for or stores an FPL password on its servers.

## Scope

Version 1 is read-only against FPL: it analyses, recommends and runs credit wagers, and links out to the official app for team changes.

| Area | v1 | Later | Out |
| --- | --- | --- | --- |
| FPL ID verification and squad view | Yes |  |  |
| Projections, team rating, captain and transfer picks | Yes |  |  |
| Player comparison and transfer simulator | Basic | Saved scenarios |  |
| Credits wallet, private and public wagers | Yes | More wager types |  |
| Credits leaderboard and mini-league standings | Yes |  |  |
| AI weekly mini-league recaps |  | Phase 3 |  |
| Notifications |  | Phase 3 |  |
| In-app transfers and lineup changes |  | Phase 4, native only |  |
| Chat assistant, custom cups, forecast accuracy |  | Phase 5 |  |
| Real-money wagers, buying credits, cash prizes |  |  | Yes |

AWS hosting is deferred. v1 deploys as Docker images to a managed platform so the move to AWS later only changes the deploy step.

## Functional requirements

Requirements are grouped by build phase; each phase ships something usable before the next starts.

### Phase 0: Foundations

- FR-01 Users sign up and log in to the app with email or a social provider.
- FR-02 Users link an FPL manager ID and prove ownership by adding a one-time code to their FPL team name; the app checks it through the public endpoint.
- FR-03 Scheduled jobs sync players, teams, fixtures, gameweeks and live points into the database.
- FR-04 A verified user sees their squad, bank, team value, points, rank and next five fixtures.
- Exit: a verified user sees accurate squad data within one minute of linking.

### Phase 1: Analysis core

- FR-10 The system produces expected points per player for the next gameweek and the next three.
- FR-11 Each team gets a pre-deadline rating out of 100 with a breakdown: starting XI, bench, captaincy and fixtures.
- FR-12 The app recommends a captain and vice-captain with expected points and a short reason.
- FR-13 The app suggests the top three transfers within the user's bank and free transfers, including whether a points hit is worth it.
- FR-14 Every recommendation shows a plain-language explanation generated from structured data, never from model memory.
- FR-15 Users compare two to four players side by side and simulate a transfer to see the projected points change.
- FR-16 A "Do this in FPL" button opens the official app or site.
- Exit: five real managers use it before a live deadline.

### Phase 2: Credits and wagers

- FR-20 Each user has a credits wallet with a starting grant and a weekly top-up.
- FR-21 Users create private groups and invite others by link or code.
- FR-22 Users create private wagers inside a group or public wagers on an open board.
- FR-23 Wagers settle automatically from verified FPL data (rules in the next section).
- FR-24 A leaderboard ranks users by credits, overall and per group.
- Exit: a full gameweek of wagers settles with no manual correction.

### Phase 3: Social

- FR-30 Users track public mini-leagues by ID: standings, rank movement, biggest scorers,
- FR-31 The app generates a weekly AI recap per mini-league with optional banter level.
- FR-32 In-app notifications for wager invites, settlements, deadlines and injury news on owned players.

### Phase 4: In-app team management

- FR-40 On the native app only, users log in to FPL on the device; the session token stays in secure storage on the phone.
- FR-41 Users make transfers, set lineup and captain, and play chips; the app confirms success from FPL's response.

### Phase 5: Later

- Chat assistant, custom cups and head-to-head competitions, forecast accuracy tracking, richer wager types.

## Wager rules

Wagers use free credits only, and every stake sits in escrow from acceptance until the gameweek's scores are final.

**Credits (proposed defaults)**

- 1,000 credits on sign-up, plus a weekly top-up of 100 while the balance is under 1,000.
- Credits cannot be bought, sold, gifted or exchanged for anything of value.
- Every movement is a row in an append-only ledger; a balance is the sum of its rows.

**Private vs public**

|  | Private | Public |
| --- | --- | --- |
| Visible to | Members of one group | Every verified user |
| Who can accept | Named manager or any group member | Any verified user |
| Listed in | Group page | Public board, filterable by gameweek and stake |
| Stake limit | Up to 25% of balance | Up to 10% of balance |

**Wager types in v1**

- Head to head: my gameweek score beats yours.
- Over or under: my gameweek score is above a stated line.

&#91;embedded content: wager lifecycle · 6 states\]

Stakes are deducted at creation and acceptance, so nothing is ever owed. Unaccepted wagers close at the deadline and refund automatically.

**Settlement and edge cases**

- Settle only once FPL marks the gameweek's data as final, after bonus points are confirmed.
- A tie refunds both sides.
- Each wager settles exactly once; a unique settlement record per wager makes the job safe to rerun.
- One verified FPL ID per account; the same ID can never be on both sides.
- Results are calculated from a stored snapshot of the gameweek, so a dispute raised within 48 hours can be rechecked.

## Non-functional requirements

The hardest load arrives in the hour before each deadline, so the app reads from its own cache, never live from FPL per request.

| Area | Requirement |
| --- | --- |
| Performance | Squad and recommendation screens load in under 1.5 s at p95; AI explanations are precomputed or cached per player per gameweek |
| Load | Handles a deadline-hour spike of 10x normal traffic without calling FPL per user request |
| Reliability | FPL sync retries with backoff; if FPL is down, the app shows the last synced data with a timestamp |
| Correctness | Ledger balances always equal the sum of ledger rows; settlement is idempotent and covered by integration tests |
| Security | No FPL passwords on the server; secrets in environment variables or a secrets store; role checks on every group and wager action |
| Privacy | UK GDPR basics: privacy policy, data export, account deletion; store only FPL data needed for features |
| Compliance | Credits have no monetary value; no purchase or cash-out path; legal check before any paid feature touches credits |
| AI | Model calls receive structured data and return structured output; responses are validated and fall back to a template if invalid |
| Accessibility | WCAG 2.2 AA colour contrast and screen reader labels on core screens |
| Observability | Error tracking and structured logs from day one; a job dashboard for sync and settlement runs |

## Screens and navigation

Five bottom tabs on mobile (Home, My Team, Players, Wagers, Leagues) with Profile behind the header avatar, and a sidebar on web; design mobile first at 390 px wide, then adapt.

| Tab | Screen | Key content | Phase |
| --- | --- | --- | --- |
| Onboarding | Sign up, link FPL ID, verify code | Step progress, copyable code, "I've updated my team name" check | 0 |
| Home | Deadline briefing | Countdown, team rating with breakdown, captain pick, top transfer, open wagers | 1 |
| My Team | Pitch view | Starting XI and bench, expected points per player, fixture chips, "Do this in FPL" | 1 |
| My Team | Transfer suggestions | Out and in pairs, points gain, cost, hit or no hit, explanation | 1 |
| Players | Search and compare | Filters by position and price, side-by-side stats, fixture strip | 1 |
| Players | Transfer simulator | Pick out and in, budget left, projected points before and after | 1 |
| Wagers | Public board | Open wagers list, filters, accept button with stake | 2 |
| Wagers | Create wager | Type, opponent or public, line, stake slider, summary before confirm | 2 |
| Wagers | My wagers | Tabs for open, live, settled; result and credits change | 2 |
| Leagues | Groups and leaderboard | Credits ranking, mini-league standings, invite link | 2 |
| Leagues | Weekly recap | AI recap card, biggest movers, shareable image | 3 |
| Profile | Account and wallet | Credits balance, ledger history, linked FPL ID, settings | 2 |

**Brief for Claude Design.** A football-native, data-dense but calm look: dark and light themes, one accent colour for recommendations, green and red only for gains and losses. Every recommendation card shows a number, a one-line reason and a single action. Wager screens should feel playful, but always show "credits, no cash value".

## System design

A modular monolith: one API, one worker and one database, all shipped as Docker images from the backend repo.

&#91;embedded content: system architecture · v1 with the phase 4 link dashed\]

The app never calls FPL or the AI directly in v1; the worker fills Postgres and Redis on a schedule, and the API serves from there.

**Key flows**

1. **FPL sync.** A scheduled job pulls bootstrap data and fixtures every few hours, and live points every few minutes during matches. Raw responses are stored as gameweek snapshots, then normalised into tables.
2. **Projections.** After each sync, the worker recalculates expected points per player, then team ratings and recommendations per verified user. Results are cached in Redis by gameweek.
3. **AI explanations.** The worker sends each recommendation's structured inputs to the model and stores the short explanation. If the response fails validation, a template sentence is used instead.
4. **Wager settlement.** When FPL marks a gameweek as final, a settlement job reads the snapshot, writes ledger rows for every wager in one transaction, and marks each wager settled.
5. **Phase 4 changes.** The native app logs in to FPL on the device and sends changes straight to FPL. Your backend only receives a record that a change was made, never the token.

**Why a modular monolith.** One deployable keeps hosting cheap and debugging simple for a solo developer. Clear modules (fpl, projections, wagers, social) let you split a service out later if one needs to scale.

## Data model

Three groups of tables: FPL data the worker owns, user data the API owns, and the credits ledger that only the wager module writes.

**FPL data (written by the worker)**

| Table | Key columns | Notes |
| --- | --- | --- |
| players | id, fpl\_id, team\_id, position, price, status, news | Refreshed each sync |
| teams | id, fpl\_id, name, short\_name, strength | Premier League clubs |
| fixtures | id, gameweek, home\_team\_id, away\_team\_id, kickoff, difficulty, finished |  |
| gameweeks | id, number, deadline, is\_finished, data\_checked | `data_checked` gates settlement |
| gameweek\_snapshots | gameweek\_id, payload (JSON), taken\_at | Raw FPL responses for audit and disputes |
| projections | player\_id, gameweek, expected\_points, low, high, model\_version | Range shows uncertainty |

**User data (written by the API)**

| Table | Key columns | Notes |
| --- | --- | --- |
| users | id, email, display\_name, created\_at |  |
| fpl\_links | user\_id, fpl\_manager\_id, verified\_at, verify\_code | Unique on fpl\_manager\_id |
| recommendations | user\_id, gameweek, type, payload, explanation | Captain, transfer, rating |
| groups | id, name, owner\_id, invite\_code |  |
| group\_members | group\_id, user\_id, role |  |
| tracked\_leagues | user\_id, fpl\_league\_id | Phase 3 |

**Credits and wagers (written by the wager module only)**

| Table | Key columns | Notes |
| --- | --- | --- |
| wagers | id, creator\_id, visibility, group\_id, type, gameweek, line, stake, status, expires\_at | Status follows the lifecycle above |
| wager\_participants | wager\_id, user\_id, side, accepted\_at | Two rows per head-to-head wager |
| ledger\_entries | id, user\_id, amount, reason, wager\_id, created\_at | Append only; positive or negative amounts |
| settlements | wager\_id (unique), winner\_id, snapshot\_id, settled\_at | Unique key makes settlement idempotent |

A user's balance is `SUM(amount)` over their ledger rows; cache it if it gets slow, but never update a balance column directly.

## API surface

REST over HTTPS with JWT auth; every route below except sign-up and login needs a signed-in user.

| Method | Path | Purpose | Phase |
| --- | --- | --- | --- |
| POST | /auth/signup, /auth/login | App account | 0 |
| POST | /fpl-link | Start linking; returns a verify code | 0 |
| POST | /fpl-link/verify | Check the code in the FPL team name | 0 |
| GET | /me/squad | Squad, bank, value, rank, next fixtures | 0 |
| GET | /me/briefing?gw= | Rating, captain pick, top transfers, explanations | 1 |
| GET | /players?position=&maxPrice= | Search players with projections | 1 |
| GET | /players/compare?ids= | Side-by-side stats and fixtures | 1 |
| POST | /simulate/transfer | Projected points before and after | 1 |
| GET | /wallet, /wallet/ledger | Balance and history | 2 |
| POST | /groups, /groups/join | Create or join by invite code | 2 |
| GET | /wagers/public?gw= | Public board | 2 |
| POST | /wagers | Create private or public wager | 2 |
| POST | /wagers/:id/accept, /wagers/:id/cancel | Accept or cancel | 2 |
| GET | /me/wagers?status= | Open, live and settled wagers | 2 |
| GET | /leaderboards?groupId= | Credits ranking | 2 |
| GET | /leagues/:fplLeagueId/recap?gw= | AI weekly recap | 3 |

Accept and create calls take an `Idempotency-Key` header so a double tap never stakes twice. Settlement has no public endpoint; only the worker runs it.

## Tech stack and setup

TypeScript end to end across two repos: the Expo app and the NestJS backend, linked by an OpenAPI contract and deployed through GitHub Actions. AWS and Terraform come later.

| Layer | Choice |
| --- | --- |
| Repos | `fpl-mobile` for the app, `fpl-api` for the API and worker |
| Client | Expo (React Native) with Expo Router, TanStack Query |
| API and worker | NestJS, one codebase with two entry points |
| Database | Postgres with Prisma, migrations in `fpl-api` |
| Jobs and cache | Redis with BullMQ |
| AI | Anthropic API with structured outputs, validated by Zod |
| API contract | OpenAPI spec generated by NestJS; typed client generated in `fpl-mobile` with Orval or openapi-typescript |
| Testing | Jest or Vitest for units, Testcontainers for Postgres integration tests, Maestro or Playwright for end to end |
| Hosting (v1) | Railway for API, worker, Postgres and Redis in one project; images in GitHub Container Registry; web build on Vercel or EAS Hosting |
| Monitoring | Sentry and structured JSON logs |

**Repo layout**

- `fpl-api`
  - `src/modules`: fpl, projections, wagers, social, auth
  - `src/projections`: the expected points model, pure functions with no I/O
  - `src/main.ts` and `src/worker.ts`: the two entry points
  - `openapi.json`: the generated contract, committed on every change
  - `docs/adr`: one short record per big decision
- `fpl-mobile`
  - `app`: Expo Router screens
  - `src/api`: the generated client, never edited by hand
  - `src/components`: shared UI

**Local setup**

1. In `fpl-api`, Docker Compose runs Postgres and Redis.
2. Each repo has a `.env.example` listing every variable; real secrets never enter either repo.
3. A seed script loads one saved FPL snapshot, so you can develop without hitting FPL.
4. In `fpl-mobile`, one command regenerates the API client from the backend's `openapi.json`.

**CI/CD with GitHub Actions**

- **`fpl-api` on every PR:** install with cache, lint, type check, unit tests, integration tests against a Postgres service container, migration check on an empty database, Docker build without push, and a check that `openapi.json` matches the code.
- **`fpl-api` on merge to main:** build and push images to GHCR, run migrations, deploy to staging automatically, then promote the same image to production behind a manual approval in GitHub Environments.
- **`fpl-mobile` on every PR:** lint, type check, unit tests, and a check that the generated client matches the latest published `openapi.json`, so API changes the app hasn't picked up fail fast.
- **`fpl-mobile` on merge to main:** deploy the web build; EAS Build and EAS Update for app store releases come later.
- **Both repos:** branch protection on `main`; later Dependabot, CodeQL scanning and preview deployments per PR.

## Risks, open questions and next steps

The biggest risk is depending on FPL endpoints that are public but undocumented, so the app is built to keep working on stale data.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| FPL changes or rate-limits endpoints | Sync stops | Integration layer in one module, snapshots, last-synced banner |
| Credits drift into gambling territory | Legal exposure | No purchase or cash-out path; legal check before any paid feature |
| Projections are poor | Users lose trust | Show ranges, track accuracy, keep the model swappable |
| Settlement bug | Wrong balances | Ledger, unique settlements, Testcontainers tests on real gameweeks |
| Phase 4 login breaks | Team changes fail | Native only, deep link fallback always available |
| AI cost or bad output | Cost spikes, odd text | Precompute per gameweek, validate output, template fallback |

**Open questions**

- ORM: decided, Prisma.
- Hosting: decided, Railway.
- Starting grant, top-up and stake limits: are the proposed numbers right?
- Is a credits leaderboard enough reason to wager, or do badges or seasons help?

**Next steps**

- [ ] Create the two repos and the first ADR on the repo split and stack
- [ ] Docker Compose for Postgres and Redis, plus the PR workflow in GitHub Actions
- [ ] Save one real FPL snapshot as seed data
- [ ] Design the onboarding, Home and My Team screens in Claude Design
- [ ] Build FPL ID verification and the squad screen (Phase 0)
