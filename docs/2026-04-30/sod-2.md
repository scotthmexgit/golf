# SOD: 2026-04-30 — Session 2

## Header
- **Date:** 2026-04-30
- **Day index:** 2 (second DevFlow work session — same calendar day)
- **Prior EOD:** docs/2026-04-30/eod.md (Session 1 comprehensive EOD)
- **Generated at:** 2026-04-30 (Session 2 start)

---

## 1. Carryover from prior EOD

Pulled from docs/2026-04-30/eod.md section 10.

- **In progress from Session 1:** none — all 9 prompts completed to reviewer APPROVED and committed.
- **Blocked from Session 1:** none.
- **Seed from EOD Section 10:**
  - Today #1: WF-6 (Playwright wolf-flow.spec.ts, S) — new spec for Wolf-specific flows
  - Today #2: WF-7 (Cowork phase-end visual verification, 1 session) — Wolf phase gate
  - Stretch: session-logging skill update (XS); WOLF_PLAN.md stepper-affordance note correction (XS)
  - Watchouts: WF-6 needs `data-testid` interaction with WolfDeclare panel; PM2 already rebuilt and current; per-prompt commit active

---

## 2. Issue tracker snapshot

Pulled from docs/roadmap.md (refreshed at this SOD from IMPLEMENTATION_CHECKLIST.md + WOLF_PLAN.md).

- **High priority open:** 2 — WF-6 (current active item), WF-7 (phase gate, Cowork session)
- **Medium priority open:** 2 — session-logging skill update (XS), WOLF_PLAN.md stepper-affordance note (XS)
- **Recently closed (Session 1):** WF-3, WF-4, WF-5, CONSOLE-EXCEPTION-SCORECARD-LOAD, no-mid-round-nav parking-lot item
- **Stale issues (>30 days):** 0

**AGENTS.md / IMPLEMENTATION_CHECKLIST.md pointer check:** Both read "Active phase: Wolf, current item: WF-6." No drift. ✓

---

## 3. Five-day pipeline

### Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | WF-6: Playwright wolf-flow.spec.ts | WOLF_PLAN.md WF-6 | S | New E2E spec: Wolf declaration (partner, lone, blind), BetDetailsSheet Wolf totals, round completion. Reviewer gate. Per-prompt commit at APPROVED. |
| 2 | WF-7: Cowork phase-end visual verification | WOLF_PLAN.md WF-7 | 1 session | WolfDeclare UI, declaration persistence across holes, sheet 75vh, Exit Round. Wolf phase gate. |

### Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | Session-logging skill update | EOD Session 1 instruction-health | XS | Independent; can fold into any next prompt as a housekeeping add-on |
| 2 | Post-Wolf phase planning | GM priority TBD | TBD | Depends on what GM wants next after Wolf closes |

### Day +3 to +5 — planned, lower confidence

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | PUT-HANDLER-400-ON-MISSING-FIELDS | backlog | XS |
| 2 | Next phase implementation (TBD) | GM priority | TBD |

### Beyond +5

See IMPLEMENTATION_CHECKLIST.md for backlog and parking lot. Phase 7 (full multi-bet cutover) deferred until third bet unparks.

---

## 4. Today's structured plan

### Plan entry 1: WF-6 — Playwright wolf-flow.spec.ts

- **Maps to today item:** #1
- **Objective:** Write a new Playwright E2E spec covering the Wolf game flows added in WF-1 through WF-5.
- **In scope:**
  - `tests/playwright/wolf-flow.spec.ts` (new file)
  - Spec fixture: 4-player round with Wolf game active ($5 stake, loneWolfMultiplier=2×, escalating=false)
  - Assertion groups:
    - §1 Setup: 4-player round, Wolf game configured in picker, round created
    - §2 Partner declaration: captain (hole 1 = player[0]) taps a partner; wolfPick written; BetDetailsSheet shows expected hole-1 Wolf delta
    - §3 Lone Wolf: captain taps "Lone Wolf" (solo); wolfPick='solo'; delta reflects lone-wolf win/loss
    - §4 Blind Lone: captain taps "Go Blind"; wolfPick='blind'; delta reflects blind-lone multiplier
    - §5 WolfDeclare absent in non-Wolf round (Skins-only round: `wolf-declare-panel` not visible)
    - §6 Fence: Wolf in picker, Nassau/Match Play absent
  - Reviewer gate required
  - Per-prompt commit at APPROVED
- **Out of scope:**
  - 5-player Wolf rotation (engine-tested in wolf_bridge.test.ts; UI E2E is 4-player)
  - Full 18-hole playthrough (skins-flow.spec.ts covers that pattern; WF-6 focuses on Wolf-specific surfaces)
  - Wolf + Skins combined round (multi-bet E2E deferred to Phase 7 cutover)
  - BetDetailsSheet accordion scrolling (covered in skins-flow §4)
  - Exit Round spec (covered functionally; a spec is backlog)
