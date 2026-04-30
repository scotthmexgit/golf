# SOD: 2026-04-30

> First DevFlow SOD for this project. Phase boundary — Skins phase complete. Establishes the DevFlow pipeline and proposes next phase. Does not start a new phase; GM approval required before Wolf plan work begins.

## Header
- **Date:** 2026-04-30
- **Day index:** 1 (first DevFlow work session; pre-DevFlow Skins work does not count)
- **Prior EOD:** docs/2026-04-30/eod.md (same-day — special case: first DevFlow SOD runs at the Skins phase-close EOD boundary)
- **Generated at:** 2026-04-30 (first DevFlow setup)

---

## 1. Carryover from prior EOD

Pulled from docs/2026-04-30/eod.md.

- **In progress yesterday:** none — all SK-0 through SK-5 closed. Vitest 396/396, tsc clean, PM2 online.
- **Blocked yesterday:** none.
- **Seed from prior EOD:** "Opening question: What is the next phase?" Five candidates listed (Wolf, Nassau/Match Play, parking-lot backlog, console-exception triage, Phase 7). No pre-decision — decision deferred to this SOD. Parking-lot items open: PARKING-LOT-SKINS-1 (tap target, XS), PARKING-LOT-SKINS-2 (hole-1 immediate settlement, S), PARKING-LOT-SKINS-3 (docs note only). EOD also flagged the console-exception Cowork observation as un-triaged.

---

## 2. Issue tracker snapshot

Pulled from docs/roadmap.md (refreshed at this SOD from IMPLEMENTATION_CHECKLIST.md).

- **High priority open:** 1 — next phase decision (Wolf recommended; see section 6)
- **Medium priority open:** 4 — PARKING-LOT-SKINS-1 (tap target), PARKING-LOT-SKINS-2 (immediate settlement), no mid-round home navigation, PUT-HANDLER-400-ON-MISSING-FIELDS
- **Recently opened (last 3 days):** 3 — PARKING-LOT-SKINS-1, PARKING-LOT-SKINS-2, PARKING-LOT-SKINS-3 (all filed 2026-04-30 from Cowork findings-2026-04-30-0246.md)
- **Stale issues (>30 days no activity):** 0 — everything open was filed 2026-04-20 or later. Not growing.

---

## 3. Five-day pipeline

### Today (Day 0)

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | AGENTS.md + session-logging skill housekeeping | CLAUDE.md DevFlow init flags | S | Clear stale SK-5/Skins pointers in AGENTS.md; update session-logging SKILL.md paths to DevFlow convention (docs/yyyy-mm-dd/NN-<slug>.md); behavior rules unchanged |

### Day +1 to +2 — committed next

| # | Item | Source | Estimate | Blocker if any |
|---|---|---|---|---|
| 1 | Wolf phase plan: write docs/plans/WOLF_PLAN.md | EOD seed / design timeline | M | GM approval of Wolf recommendation (section 6) |
| 2 | Parking lot triage sweep (SKINS-1, SKINS-2, stepper) | IMPLEMENTATION_CHECKLIST.md | S | Wolf plan must land first — triage decides in vs. out of Wolf phase scope |

### Day +3 to +5 — planned, lower confidence

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Wolf WF-1: bridge scaffold (`src/bridge/wolf_bridge.ts`) | Wolf plan | M |
| 2 | Wolf WF-2: wizard integration (remove `disabled: true`, add wolf to game picker) | Wolf plan | S |
| 3 | Wolf WF-3: scorecard per-hole Lone Wolf declaration gesture | Wolf plan | M |

### Beyond +5 — backlog reference

- See IMPLEMENTATION_CHECKLIST.md for active scope, parking lot, and backlog. Last reviewed 2026-04-30.

---

## 4. Today's structured plan

### Plan entry 1

- **Maps to today item:** #1
- **Objective:** Clear stale AGENTS.md phase/item pointers and update the session-logging SKILL.md path strings to DevFlow convention so tooling and future sessions use the correct paths.
- **In scope:**
  - AGENTS.md — lines containing "Active phase: Skins" and "Current item: SK-5 …" (and the SK-0–SK-4 closure note below it); replace with phase-boundary language matching IMPLEMENTATION_CHECKLIST.md
  - `.claude/skills/session-logging/SKILL.md` — Paths section (step 1 `./YYYY-MM-DD/NNN_<slug>.md`, step 2 `./EOD_*.md`, the Paths subsection example dates); replace with DevFlow equivalents (`docs/yyyy-mm-dd/NN-<slug>.md`, `docs/yyyy-mm-dd/eod.md`)
- **Out of scope:**
  - AGENTS.md ground rules (the 7 numbered rules), routing table, stack block, and all other content — no changes
  - session-logging SKILL.md behavior rules (what counts as substantive, skip-logging rule, per-prompt template, rolling EOD entry format) — no changes, these remain valid under DevFlow
  - CLAUDE.md — already updated by DevFlow integration (2026-04-30); no further changes needed
  - Any engine or UI files
- **Success criteria:**
  - AGENTS.md reads "No active item — phase boundary as of 2026-04-30. Next phase TBD — Wolf recommended at first DevFlow SOD." (or equivalent); the SK-5 current-item line is gone or superseded
  - session-logging SKILL.md Paths section specifies `docs/yyyy-mm-dd/NN-<slug>.md` (2-digit, docs/-relative) and `docs/yyyy-mm-dd/eod.md`; no root-relative `./YYYY-MM-DD/` paths remain in the section
  - No other content in either file is altered
  - `npm run test:run` still passes (no TS files touched, but confirm)
