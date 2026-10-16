# ADR 0001: Wager lifecycle and rules

**Status:** Accepted
**Date:** 2026-10-16

## Context
The PRD says wagers have 6 states, but its diagram didn't export, so the states and the moves between them were never defined. Three rules were also open: how a score is counted, whether a creator can cancel, and which kinds of wager exist.

## Decision

### States
| State | Meaning |
| --- | --- |
| `open` | Created. The creator's stake is deducted, and the wager waits for an opponent. |
| `matched` | Accepted. The opponent's stake is deducted, and the wager waits for the gameweek deadline. |
| `live` | The deadline has passed and the gameweek is being played. |
| `settled` | The worker has paid out. The winner gets both stakes, and a tie refunds both sides. |
| `cancelled` | The creator cancelled while the wager was `open`. Their stake is refunded. |
| `expired` | Nobody accepted before the deadline. The creator's stake is refunded. |

### Transitions
```
open ──accept──▶ matched ──deadline──▶ live ──data_checked + settle──▶ settled
  │
  ├──creator cancels──▶ cancelled
  └──deadline, no opponent──▶ expired
```
- `settled`, `cancelled` and `expired` are final states. Nothing moves out of them.
- Every stake deduction and refund is a row in `ledger_entries`. Balances are never edited.

### Rules
1. **Scores count after hits.** A wager compares each manager's gameweek points minus transfer costs. *Why:* this is the number FPL shows users, so results match what they see.
2. **The creator can cancel only while the wager is `open`,** and gets an instant refund. Once it's `matched` it is locked. *Why:* there's no reason to lock credits nobody has agreed to, but an accepted wager is a deal between two people.
3. **Head-to-head only in v1.** One manager's score against another's, with no over/under bets against a target number. *Why:* over/under needs a counterparty or makes the app the bookmaker. It can be added later.

## Consequences
- Settlement needs each manager's points **and** transfer cost for the gameweek, so the data model must store both (this feeds the "missing tables" open question).
- `settlements.winner_id` is nullable so a tie can be recorded.
- The cancel endpoint must check the state is `open` in the same transaction as the refund, so a cancel and an accept can't both succeed.
