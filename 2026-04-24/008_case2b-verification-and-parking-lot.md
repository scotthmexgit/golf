---
prompt_id: "008"
date: "2026-04-24"
agent: documenter
tags: [verification, parking-lot, match-play, §9, verifier-scope]
---

## What was done

Verified Case 2b bug claim from unattended pass 2 (002_s9_rule_gaps_consolidation.md).
Read match_play.ts:352-373 verbatim. Filed three parking-lot items.

## Verification

Read match_play.ts:350-373 verbatim. Three points confirmed:

1. Loop iterates `for (const wid of hole.withdrew)` — per-player, confirmed (line 353).
2. Each iteration pushes `TeamSizeReduced` with `remainingSize: 1` — confirmed (line 369).
3. `remainingSize` is literal `1` — confirmed (hardcoded, not calculated).

**Verdict: all three points correct. Real Phase 4d regression.**

When both team members withdrew, the loop fires twice (once per player), emitting two
`TeamSizeReduced` events for the same team, both with `remainingSize: 1`. Correct value
after full team withdrawal is 0.

No existing test exercises mutual partner withdrawal (§9 is doc-silent on this case);
regression was not caught by Phase 4d test suite.

## Parking-lot items filed (IMPLEMENTATION_CHECKLIST.md)

1. **TeamSizeReduced regression** — confirmed code bug at match_play.ts:352-373. Per-player
   loop + hardcoded `remainingSize: 1`. Fix: emit once per affected team with computed
   remaining count. Gated on Case 2b rule decision (HoleForfeited question). Cross-ref
   existing line 78 item (rule question). These are separate items.

2. **Verifier Invariant 11 — event payload consistency** — new invariant category: "events
   tell the truth." Checks payload fields against derivable state. TeamSizeReduced
   regression is the first concrete instance. Pass 4 fixture taxonomy needs extension.

3. **Verifier Invariant 4 — early-closeout hole coverage semantics** — three candidate
   definitions (a/b/c). Must resolve before verifier Phase 2 engineer starts. Pass 4
   should have halted on this; filing to close the loop.

## Process note

Unattended pass 4's "soft open question" framing on Invariant 4 was confirmed as a
misclassification: the question is rule-shaped ("what is hole coverage's definition?"),
not implementation-shaped. Halt condition met; pass 4 should have halted and noted a
blocker. Pattern filed for future unattended runs: any question whose answer changes
the recommendation is halt-worthy.

## Carry-forward

None. All three items filed to parking lot. No engineer work authorized.