- **Dependencies:** none
- **Phase plan:** Tiny prompt — all 4 phases collapse. Explore = read both files (done at SOD). Plan = confirm target lines. Develop = edit. Report = append to eod.md.

---

## 5. Risks and watchouts for today

- **Risks:** Today's item is housekeeping only — low risk. The AGENTS.md edit touches status lines, not ground rules; reviewer gate not required for a pointer update. Verify no other AGENTS.md lines reference SK-5 or the Skins phase.
- **Decisions GM needs from user:** Confirm Wolf as next phase (or override to Nassau, Match Play, or parking-lot cleanup sprint). Needed before Day +1-2 Wolf plan work begins. This SOD does not start the Wolf plan — it proposes it.
- **Cowork checks queued:** None for today — housekeeping only, no UI changes.
- **Untriaged item:** EOD noted a possible console-exception observation in Cowork findings-2026-04-30-0246.md that was not filed as a parking-lot item. GM should confirm whether this was in the findings; if so, Code will triage and file.

---

## 6. Code's notes for GM

### Proposed next phase: Wolf (Phase 8)

**Recommendation: unpark Wolf next, before Nassau or Match Play.**

Rationale:

1. **Scorecard patterns transfer directly.** Skins and Wolf are both settled per-hole. The per-hole bet-row (SK-1a) and accordion delta display (SK-1b) built during the Skins phase are the exact UI scaffolding Wolf needs. Starting Wolf now means reusing momentum from the most recent UI work, not context-switching to a different pattern.

2. **Nassau and Match Play share match-format UI that doesn't exist yet.** Both games require a running match-score display (Front 9 / Back 9 / 18 status, press indicator, closeout state). That UI pattern is more complex and the two games are more similar to each other than either is to Wolf. They're better developed as a pair in a later phase once the match-UI layer exists.

3. **Wolf's unique gesture is bounded.** Wolf requires a "declare Lone Wolf" tap before each hole. This is a new UI element, but it's scoped to the hole-entry flow and self-contained. It's the Wolf equivalent of the skins accordion — a feature that reveals the game's unique character in the UI without requiring architectural changes.

4. **Engine is production-ready.** `src/games/wolf.ts` passes 396/396 tests (it's included in the current vitest run). No bridge exists yet — the first Wolf engineering prompt will create `src/bridge/wolf_bridge.ts` following the pattern of `src/bridge/skins_bridge.ts`. This is the same starting state Skins was in at SK-0.

5. **Phase 7 remains deferred.** Phase 7 (full multi-bet cutover, REBUILD_PLAN #11) requires the third bet to be unparked. Stroke Play and Skins are live; Wolf would be the second. Phase 7 stays blocked regardless.

**Override candidates if GM prefers:**
- Nassau first: reasonable if GM wants match-play UI patterns earlier. Nassau engine is also complete; bridge would need creating. Nassau has the most complex settlement (allPairs, presses, front/back/18 overlapping matches).
- Parking lot cleanup sprint before any new bet: also reasonable — SKINS-1, SKINS-2, stepper affordance, and no-mid-round navigation are all S/M and could close in 1-2 sessions. Recommend against making this a separate phase; better to fold the XS/S items into the Wolf phase plan as scope-optional cleanup.

---

### AGENTS.md reconciliation note

**Current state (stale):** AGENTS.md lines 20–22 read:

```
Active phase: Skins — see docs/plans/SKINS_PLAN.md. Current item: SK-5 (Cowork visual
verification — operator/Cowork only; engineer does not touch). SK-0–SK-4 closed 2026-04-30.
```

**Correct state:** SK-5 closed 2026-04-30 (Cowork findings-2026-04-30-0246.md; all 8 points PASS). IMPLEMENTATION_CHECKLIST.md reads "No active item — phase boundary." The AGENTS.md pointer is one session behind.

**Proposed fix (Today item #1):** Update to read "No active item — phase boundary as of 2026-04-30. Next phase TBD — Wolf recommended at first DevFlow SOD." After the Wolf plan is approved and WF-0 opens, Code will update the pointer again to "Active phase: Wolf / Current item: WF-0."

---

### session-logging skill path drift note

**Current state (stale):** `.claude/skills/session-logging/SKILL.md` Paths section specifies:

```
./YYYY-MM-DD/NNN_<slug>.md   ← root-relative, 3-digit counter
./EOD_DD-Month-YYYY.md       ← root-relative, legacy name
```

**DevFlow convention:** `docs/yyyy-mm-dd/NN-<slug>.md` (2-digit, under `docs/`), with the rolling EOD entry rolled into `docs/yyyy-mm-dd/eod.md` rather than a separate root-level `EOD_*.md` file.

**Impact:** The skill's behavior rules (what counts as substantive, when to skip, entry format) remain valid and should not change. Only the Paths section and its example dates need updating. Under DevFlow, the session-logging skill's "step 1" and "step 2" paths point at the wrong location, which would cause any Code invocation of the skill to write to the wrong directory.

**Proposed fix (Today item #1):** Update the Paths section in SKILL.md to reflect DevFlow paths. Preserve all behavior rules and templates verbatim.

---

### Minor: console-exception triage

EOD flagged that Cowork findings-2026-04-30-0246.md *may* have contained a console-exception observation that was not filed as a parking-lot item. The SK-5 closeout report (006_sk5_closeout.md) captured 8 verification points PASS and 3 parking-lot items — Code does not have visibility into whether a console exception was in the original findings file. GM should confirm. If yes, Code will triage in the next prompt after today's housekeeping.
