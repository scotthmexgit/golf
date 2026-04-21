---
prompt_id: 012
timestamp: 2026-04-20T22:38:00Z
checklist_item_ref: "#5 — Nassau engine, pre-Phase-1 clarification"
tags: [planning, clarification, architectural-decision, i4]
note: Back-logged at prompt 013 per amended session-logging skill. Timestamp approximate (between 011 at ~16:32 and 013 at 16:50).
---

## Prompt

Before responding to the phase breakdown, re-send I1/I2/I3 in full and Phases 1–2 in full — summary table showed phases exist but not their scope or checkpoints. Add I4 as a fourth input decision (not a parking-lot entry) with specific structure: (a) § 2 verbatim, (b) § 5 pseudocode verbatim, (c) what the research doc captures, (d) downstream impact on #6 Match Play + other engines, (e) recommendation with stated reason. Phase 2 explicitly approved for 2-turn path. Phase 4 adds two grep gates for #11 refactor re-verification. Do not expand phase structure; re-send what exists + add I4 + apply 2-turn note.

## Action

1. Re-sent I1 verbatim (noted I4 supersedes/extends).
2. Re-sent I2 verbatim (signature shape decision).
3. Re-sent I3 verbatim (withdrawal-tied semantics).
4. **Added I4** per user-specified 5-part structure:
   - (a) `game_nassau.md` § 2 line 13 verbatim: pair-wise allocation prose.
   - (b) § 5 holeResult pseudocode verbatim: per-player strokesOnHole.
   - (c) Research doc: captures nothing on USGA allocation — scope was matchTieRule.
   - (d) Downstream impact: Nassau (singles + allPairs), Match Play (singles format); Skins/Wolf/Stroke Play/Match Play-best-ball/Match Play-alternate-shot-foursomes unaffected by this decision. Also noted: the HoleState type doesn't need to change under either option — what changes is where the pair-wise reduction happens.
   - (e) Recommendation: pair-wise reduction inside the engine (option a). Five reasons: § 2 prose is authoritative over skeletal § 5 pseudocode; USGA Match Play convention is universally pair-wise in recreational sources; per-player gives incorrect net scores for non-degenerate handicap combinations; HoleState type stays consistent across all five engines; Match Play inherits the same pattern.
5. Re-sent Phase 1 in full (scope, files touched, verification checkpoints, turn estimate).
6. Re-sent Phase 2 in full with turn estimate updated from "1–2" to **2** per user's explicit pre-approval.
7. Noted Phase 4's two additional grep gates for later execution: `b.config === cfg` must return 0 post-Phase-4; `b.id === cfg.id` must return 4 post-Phase-4 (skins, wolf, stroke_play, nassau).

## Result

- Files touched: none. Clarification-only turn.
- Worked: I1–I4 presented with stated recommendations. Phases 1 and 2 re-sent. Phase 4 grep-gate addition recorded for later.
- Did not work / blocked: none. Phase 1 now gated on user's calls for I1/I4, I2, I3.

## Open questions

- User's four decision calls (I1/I4, I2, I3).
- Whether to promote the documenter rule-file-ambiguity item from the parking-lot candidate.

## Parking lot additions

(none — the USGA-allocation cross-engine observation was promoted to I4 per user direction; not a parking entry)
