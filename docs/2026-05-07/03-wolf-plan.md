---
prompt_id: "03"
timestamp: 2026-05-07T00:00:00Z
checklist_item_ref: "Phase 7 — Full multi-bet cutover (#11) — Wolf plan"
tags: [plan, wolf, phase-7]
status: AWAITING_GM_APPROVAL
---

# Wolf Plan — Phase 7 Multi-Bet Cutover

**Phase:** Phase 7 — Full multi-bet cutover (#11), Wolf as pilot bet  
**Status: AWAITING GM APPROVAL — do not begin WF7-1 until explicit "approved" from GM**  
**Source explore:** `docs/2026-05-07/02-wolf-explore.md`  
**Reference plan (WF-0–WF-7 history):** `docs/plans/WOLF_PLAN.md`  
**Rule file:** `docs/games/game_wolf.md` (authoritative — not restated here per ground rule 1)

---

## Phase scope

Phase 7 is REBUILD_PLAN.md #11: full multi-bet cutover — migrating the orchestration layer from per-bet dispatch (`src/lib/payouts.ts`) to unified `aggregateRound` from `src/games/aggregate.ts`. Wolf is the pilot bet: it goes through the full Phase 7 treatment first, establishing the pattern for Nassau, Skins, and Stroke Play to follow.

**Wolf is already live in GAME_DEFS and has a full bridge, UI, and E2E spec.** Phase 7 is NOT a re-unpark of Wolf from the game picker. Phase 7 is about:
1. Surfacing Wolf-specific config options that were hardcoded in the bridge
2. Migrating the app's scoring orchestration from `src/lib/payouts.ts` to `aggregateRound`
3. Adding multi-bet E2E coverage (Wolf alongside other games)
4. Cowork visual verification in a multi-bet context

Closing WF7-4 (Cowork) completes the Wolf pilot. Nassau, Skins, Stroke Play then follow the same pattern in subsequent phases.

---

## Ground rules acknowledged (constraints on all Develop work)

Per AGENTS.md — every ground rule applies to every change in this phase:

1. **Rules from docs.** Rule answers live in `docs/games/game_wolf.md`. No scoring code without a rule-file reference. No inline rule restatement.
2. **Integer-unit math only.** All stake and delta values are integers in cents. No `toFixed`, no `Float` in Prisma, no floating-point in `src/games/`. Tests assert `Number.isInteger` on every delta.
3. **Settlement is zero-sum.** Per round, `Σ delta == 0` across all betting players, per game and in total. Unresolvable rounding emits `RoundingAdjustment`. Silent zero-pay on a tied hole is a correctness bug.
4. **Portability.** Code under `src/games/` imports zero of: `next/*`, `react`, `react-dom`, `fs`, `path`, `window`, `document`, `localStorage`, `@prisma/client`, `src/lib/*`.
5. **Handicap-in-one-place.** Every course-handicap computation goes through `src/games/handicap.ts`. No reimplementation.
6. **Typed ScoringEvent per delta.** Every delta-producing action emits a typed `ScoringEvent` variant with `{ timestamp, hole, actor, delta, kind }`.
7. **No silent defaults.** Every tie, carryover, and missing-decision emits an explicit event. Zero delta without event = bug.
8. **String-equality bet-id lookup.** `b.id === cfg.id`. No reference-identity comparisons.

---

## Resolved decisions (pre-locked for this plan)

### Decision A — aggregateRound as the cutover target

The Phase 7 cutover migrates `src/lib/payouts.ts:computeGamePayouts` and `src/lib/perHoleDeltas.ts` to call `aggregateRound` from `src/games/aggregate.ts` instead of per-bet bridge dispatch.

**Rationale:** `aggregateRound` was built specifically as the unified multi-bet orchestrator (REBUILD_PLAN.md #8, closed 2026-04-24). It handles all five games in one pass, returns a single zero-sum verified ledger, and routes events through the correct finalizers. The per-bet dispatch in `src/lib/payouts.ts` is an interim shim that predates #8.

### Decision B — Wolf is the pilot; pattern transfers to other bets

After WF7-4 (Cowork), the same migration slice runs for Skins, Nassau, Stroke Play in subsequent phases. Match Play (still disabled) is not in scope.

### Decision C — Config completeness scope is limited to tieRule + blindLone

Only `tieRule` (carryover vs no-points) and `blindLone` fields (enabled, multiplier) are surfaced in the wizard in this phase. `appliesHandicap` and Junk config remain deferred (Junk Phase 3 not in scope; handicap is always-on by convention).

**Schema delta: YES** — `GameInstance` needs new fields: `wolfTieRule` and optionally `wolfBlindLoneEnabled`, `wolfBlindLoneMultiplier`. Requires Prisma migration.

---

## Decisions requiring GM input before WF7-1 starts

### Decision D — Schema delta scope

**Option D-1 (Narrow):** Add only `wolfTieRule: String` to `GameInstance`. `blindLoneEnabled` stays hardcoded (true). `blindLoneMultiplier` computed from `loneWolfMultiplier`. One new field, one migration.

**Option D-2 (Full):** Add `wolfTieRule`, `wolfBlindLoneEnabled`, `wolfBlindLoneMultiplier` to `GameInstance`. Three new fields, one migration. Wizard exposes all three. Bridge removes all hardcodes.

**Code recommendation: D-1.** `tieRule` is the only option a player is likely to configure per-round. Blind Lone settings are game-wide conventions, not per-round choices. D-1 delivers the most common configuration need with minimum schema churn. If D-2 is desired later, additive migration.

**GM must select D-1 or D-2 (or other) before WF7-1.**

### Decision E — aggregateRound cutover sequencing

**Option E-1 (Wolf-pilot, then sweep):** Migrate `payouts.ts` and `perHoleDeltas.ts` for Wolf in WF7-2. Leave Skins/Nassau/Stroke Play on old dispatch temporarily. Validates the pattern before touching other live bets.

**Option E-2 (All-at-once):** Migrate all four bets in WF7-2 in a single commit with grep gates (matching REBUILD_PLAN.md #11 original description: "parallel-path migration across ~7 commits").

**Code recommendation: E-1 (Wolf-pilot).** The pilot approach limits blast radius — if `aggregateRound` has an integration issue with the app layer (not the engine layer, which is well-tested), it surfaces on Wolf only. Skins/Nassau/Stroke Play remain on the stable old path while Wolf is validated. E-2 can be selected if the GM wants #11 fully closed in one phase.

**GM must select E-1 or E-2 before WF7-2.**

---

## Implementation slicing

### WF7-0 — Plan (today — this document)

**Deliverable:** This plan doc + `/codex:review` findings.  
**Gate:** GM approval required before WF7-1 starts.  
**Status: IN PROGRESS (awaiting codex review and GM approval)**

---

### WF7-1 — Wizard config completeness

**Objective:** Surface `wolfTieRule` (and optionally `wolfBlindLoneEnabled`, `wolfBlindLoneMultiplier` per Decision D) in the game setup wizard. Update bridge to read from `GameInstance` instead of hardcoding.

**Files to modify:**
- `prisma/schema.prisma` — add `wolfTieRule String?` (and others per Decision D)
- `src/types/index.ts` — add field to `GameInstance` type
- `src/bridge/wolf_bridge.ts` — read `game.wolfTieRule ?? 'carryover'` instead of hardcode
- `src/components/setup/GameInstanceCard.tsx` — add wizard pill/select for tieRule

**Files to create:**
- `prisma/migrations/<timestamp>_wolf_tieRule/migration.sql`

**Schema delta:** YES — triggers approval gate. WF7-1 cannot auto-proceed; stops at Step 3 for GM review.

**Tests:** `src/bridge/wolf_bridge.test.ts` updated to cover `wolfTieRule` passthrough. Vitest gate: all tests pass.

**Estimate:** S (single prompt).

**Dependencies:** Decision D locked by GM.

---

### WF7-2 — `aggregateRound` cutover

**Objective:** Migrate `src/lib/payouts.ts` and `src/lib/perHoleDeltas.ts` to call `aggregateRound` for Wolf (E-1) or all bets (E-2) per Decision E.

**Files to modify (E-1 / Wolf-pilot):**
- `src/lib/payouts.ts` — replace `case 'wolf': settleWolfBet(...)` with `aggregateRound` call for Wolf bets; keep Skins/Nassau/SP on old path temporarily
- `src/lib/perHoleDeltas.ts` — same per-bet dispatch replaced for Wolf

**Files to modify (E-2 / all-at-once):**
- `src/lib/payouts.ts` — replace `computeGamePayouts` entirely with `aggregateRound`
- `src/lib/perHoleDeltas.ts` — replace per-bet dispatch entirely
- Grep gate: `grep -rn "computeSkins\|settleSkinsRound\|settleWolfBet\|settleNassauBet\|settleStrokePlayBet" src/lib/` → 0 matches after cutover

**Schema delta:** No.

**Tests:** All existing Vitest tests (currently 606+) must pass. `aggregateRound` is already unit-tested; WF7-2 validates integration at the app layer.

**Estimate:** S–M depending on E-1 vs E-2 scope.

**Dependencies:** WF7-1 complete (config completeness), Decision E locked.

---

### WF7-3 — Multi-bet E2E spec

**Objective:** Add or extend a Playwright spec that runs a round with Wolf + one other active bet (recommend Skins or Nassau), verifies per-hole deltas display correctly, and checks zero-sum settlement.

**Files to create:**
- `tests/playwright/wolf-multibet-flow.spec.ts` — 4–6 assertion groups: setup (Wolf + Skins), scorecard wolf declaration, per-hole bet display, round settlement, zero-sum invariant, park-fence check for Match Play.

**Files to modify:**
- None (no source changes; spec-only)

**Schema delta:** No.

**Tests:** `npm run test:e2e` — new spec 4/4 (or N/N) pass.

**Estimate:** S.

**Dependencies:** WF7-2 complete (aggregateRound live in app layer so the spec exercises the target path, not the old path).

---

### WF7-4 — Cowork verification

**Objective:** Visual verification of Wolf in multi-bet context. Cowork runs the round end-to-end and verifies BetDetailsSheet, WolfDeclare panel, per-hole display, and scorecard in multi-bet mode.

**Deliverable:** `findings-2026-MM-DD-HHMM.md` from Cowork.

**Gate items for WF7-4 closure:**
1. Wolf appears in GAME_DEFS without `disabled: true` — already true.
2. All Vitest tests pass (`npm run test:run`).
3. `tsc --noEmit --strict` passes.
4. Playwright `wolf-multibet-flow.spec.ts` passes.
5. Cowork 0 blocking findings.

**Estimate:** 1 Cowork session.

**Dependencies:** WF7-3 complete.

---

## File inventory summary

| File | Action | Slice |
|---|---|---|
| `prisma/schema.prisma` | Modify — add `wolfTieRule` (+ others per Decision D) | WF7-1 |
| `prisma/migrations/<ts>_wolf_tieRule/migration.sql` | Create | WF7-1 |
| `src/types/index.ts` | Modify — add `GameInstance` field | WF7-1 |
| `src/bridge/wolf_bridge.ts` | Modify — read `game.wolfTieRule` | WF7-1 |
| `src/components/setup/GameInstanceCard.tsx` | Modify — add tieRule wizard UI | WF7-1 |
| `src/lib/payouts.ts` | Modify — aggregateRound cutover | WF7-2 |
| `src/lib/perHoleDeltas.ts` | Modify — aggregateRound cutover | WF7-2 |
| `tests/playwright/wolf-multibet-flow.spec.ts` | Create | WF7-3 |
| `docs/plans/WOLF_PHASE7_PLAN.md` | Create (this is the plan doc) | WF7-0 |

**No changes to:**
- `src/games/wolf.ts` (engine complete)
- `src/games/aggregate.ts` (target orchestrator, unchanged)
- `tests/playwright/wolf-flow.spec.ts` (existing spec, not modified)
- Any Skins, Nassau, Stroke Play engine or bridge files
- `CLAUDE.md`, `AGENTS.md`, `IMPLEMENTATION_CHECKLIST.md` (out of scope per SOD)

---

## Schema delta detail

**Condition:** Schema delta fires IF Decision D proceeds (any option). Schema delta does NOT fire if GM decides config completeness is out of scope for Phase 7.

**Proposed migration (Decision D-1):**
```sql
ALTER TABLE "GameInstance" ADD COLUMN "wolfTieRule" TEXT;
-- NULL = use bridge default ('carryover')
```

**Prisma type:** `wolfTieRule String?` on `GameInstance` model.

**Bridge read pattern:**
```typescript
tieRule: (game.wolfTieRule === 'no-points' || game.wolfTieRule === 'carryover')
  ? game.wolfTieRule
  : 'carryover',  // default if null
```

---

## Dep additions

None. `aggregateRound` is already in `src/games/aggregate.ts`. No new npm packages.

---

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `aggregateRound` integration issue at app layer | Low | Engine + aggregate already unit-tested. WF7-2 is integration validation. |
| Schema migration breaks existing rounds | Low | `wolfTieRule` is nullable; existing rounds get `null` → bridge defaults to `'carryover'`. |
| Multi-bet E2E flakiness | Medium | Use explicit waits per existing spec pattern from wolf-flow.spec.ts. |
| Skins/Nassau affected by E-2 (all-at-once) cutover | Medium | Mitigated by choosing E-1 (pilot). If GM chooses E-2, run full Vitest + Playwright suite after each commit. |

---

## STOP — Plan phase complete

**DO NOT begin WF7-1 (Develop) until GM approves this plan and /codex:review findings.**

Required before Develop:
- [ ] GM approves this plan doc
- [ ] GM selects Decision D (D-1 narrow / D-2 full / defer config completeness)
- [ ] GM selects Decision E (E-1 Wolf-pilot / E-2 all-at-once)
- [ ] `/codex:review` findings reviewed (see sibling doc `04-wolf-plan-codex-review.md`)

Resume on explicit "approved" from GM.

---

*Authored: 2026-05-07 | Phase 7 SOD | Wolf pilot for multi-bet cutover*
