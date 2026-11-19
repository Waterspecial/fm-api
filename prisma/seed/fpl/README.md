# FPL snapshot

Frozen copy of FPL's public API, used by `prisma/seed.ts` so local development and CI never call FPL.

- **Taken:** 2026-10-22
- **Season:** 2026/27
- **Gameweek:** 7 (finished and `data_checked`)

| File | Endpoint |
| --- | --- |
| `bootstrap-static.json` | `/api/bootstrap-static/` |
| `fixtures.json` | `/api/fixtures/` |
| `event-7-live.json` | `/api/event/7/live/` |

## Refresh

Replace the files (don't add new ones), then update the date and gameweek above.

    curl -sf -A "Mozilla/5.0" -o bootstrap-static.json https://fantasy.premierleague.com/api/bootstrap-static/
    curl -sf -A "Mozilla/5.0" -o fixtures.json https://fantasy.premierleague.com/api/fixtures/
    curl -sf -A "Mozilla/5.0" -o event-<GW>-live.json https://fantasy.premierleague.com/api/event/<GW>/live/

Run from this folder. Pick a finished gameweek whose `data_checked` is true in `bootstrap-static.json`.
