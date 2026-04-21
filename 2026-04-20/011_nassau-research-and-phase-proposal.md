---
prompt_id: 011
timestamp: 2026-04-20T22:32:00Z
checklist_item_ref: "#5 — Nassau engine, pre-Phase-1 planning"
tags: [planning, research-read, phase-proposal]
note: Back-logged at prompt 013 per amended session-logging skill. Timestamp approximate (between 010 at 16:27 and 012 at ~16:38).
---

## Prompt

Approve starting #5 with a different structure than #3 and #4 (L-sized, multi-turn). Preparatory step in this turn: (1) read `/tmp/round-3-nassau-research.md` and `docs/games/game_nassau.md`; summarize decisions the research + rule file captured; for each decision, confirm follow / deviate / needs-input. (2) Propose a phase breakdown — user guessed 4–5 phases but research and rule file should drive the actual structure. Each phase: scope, estimated turn count, verification checkpoints, files touched. No code this turn.

## Action

1. Read `/tmp/round-3-nassau-research.md` in full. Found the research focused on `matchTieRule` disposition (recommended: stale field, remove). Did not address USGA pair-wise allocation.
2. Read `docs/games/game_nassau.md` in full — 260 lines, 12 sections.
3. Extracted ~46 Nassau-specific design decisions, labelled N1–N46 internally. Rolled up into 10 categories (structural, config, per-hole, tie handling, press composition, settlement + closeout, edge cases, implementation, tests).
4. For each category: classified decisions as follow / deviate / needs-input. Most are follow; one deviation (offerPress return shape — array vs single event for consistency with other engines); three items genuinely need user input.
5. Identified three input decisions before Phase 1 can start:
   - I1: USGA allocation — § 2 prose (pair-wise) conflicts with § 5 pseudocode (per-player).
   - I2: settleNassauHole signature — stateful MatchState[] threading vs event-log replay vs other.
   - I3: withdrawal settlement on a tied match — § 9 N35 says "in favor of opposing player" but no lead exists when tied.
6. Proposed 4 phases (user guessed 4–5): Phase 1 types + per-hole singles; Phase 2 press handling (1–2 turns); Phase 3 settlement + closeout; Phase 4 edge cases + allPairs + Round Handicap integration.
7. Noted the USGA allocation question spans Nassau + Match Play (#6 inherits); presented as a candidate parking-lot entry since it's architectural and not yet settled.

## Result

- Files touched: none. Pure read-and-plan turn.
- Worked: research + rule file read; 3 input decisions surfaced; 4-phase breakdown proposed with per-phase scope, files, checkpoints, turn count estimates.
- Did not work / blocked: none. Phase 1 gated on user answering I1, I2, I3.

## Open questions

- User's calls on I1 (USGA allocation), I2 (signature), I3 (withdrawal-tied semantics).
- Whether to promote the USGA-allocation cross-engine observation from parking-lot-candidate to something tracked.

## Parking lot additions

(candidate presented but not added pending user direction — see prompt 012 resolution)
