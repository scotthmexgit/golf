---
prompt_id: "sod-2"
timestamp: 2026-05-08T00:00:00Z
session: 2
tags: [sod, phase-7, perHoleDeltas, cowork-followup]
---

# SOD: 2026-05-08-2

## Header

- **Date:** 2026-05-08
- **Session number:** 2 (second SOD in docs/2026-05-08/; note Day 3 was misfiled to docs/2026-05-09/ — actual system date was 2026-05-08 throughout)
- **Filename:** sod-2.md
- **Day index:** 4 (continuing from Day 3; work-session counter does not reset)
- **Prior EOD:** `docs/2026-05-09/eod.md` (EOD Day 3 — misfiled to wrong date folder; actual work date 2026-05-08)
- **Generated at:** 2026-05-08

---

## 1. Carryover from prior EOD

From `docs/2026-05-09/eod.md` §10 (EOD Day 3):

**Phase 7 #11 remaining code work:**
- **perHoleDeltas.ts cutover** — sole remaining #11 code slice. Deferred from Day 3 by Cowork bundle work consuming capacity. Unblocked; today's primary. Explore dispatch shape before planning.

**Post-bundle Cowork follow-ups (4 items — from post-bundle Cowork session on Day 3):**
- **(a) B4 auto-advance fix:** `PressConfirmationModal.onComplete` triggers `proceedSave` immediately after accepting/declining a press — mismatches user expectation that pressing should not auto-save. Fix: decouple `onComplete` from `proceedSave`; close modal and leave user on hole to save explicitly.
- **(b) B5 label clarity:** "Press? (X is down), (X is down)" confusing when two matches share the same down player. Proposed: "Press? Front 9: X is down · Overall: X is down" distinguishes by match name.
- **(c) B3 $0.00 vs '—':** Results page Game Breakdown shows `—` for settled $0 amounts (correct for in-progress but wrong for settled zero). Options: Results-page-only formatter or new `formatMoneySettled`.
- **(d) Legacy bets investigation:** Rounds 50 and 79 show "Golfer —" / "No holes scored yet" on Bet History page despite correct Results pages. Investigate before writing any fix.

**Blocked on Cowork scheduling (no Code action needed):**
- **WF7-4 formal closure** — re-run Cowork session required; GM schedules.
- **NA-5 formal closure** — same; can share WF7-4 re-run session.

**GM decisions carryover:**
- **Phase 8 direction** — after perHoleDeltas closes: Match Play unpark (L)? Junk Phase 3 (M)? F12 (XS-S)? Nassau buildHoleState gap (S)?
- **cowork-claude.md copy** — GM action; copy `golf/cowork-claude.md` on Linux server to Windows desktop project folder for Cowork's use.

---

## 2. Issue tracker snapshot

*(From `docs/roadmap.md`, refreshed this SOD)*

