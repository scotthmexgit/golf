---
prompt_id: "008"
timestamp: "2026-04-23T21:30:00Z"
checklist_item_ref: "#6 — Match Play engine (Phase 4b pre-req documenter: concession input API)"
tags: [match-play, phase4b, concession, documenter]
---

## Prompt

Phase 4b documenter pre-req: resolve four concession input API questions for game_match_play.md § 7. Rule doc currently specifies output only (ConcessionRecorded ordering); silent on input. Four questions: (1) HoleState field(s) for each unit, (2) match concession API, (3) unit discrimination, (4) best-ball per-player vs per-team. Fence: docs/games/game_match_play.md only.

## Evidence gates (pre-edit)

**§ 7 current text (lines 113–133):** Specifies the Gap 4 output ordering (ConcessionRecorded first, MatchClosedOut second). Completely silent on input API — no mention of HoleState.conceded or any concession signaling path.

**HoleState (types.ts lines 158–178):**
- `conceded: PlayerId[]` at line 176 — sole concession-related field; no unit discriminator
- `pickedUp: PlayerId[]` — analogous "ball out of play" field
- No `matchConceded`, no `concessionUnit`, no team-indexed concession fields

**ConcessionRecorded event (events.ts lines 184–189):**
- `hole: number | null`, `conceder: PlayerId`, `unit: 'hole' | 'stroke' | 'match'`

**§ 12 Test 4 (current, was Test 5):** Specifies output assertions only; no input shape. "B concedes after hole 10" — no caller API given.

**Best-ball + concession:** Rule doc is SILENT. No existing text addresses per-player vs per-team concession scope in best-ball.

## Stop-condition check

Q4: best-ball per-player concession uses existing `HoleState.conceded: PlayerId[]` (no new type field). Stop condition NOT triggered.

## Decisions

- `'hole'`: `HoleState.conceded: PlayerId[]` passed to `settleMatchPlayHole`. Checked before net-score comparison; short-circuits `holeWinner`.
- `'stroke'`: scorecard-level only; caller records gross score; no engine signal; `unit: 'stroke'` reserved for future UI annotation.
- `'match'`: new engine function `concedeMatch(cfg, roundCfg, match, concedingPlayer, hole)` — not via HoleState. No new type field required.
- Best-ball: `conceded` is per-player. Single-player concession → that player excluded from `bestNet` (same as partial-miss § 5 rule). All-team concession → `HoleForfeited`.

## Action

**docs/games/game_match_play.md:**

§ 7 — Added `<!-- Phase 4b input API resolved -->` block after Gap 4 ordering spec:
- Three-row input table: hole / stroke / match
- Hole concession contract: singles (side-based short-circuit) + best-ball (per-player; partial-miss applies)
- ConcessionRecorded replaces HoleResolved for conceded holes; match advance runs normally; Gap 4 ordering applies if closeout follows
- Match concession contract: `concedeMatch(cfg, roundCfg, match, concedingPlayer, hole)` function spec; returns `{ events, match: { ...match, closedOut: true } }`

§ 9 — Updated concession bullet cross-reference: "See § 7 for concession-and-closeout event ordering" → "See § 7 for concession input API and closeout event ordering"

§ 12 Test 4 — Rewritten to state input shape: `concedeMatch(cfg, roundCfg, match, B, 10)` as the caller call; asserts updated to include `conceder = B` and `holesRemaining = 8`

§ 12 Test 5 (new) — Added hole concession + closeout ordering test: A 3 up after H15, B concedes H16; asserts [ConcessionRecorded(hole), MatchClosedOut] order, holesUp=4, holesRemaining=2, no HoleResolved, Σ=0

No § 5 pseudocode changes (contract stated affirmatively in § 7). No § 11 changes (engineer adds `concedeMatch` export on implementation).

## Result

- Files touched: `docs/games/game_match_play.md`
- Post-edit re-read § 7 and § 12: internally consistent; all cross-references verified
- Test 4 holesRemaining arithmetic: 18−10=8 ✓; Test 5 holesUp arithmetic: 3+1=4, holesRemaining: 18−16=2 ✓
- No types.ts change triggered; stop-condition check clean

## Open questions

- None. Gate to Phase 4b engineer pass: implement `settleMatchPlayHole` concession-check + `concedeMatch` function per § 7 contract.

## Parking lot additions

- (none new)
