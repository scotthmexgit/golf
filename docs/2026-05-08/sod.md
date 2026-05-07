---
prompt_id: "01"
timestamp: 2026-05-08T00:00:00Z
session: 1
tags: [sod, phase-7, sweep]
---

# SOD: 2026-05-08

## Header

- **Date:** 2026-05-08
- **Session number:** 1
- **Filename:** sod.md
- **Day index:** 2 (second Phase 7 DevFlow day)
- **Prior EOD:** `docs/2026-05-07/09-eod.md`
- **Generated at:** 2026-05-08

---

## 1. Carryover from prior EOD

From `docs/2026-05-07/09-eod.md` §10:

**Carryover (blocked on Cowork):**
- **WF7-4 (Cowork verification)** — Wolf wizard + multi-bet UI verification. Awaiting GM scheduling. No Code work until findings arrive.
- **NA-5 (Nassau Cowork)** — Same pattern; can run in same session as WF7-4.

**Phase 7 sweep decision (needed from GM at this SOD):**  
Which bet follows Wolf in the aggregateRound sweep? EOD recommended **Skins** (smallest delta, same pattern as WF7-2). GM must confirm before Skins slice starts.

**Parking-lot item to verify:**  
SCORECARD-DECISIONS-WIRING — Explore (2026-05-07) found scorecard page:166–169 already calls `buildHoleDecisions` and includes `decisions` in PUT body. Item appears already closed. Quick verification and formal closure needed.

---

## 2. Issue tracker snapshot

*(From `docs/roadmap.md`, refreshed this SOD)*

**Active (Phase 7 — WF7-4 + sweep):**
- WF7-4: Cowork verification — OPEN, pending scheduling
- Phase 7 sweep: Skins → Nassau → Stroke Play (sequencing TBD)

**Active (Nassau parallel — NA-5):**
- NA-5: Cowork verification — OPEN, pending scheduling

**High priority open items:**
1. WF7-4 Cowork (gate for Wolf pilot formal closure)
2. NA-5 Cowork (gate for Nassau phase formal closure)
3. Phase 7 Skins cutover (ready to execute; GM direction needed)
4. SCORECARD-DECISIONS-WIRING verification + close (likely already done)

**Medium priority (not today):**
- perHoleDeltas.ts aggregateRound cutover (deferred from WF7-2)
- F12-TIED-WITHDRAWAL-EVENT
- D4 (Nassau §7 annotation)

---

## 3. Five-day pipeline

### Today (Day 0) — 3 items

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | SCORECARD-DECISIONS-WIRING verify + close | Parking lot (2026-05-01) | XS | Read scorecard page:166–169. Confirm buildHoleDecisions called and decisions in PUT body. Close item in IMPLEMENTATION_CHECKLIST.md. |
| 2 | Phase 7 sweep — Skins cutover (payouts.ts) | Phase 7 #11; Wolf-pilot pattern | S | Migrate Skins case in `computeGamePayouts` to aggregateRound orchestration (identical pattern to WF7-2 Wolf). New payouts.test.ts Skins tests. tsc + Vitest gate. |
| 3 | WF7-4 + NA-5 Cowork status note | EOD carryover | XS | Check if GM has scheduled Cowork. If findings available: triage + close WF7-4/NA-5. If not: note pending and move on. |

**Constraint on item 2:** Requires GM to confirm Skins as the next Phase 7 sweep target at this SOD before Code starts. See approval gate in Plan entry 2 below.

### Day +1 to +2 — committed next (≤6)

| # | Item | Source | Estimate | Blocker |
|---|---|---|---|---|
| 1 | WF7-4 — Cowork findings triage + WF7-4 closure | Phase 7 gate | S | Cowork session must run first |
| 2 | NA-5 — Nassau Cowork findings triage + closure | Nassau gate | S | Cowork session must run first |
| 3 | Phase 7 sweep — Nassau cutover (payouts.ts) | Phase 7 #11 | S | After Skins closes; GM approves Nassau |
| 4 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | After NA-5 closes |