**Active (Phase 7 — final code work):**
- perHoleDeltas.ts cutover — OPEN; today's primary (#1)
- Post-bundle Cowork follow-ups (4 items) — OPEN; today (#2)

**Active (Cowork-gated — blocked on scheduling):**
- WF7-4: OPEN — re-run pending
- NA-5: OPEN — re-run pending

**High priority open items:**
1. perHoleDeltas.ts cutover (Phase 7 #11 final code slice)
2. Post-bundle Cowork follow-ups: B4 auto-advance, B5 label clarity, B3 settled-zero display, legacy bets investigation
3. WF7-4 formal closure (re-run Cowork)
4. NA-5 formal closure (re-run Cowork)

**Medium priority (not today):**
- Nassau buildHoleState 0-vs-undefined gap (parking-lot; S)
- Phase 7 #11 closure declaration
- Nassau phase closure declaration
- D4 — Nassau §7 annotation (XS)
- F12-TIED-WITHDRAWAL-EVENT

**Test surface (current):**
- Vitest: 766 tests
- Playwright E2E: 6 specs, all green

---

## 3. Five-day pipeline

### Today (Day 0) — 3 items

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | perHoleDeltas.ts cutover | Phase 7 #11 carry | S | Explore dispatch shape → Plan → Codex plan-review → STOP for GM → Develop → Codex post-review → reviewer → commit |
| 2 | Post-bundle Cowork follow-ups (4 items) | Post-bundle Cowork findings | S total | Bundle all four; B4+B5+B3 are small code fixes; (d) is investigate-first |
| 3 | Phase 8 direction discussion | GM | XS | GM decides after perHoleDeltas closes |

**Constraint on item 1:** Explore must answer the standard 10-item dispatch-shape checklist before Plan is written. If perHoleDeltas has a radically different shape (per-hole rather than per-round, or compound keys), Plan diverges from the Wolf template and must say so. STOP for GM approval before Develop regardless.

**Constraint on item 2d (legacy bets):** Investigate before writing any fix. If root cause is schema/data difference not worth fixing for pre-deploy rounds, close as "expected — won't fix."

### Day +1 to +2 — committed next (≤6)

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | Phase 7 #11 closure declaration | Phase 7 #11 | XS | After perHoleDeltas closes |
| 2 | WF7-4 formal closure (Cowork re-run) | Phase 7 gate | S | GM schedules re-run session |
| 3 | NA-5 formal closure (Cowork re-run) | Nassau gate | S | GM schedules re-run session |
| 4 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | After NA-5 closes |

### Day +3 to +5 — planned (≤5)

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Nassau buildHoleState 0-vs-undefined gap | Parking lot | S |
| 2 | Phase 8 first slice (TBD by GM) | Phase 8 | TBD |
| 3 | D4 — Nassau §7 press Junk annotation | Backlog | XS |

### Beyond +5 — backlog reference

See IMPLEMENTATION_CHECKLIST.md. Post-Phase-7: Match Play unpark (L), Junk Phase 3 (M), F12 engine fix (XS-S), Round-state verifier (M).

---

## 4. Today's structured plan

### Plan entry 1 — perHoleDeltas.ts cutover

- **Maps to today item:** #1
- **Objective:** Migrate `src/lib/perHoleDeltas.ts` from per-bet bridge dispatch to `aggregateRound` orchestration (Phase 7 #11 final code slice).
- **In scope:**
  - Explore: read `src/lib/perHoleDeltas.ts` (full dispatch shape); answer the 10-item verification checklist used in prior sweep slices (same questions as WF7-2/Skins/Nassau/SP). Answer: does it assemble per-bet logs or per-hole? does it use compound keys? does it have a finalizer? does it call settleSkinsBet/settleNassauBet/settleSkinsBet etc.?
  - Plan: orchestration code, file list, test plan (GR8 id chain, multi-bet isolation, zero-sum), any divergence from Wolf template
  - Codex plan-review: run from `/home/seadmin/golf` with `--scope working-tree`
  - STOP for GM approval before Develop
  - On approval: Develop (perHoleDeltas.ts case edits + new tests), Codex post-review, reviewer gate, commit
- **Out of scope:**
  - `src/lib/payouts.ts` — all four cases closed; no further changes
  - Any engine changes (`src/games/`)
  - E2E spec additions
  - Any post-bundle follow-up items (Plan entry 2)
- **Success criteria:**
  - perHoleDeltas.ts dispatch routes through `aggregateRound` for all active bet types
  - Grep gate passes (no remaining direct bridge dispatch for migrated types)
  - Vitest tests pass (766 + new perHoleDeltas tests)
  - `tsc --noEmit` clean
  - Reviewer APPROVED
  - Codex adversarial review complete (scoped, from golf dir)
- **Dependencies:** GM approval at Plan step (standard approval gate for sweep slices).
- **Phase plan:** Steps 1–3 (Explore + Plan + Codex plan-review), then STOP. On GM approval: Steps 5–7 (Develop + Codex post-review + report).

---

### Plan entry 2 — Post-bundle Cowork follow-ups (4 items)

- **Maps to today item:** #2
- **Objective:** Resolve the four post-bundle Cowork findings from Day 3 as a single bundle: B4 auto-advance decoupling, B5 label clarity, B3 settled-zero display, and legacy bets investigation/decision.
- **In scope:**
  - **(a) B4 auto-advance:** `src/app/scorecard/[roundId]/page.tsx` — decouple `PressConfirmationModal.onComplete` from `proceedSave`; modal closes after resolution; user saves explicitly
  - **(b) B5 label clarity:** `src/lib/nassauPressDetect.ts` (return shape) and/or `scorecard/[roundId]/page.tsx` (button label template) — distinguish matches by name in the "Press?" button
  - **(c) B3 $0.00 display:** `src/app/results/[roundId]/page.tsx` — show `$0.00` for settled-zero amounts; investigate whether a results-page-only formatter or a new `formatMoneySettled` is cleaner
  - **(d) Legacy bets:** Investigate rounds 50 and 79 — determine root cause (data-shape difference vs code defect vs expected); if expected/won't-fix, close with note; if code defect, scope fix
  - New unit/Playwright tests for (a) and (b) as needed; if (b) changes `detectManualNassauPressOffers` return shape, existing B5 unit tests must still pass
  - `npm run test:run` + `npx tsc --noEmit` gate
  - Codex adversarial review + reviewer gate
- **Out of scope:**
  - Any perHoleDeltas.ts work
  - Any Phase 8 items
  - WF7-4/NA-5 formal closure (Cowork-gated; no Code action)
- **Success criteria:**
  - (a) Press acceptance/decline no longer auto-saves hole; user remains on hole after modal closes
  - (b) Multi-match "Press?" button distinguishes matches by name
  - (c) Results page shows `$0.00` (not `—`) for settled-zero game subtotals
  - (d) Legacy bets root cause documented; closed with note or fix shipped
  - Vitest gate passes; Reviewer APPROVED
- **Dependencies:** Plan entry 1 (perHoleDeltas) does not block this. Can run in parallel or after.
- **Phase plan:** Full 7-step cycle. Steps 1–3 (Explore + Plan + Codex plan-review). If no approval gate triggered, auto-proceed to Step 5 (Develop). Step 6 Codex post-review. Step 7 report.

---

### Plan entry 3 — Phase 8 direction discussion

- **Maps to today item:** #3
- **Objective:** GM decides the Phase 8 direction after perHoleDeltas closes.
- **In scope:** Conversational. Code can provide sizing estimates or read any file GM asks about.
- **Out of scope:** Any Phase 8 code work today.
- **Success criteria:** GM has stated the Phase 8 target (or explicitly deferred the decision).
- **Dependencies:** Plan entry 1 (perHoleDeltas) should close first so the context is complete.
- **Phase plan:** Conversational only. No 7-step cycle.

---

## 5. Risks and watchouts for today

- **perHoleDeltas.ts shape unknown.** This file was deferred from WF7-2 without a full Explore pass. It may have a per-hole dispatch shape (not per-round like payouts.ts), which would make the aggregateRound migration more complex. Explore must surface this before Plan. If shape is unexpected, Plan may need more than one GM approval loop.
- **B4 decoupling:** `PressConfirmationModal.onComplete` likely ties into the hole-save flow in multiple places. Read the full call chain before writing the fix to avoid breaking the save on non-press holes.
- **B3 formatter choice:** `formatMoneyDecimal` is used in multiple places. If we introduce `formatMoneySettled`, check all results-page callsites for consistency. Prefer a results-page-local decision over a new shared utility if the difference is narrow.
- **(d) Legacy bets root cause:** Do not write a fix without first determining whether rounds 50/79 are pre-deploy rounds with a known schema difference. If they are, closing as "expected" is the right call.
- **Date anomaly note:** Prior session (Day 3) misfiled work to `docs/2026-05-09/`. Roadmap, pipeline, and this SOD are corrected to reflect system date 2026-05-08. Day index continues sequentially (4). No work needs to be re-done; the misfiling is cosmetic.
- **Decisions GM needs at SOD:** (a) Is item 1 (perHoleDeltas) approved to start? (b) Is item 2 (follow-up bundle) approved to run after or in parallel? (c) Any Phase 8 direction to share now?

---

## 6. Code's notes for GM

Phase 7 Day 4. Three prior sessions: Wolf pilot (Day 1), payouts.ts three-bet sweep (Day 2), Cowork bundle B1–B6 + instruction-health (Day 3). Today completes Phase 7's code work.

**perHoleDeltas.ts** is the one remaining unknown — it was intentionally deferred from Day 1 (WF7-2) because its dispatch shape was not confirmed to match payouts.ts. The Explore must happen before the Plan. If the shape matches Wolf, the cutover is S-sized and the session can absorb both it and the follow-up bundle.

**Post-bundle follow-ups** are all small (XS–S) individually. Bundling them is the right call — same pattern as B1–B6. If the legacy bets investigation (d) turns up a real code defect, scope it on the fly; if it's pre-deploy data, close it immediately and note it.

**Date anomaly:** No action needed beyond acknowledging it. Prior work is correct; only the folder name is wrong. Roadmap and pipeline are corrected.

---

*SOD Day 4 — awaiting GM plan review and perHoleDeltas approval.*