- **Success criteria:**
  - `tests/playwright/wolf-flow.spec.ts` exists and passes (1 new test)
  - Existing 2/2 Playwright specs still pass (regression gate)
  - Reviewer APPROVED
  - Per-prompt commit at APPROVED
- **Dependencies:** PM2 current (rebuilt end of Session 1). WolfDeclare testids: `wolf-declare-panel`, `wolf-partner-{pid}`, `wolf-declare-lone`, `wolf-declare-blind`. BetDetailsSheet testids: `sheet-row-{hole}-{pid}`, `sheet-breakdown-{hole}-{pid}-{gameId}`.
- **Phase plan:** Explore = confirm PM2 serving current build (spot-check wolf-declare-panel visible in browser); Plan = spec structure and assertion values; Develop = write spec + run; Reviewer gate; Commit; Report.
- **Approval gate:** auto-proceed (no new dependencies; no source file changes; spec file only).

### Plan entry 2: WF-7 — Cowork phase-end visual verification

- **Maps to today item:** #2 (Cowork session — separate user action)
- **Objective:** Cowork verifies all Wolf phase UI surfaces in the current PM2 build.
- **In scope (for Cowork to verify):**
  - WolfDeclare panel appears on scorecard for a Wolf round (captain name, buttons)
  - Declaration persists when navigating between holes (wolfPick stored in Zustand)
  - Bet-row shows "—" on hole navigation, then computed delta after stepper edit (SKINS-2)
  - BetDetailsSheet renders at ~75vh on Cowork's viewport
  - Exit Round button in sheet header → confirmation overlay → Leave → home page
  - Wolf appears in game picker; Nassau/Match Play absent
  - Sheet slide animation smooth; backdrop tap dismisses
- **Out of scope (Cowork):** Skins per-hole totals (requires Wolf+Skins round); 5-player rounds; settlement correctness (engine-tested)
- **Code action:** prepare Cowork handoff note as part of WF-7 report; no code change unless Cowork finds a bug
- **Phase gate:** WF-7 PASS closes the Wolf phase. If Cowork finds blocking issues, those become a follow-up prompt before phase close.

---

## 5. Risks and watchouts for today

- **WF-6 delta assertion values:** The exact dollar amounts in the wolf-flow spec depend on handicap calculations and wolf engine settlement. The Explore phase should either (a) calculate expected values from the fixture setup, or (b) run the round and read the actual BetDetailsSheet values, then use those as assertions. Option (b) is faster and less error-prone than manually computing handicap-adjusted wolf deltas.
- **WolfDeclare timing:** WolfDeclare reads `holeData?.wolfPick` from Zustand. After tapping a declaration button, the Playwright spec may need a short `waitForTimeout` to allow the React state update to render. Precedent: skins-flow.spec.ts uses 100ms timeouts after state changes.
- **SKINS-2 spec interaction:** The spec navigates between holes (which sets `suppressBetDelta=true`). The spec must trigger a stepper edit before asserting the bet-row amount, or it must read bet amounts from the BetDetailsSheet (which bypasses suppressBetDelta). BetDetailsSheet is the safer assertion target for delta values.
- **Cowork session scheduling:** WF-7 requires the user to run a Cowork session. This may not happen in the same Code session as WF-6. Code should be ready to write the WF-7 Cowork handoff and close the phase when findings come back.
- **Per-prompt commit:** WF-6 commits at reviewer APPROVED. WF-7 report commits when filed. No EOD-batch commits going forward.

---

## 6. Code's notes for GM

### Session 1 throughput recap (for calibration)

Session 1 ran 9 prompts against 1 committed Today item — a 9:1 ratio. The EOD section 8 analysis is in docs/2026-04-30/eod.md. Today's SOD commits 2 Today items (WF-6 + WF-7), which is more calibrated but still conservative. WF-6 is S-sized; WF-7 depends on Cowork availability. If WF-6 closes quickly and WF-7 waits on Cowork, Code can pick up a stretch item (session-logging skill update, or the WOLF_PLAN.md one-line correction).

### PM2 state

PM2 is running the build from end of Session 1 (commit 71b2b55, PID 2659147). All WF-1 through WF-5 changes are live. No rebuild needed before WF-6 Playwright runs (Playwright targets localhost:3000/golf which is served by PM2).

### Wolf phase completion path

WF-6 (this session) → WF-7 (Cowork session) → phase close. After phase close, GM chooses the next phase. Candidates from backlog: Nassau UI phase, Match Play UI phase, or a cross-cutting hardening pass (PUT-HANDLER-400, full multi-bet cutover §11). The EOD seed will include a next-phase recommendation.

### Session-logging skill and CLAUDE.md commit note

Two small instruction-health items from Session 1 EOD:
1. Session-logging skill may still reference old `NNN_slug.md` path format — XS doc edit, can fold into WF-6 or WF-7 report commit.
2. Per-prompt commit is now active but not documented in CLAUDE.md commit-hygiene section — can note it in the next doc-touching commit.

Neither is a blocker for today's work.