### Day +3 to +5 — planned (≤5)

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Phase 7 sweep — Stroke Play cutover (payouts.ts) | Phase 7 #11 | S |
| 2 | Phase 7 sweep — perHoleDeltas.ts aggregateRound cutover | WF7-2 deferred | M |
| 3 | Phase 7 closure declaration (#11 fully closed) | Phase 7 #11 | XS |
| 4 | D4 — Nassau §7 press Junk annotation (docs) | Backlog | XS |
| 5 | AGENTS.md + CLAUDE.md stale-content sweep | CLAUDE.md §instruction-health | XS |

### Beyond +5 — backlog reference

See IMPLEMENTATION_CHECKLIST.md. Post-Phase-7: Match Play unpark, Junk Phase 3, F12 engine fix.

---

## 4. Today's structured plan

### Plan entry 1 — SCORECARD-DECISIONS-WIRING verify + close

- **Maps to today item:** #1
- **Objective:** Confirm the SCORECARD-DECISIONS-WIRING parking-lot item is actually closed, then formally mark it closed in IMPLEMENTATION_CHECKLIST.md.
- **In scope:**
  - Read `src/app/scorecard/[roundId]/page.tsx` lines 160–175 (buildHoleDecisions call and PUT body construction)
  - Read `src/lib/holeDecisions.ts` to confirm wolfPick + presses are included
  - If confirmed: mark item closed with date + commit ref in IMPLEMENTATION_CHECKLIST.md parking lot
  - If NOT confirmed: treat as an open gap and add back to today's work
- **Out of scope:** Any scorecard code changes (read-only verify pass)
- **Success criteria:** IMPLEMENTATION_CHECKLIST.md parking-lot entry for SCORECARD-DECISIONS-WIRING shows `[x]` with closure note. Commit.
- **Dependencies:** None.
- **Phase plan:** Steps 1+2 (Explore + verify). If confirmed closed: Steps 5+7 (no Develop; just admin close + commit). If open: escalate to Standard mode and add to today's work.

---

### Plan entry 2 — Phase 7 sweep: Skins cutover

- **Maps to today item:** #2
- **Objective:** Migrate the `'skins'` case in `computeGamePayouts` (`src/lib/payouts.ts`) from per-bet bridge dispatch to `aggregateRound` orchestration, following the WF7-2 Wolf pattern exactly.
- **In scope:**
  - `src/lib/payouts.ts` — Skins case: `settleSkinsBet(...).events` → `ScoringEventLog` → `aggregateRound` → `byBet[game.id]`
  - `src/lib/payouts.test.ts` — extend with Skins orchestration tests (at minimum: resolved skin, carry/split, zero-sum invariant, integer check, GR8 bet-id chain with non-default game id)
  - Grep gate: `grep -rn "settleSkinsBet" src/lib/payouts.ts` → 0 matches post-cutover
  - `npm run test:run` + `npx tsc --noEmit`
  - `/codex:review` + `/codex:adversarial-review` on working tree
  - Reviewer sub-agent gate
- **Out of scope:**
  - `src/lib/perHoleDeltas.ts` (still deferred)
  - Nassau, Stroke Play, Match Play payouts.ts cases
  - Any E2E spec changes (wolf-skins-multibet-flow.spec.ts already covers multi-bet Skins validation end-to-end)
  - `src/games/skins.ts`, `src/bridge/skins_bridge.ts` (no changes)
- **Success criteria:**
  - Skins case in `payouts.ts` routes through `aggregateRound`
  - `grep -rn "settleSkinsBet" src/lib/payouts.ts` → 0 matches
  - All Vitest tests pass (currently 658; new Skins tests will increase count)
  - `tsc --noEmit` clean
  - Reviewer APPROVED
  - Codex review + adversarial review complete; findings filed
- **Dependencies:** GM approves Skins as next Phase 7 sweep target (**approval gate — stop before Develop until confirmed**)
- **Phase plan:** Steps 1–3 (Explore + Plan + Codex plan-review), then **STOP for GM approval of sweep direction**. On approval, proceed to Steps 5–7 (Develop + post-review + report).

**GM decision needed before Develop:** Is Skins the approved next Phase 7 sweep target? (Alternatives: Nassau, Stroke Play, or defer sweep.)

---

### Plan entry 3 — WF7-4 + NA-5 Cowork status

- **Maps to today item:** #3
- **Objective:** Determine whether GM has scheduled Cowork for WF7-4 and/or NA-5. If findings are already available, triage and close. If not, note pending and continue with items 1-2.
- **In scope:** No Code work. Check with GM on Cowork scheduling status. If findings arrive: file closure report and update checklist.
- **Out of scope:** Any attempt to run Cowork verification without Cowork session.
- **Success criteria:** Either (a) WF7-4 and/or NA-5 closed with findings report, or (b) status noted as pending in EOD with next scheduling checkpoint.
- **Dependencies:** GM must know whether Cowork has run or is scheduled.
- **Phase plan:** Conversational only. No 7-step cycle needed unless findings arrive.

---

## 5. Risks and watchouts for today

- **Skins aggregateRound: finalizer concern.** Unlike Wolf (where `finalizeSkinsRound` is called inside `settleSkinsBet`), `settleSkinsBet` also calls its finalizer internally before returning events. Confirm this is the case before writing payouts.ts Skins cutover — the pattern should be identical to Wolf.
- **Skins `byBet` carry events.** `WolfCarryApplied` events don't carry `points` and are correctly ignored by the aggregateRound reducer. Verify Skins carry events (`SkinCarried`) similarly don't contribute to the monetary ledger (they're informational; only `SkinWon` has `points`). Confirm in `aggregate.ts:reduceEvent`.
- **GR8 id chain for Skins.** Same check as WF7-2: `buildSkinsCfg(game).id === game.id` must hold.
- **SCORECARD-DECISIONS-WIRING status.** If the verify reveals the item is NOT done, today's scope expands. Treat as a blocker for item #1, not for items #2-3.

---

## 6. Code's notes for this session

Phase 7 Day 2. Wolf pilot complete (WF7-0–WF7-3). Today's primary work is the Skins sweep slice (payouts.ts only) — it's the shortest Phase 7 cutover because Skins has no finalizer routing in aggregateRound (all finalization happens inside `settleSkinsBet`). SCORECARD-DECISIONS-WIRING cleanup is quick. Cowork hand-offs are conversational.

The session can realistically complete: item 1 (XS), item 2 if GM approves Skins (S), item 3 (XS). No Develop starts on item 2 until GM confirms at SOD.

---

*SOD complete — awaiting GM review of pipeline counts, Today sequencing, and Skins approval.*
