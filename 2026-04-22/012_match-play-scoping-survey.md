---
prompt_id: 012
timestamp: 2026-04-22T17:45:00Z
checklist_item_ref: "#6 — Match Play engine (scoping survey, pre-implementation)"
tags: [match-play, scoping, researcher, read-only]
---

## Prompt

Researcher pass: scope the Match Play engine before any code. Read-only survey covering
docs/games/match_play.md, REBUILD_PLAN.md #6 entry, nassau.ts structure, events.ts, and
types.ts for MatchPlayCfg. Identify rule-doc gaps, shared vs engine-local helpers, event
analogues, and open design questions for the phase-breakdown turn.

## Action

1. Read docs/games/match_play.md (all sections).
2. Read REBUILD_PLAN.md #6 scope statement.
3. Read src/games/nassau.ts for structural pattern (not to copy).
4. Read src/games/events.ts for event kind inventory.
5. Read src/games/types.ts for MatchPlayCfg and any existing types.
6. Compiled scoping report with 7 sections.

## Result

- Files touched: none (read-only)
- Scoping report delivered in chat with 7 sections:
  1. Match Play rule summary (§ 2, § 5–§ 11 with rule quotes)
  2. Nassau comparison (shared mechanics, MP-specific, divergences in event shape)
  3. Event type analysis (all required event kinds exist in events.ts; no new types needed)
  4. nassau.ts structure observations (engine-local vs shared helpers)
  5. Existing #6 scope statement (REBUILD_PLAN.md verbatim)
  6. Rule-doc gaps (10 gaps; 5 blocking, 5 formula/contract)
  7. Open design questions for phase-breakdown turn (8 questions)

## Key findings

- No new event types needed: all Match Play event kinds already exist in events.ts.
- Match Play has NO presses (§ 7 explicit). No press phases needed in #6.
- Four formats: singles (1v1), best-ball (2v2), alternate-shot/foursomes (2v2, one ball).
- Tee-off assignment explicitly engine-out-of-scope per § 11.
- MatchHalved vs MatchTied distinction unclear from types.ts — MatchTied may be Nassau-specific.
- `GameInstance.matchFormat` widening is a breaking type change (REBUILD_PLAN #6 AC).
- Legacy-value migration shim: 'individual' → 'singles', 'teams' → 'best-ball'.

## Open questions

10 rule-doc gaps listed; 5 blocking implementation (Gaps 1, 4, 5, 6, 9):
1. Extra-hole payment timing (§ 6) — per-hole vs terminal-only
4. Concession + closeout ordering (§ 7, § 9)
5. Extra-hole hole number representation (§ 6) — depends on HoleState.hole type
6. Cap-exhausted terminal event (§ 6) — MatchHalved or final ExtraHoleResolved?
9. Best-ball partial miss (§ 5, § 9) — any member missing vs all members missing

5 formula/contract gaps (Gaps 2, 3, 7, 10) — resolvable during documenter pass.

Next step: documenter pass to resolve all 10 gaps in docs/games/match_play.md.

## Parking lot additions

- (none new)
