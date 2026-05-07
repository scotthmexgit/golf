---
prompt_id: 03
timestamp: 2026-05-06
checklist_item_ref: "F11-PRESS-GAME-SCOPE — scoping pass (design only)"
tags: [f11, nassau, press, scoping, design]
---

## Header
- **Date:** 2026-05-06
- **Number:** 03
- **Type:** design
- **Title slug:** f11-scoping
- **Linked issues:** F11-PRESS-GAME-SCOPE
- **Pipeline item:** Day +1-2 (post-NA-5 or alongside)

---

## Summary

Design document written at `docs/2026-05-06/03-f11-scoping.md`.

### What was explored

Traced the full press decision lifecycle:
- `handleSaveNext` → `detectNassauPressOffers` → `PressConfirmationModal` → `setPressConfirmation` → `HoleData.presses` (flat `string[]`) → `buildHoleDecisions` → DB blob → `hydrateHoleDecisions` → `settleNassauBet` (consumes `hd.presses` for ALL Nassau games without game-scope filter)

Root field confirmed: `HoleData.presses?: string[]` at `src/types/index.ts:117` — carries match IDs without game identity.

### Design summary

**Fix:** Change `HoleData.presses` from `string[]` to `Record<gameInstanceId, string[]>`. Keying by game instance UUID makes cross-game bleed structurally impossible.

**6 source files, 4 test files.** Single atomic commit (analogous to NA-1 F7 gate). Estimate: S–M.

**Backward compat:** Not compatible with existing HoleDecision DB rows. All are test rounds (~5 days since unpark). Recommended: wipe dev DB (Q1 for GM).

### Ground-rule audit

All 7 AGENTS.md ground rules checked. Ground rule #3 (zero-sum) is the one currently VIOLATED by the bug — the fix restores it. Others unaffected.

### Codex review

Not required for design-only prompt. Implementation prompt will require Codex + Reviewer gate.

---

## Outcome

- **Status:** complete — design filed, awaiting GM approval
- **Deliverable:** docs/2026-05-06/03-f11-scoping.md (8 sections, full trace, 3 open questions)
- **For GM:** Review design + answer Q1 (dev DB wipe vs. migration) and Q2 (withdrew scoping) before implementation prompt is issued.
- **For Cowork:** nothing (design-only).
