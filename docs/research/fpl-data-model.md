# FPL data model

Researched against the live FPL API on 2026-10-13, during 2026/27 gameweek 6. Agreed on 2026-10-14.

## What FPL gives us

| Endpoint | Gives | Notes |
| --- | --- | --- |
| `bootstrap-static/` | 20 teams, ~670 players, 38 gameweeks | One request covers everything |
| `fixtures/` | 380 fixtures | One request |
| `event/{gw}/live/` | Live points for every player | One request covers all players |
| `entry/{id}/` | A manager's team name, total points, rank, bank, value | Also includes real name and region, which we don't store |
| `entry/{id}/event/{gw}/picks/` | 15 picks, active chip, gameweek summary | Visible only **after** that gameweek's deadline |
| `entry/{id}/history/` | Points and rank per gameweek, past seasons, chips used | |
| `leagues-classic/{id}/standings/` | 50 members per page: entry id, team name, rank, last rank, points | |

FPL quirks that shaped the design:
- **IDs are reused every season.** Team `id` (1–20) and player `id` are renumbered each season. A team's `code` is permanent (Arsenal is always 3).
- **`teams.strength` is null.** Use `strength_overall_home/away`. The attack and defence strengths can be 0, so treat them as optional.
- **`played`, `win`, `points`, `form` on teams are always empty.** Work them out from fixtures if needed.
- **Money is in tenths.** `value: 1016` means £101.6m.
- **Pick `points` don't include hits.** `event_transfers_cost` is separate.
- **Pre-deadline transfers are invisible.** We can only show a squad as of the last deadline.

## Decision: store full team data for app users only (design 4)

We store full team data (picks, gameweek history) **only for app users**. Friends who aren't users appear only as rows in league standings: team name, rank and points. We never fetch or store their squads.

Why: at 100k users, storing every friend's team would mean ~1M managers and ~2.35M FPL requests per gameweek (~65 hours at 10 requests/sec). Storing only users brings that down to ~350k requests, and the PRD never asks to view friends' squads. If that feature is wanted later, the planned approach is to store a non-user's team for one gameweek only and delete it afterwards. The tables already support this.

## Tables

### FPL data (shared, written by the worker)

| Table | Rows | Key columns |
| --- | --- | --- |
| `teams` | 20 | `id`, `code` (unique, permanent), `fpl_id`, `name`, `short_name`, `strength_overall_home/away`, `strength_attack_home/away`, `strength_defence_home/away` (nullable) |
| `gameweeks` | 38 per season | `id`, `season` ("2026/27"), `number`, `deadline`, `is_current`, `is_next`, `finished`, `data_checked`. Unique on (`season`, `number`) |
| `players` | ~670 | `id`, `fpl_id`, `web_name`, `team_id` → teams, `position`, `price`, `status`, `news` |
| `fixtures` | 380 per season | `id`, `fpl_id`, `gameweek_id` → gameweeks, `home_team_id` / `away_team_id` → teams, `kickoff`, `home_difficulty`, `away_difficulty`, `finished` |

### Manager data (app users only)

| Table | Rows | Key columns |
| --- | --- | --- |
| `fpl_managers` | 1 per app user | `id`, `fpl_entry_id` (unique), `team_name`, `total_points`, `overall_rank`, `bank`, `value`, `last_synced_at` |
| `manager_gameweeks` | 1 per manager per gameweek | `manager_id`, `gameweek_id`, `points`, `transfers_cost`, `active_chip`, `bank`, `value`. Unique on (`manager_id`, `gameweek_id`) |
| `manager_picks` | 15 per manager per gameweek | `manager_id`, `gameweek_id`, `player_id` → players, `position` (1–15), `multiplier`, `is_captain`, `is_vice_captain`. Unique on (`manager_id`, `gameweek_id`, `position`) |

`fpl_links` (with auth) connects a user to their verified `fpl_managers` row.

### Leagues (Phase 3)

| Table | Rows | Key columns |
| --- | --- | --- |
| `fpl_leagues` | 1 per tracked league | `id`, `fpl_league_id`, `name` |
| `league_standings` | 1 per member | `league_id`, `fpl_entry_id`, `entry_name`, `rank`, `last_rank`, `total_points`, `gameweek_points` |
| `tracked_leagues` | 1 per user per league | `user_id`, `league_id` |

## Rules

- **Link tables with our own IDs.** FPL IDs are used only to match rows during a sync.
- **Gameweeks carry a `season`**, so history never clashes across seasons.
- **Keep history.** A new gameweek adds rows. Old rows are never overwritten.
- **Store money as whole numbers in tenths.**
- **Store team names only**, never managers' real names or regions.
- **Index lookups** on (`manager_id`, `gameweek_id`).

## Worker requests per gameweek (estimate at 100k users)

| Job | Requests |
| --- | --- |
| bootstrap, fixtures, live points | A handful (1 each per run) |
| App users' picks and summaries | ~200,000 |
| League standings | ~150,000 (1 per 50 members per league). Consider refreshing only when a user opens the league |

At early scale (hundreds of users), all of this takes minutes. At 100k users: prioritise active users, spread requests out, and refresh standings less often.

## Open decisions

- None. Wager scoring (after hits) is decided in `docs/adr/0001-wager-rules.md`.

## Build order

1. FM-003: Prisma setup and `teams`
2. FM-007: `gameweeks`, `players`, `fixtures`, and the sync job
3. FM-011: `fpl_managers`, `manager_gameweeks`, `manager_picks`
4. Phase 3: league tables
