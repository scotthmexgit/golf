<!-- DEVFLOW EOD
     Date: 2026-05-08
     Session: 1 (first and only session today)
     Day index: 2 (second Phase 7 DevFlow day)
-->

# EOD: 2026-05-08

## Header

- **Date:** 2026-05-08
- **Session number:** 1
- **Filename:** 15-eod.md
- **Day index:** 2 (second Phase 7 DevFlow day)
- **Linked SOD:** `docs/2026-05-08/sod.md`
- **Reports filed this session:** 15 (01-sod through 14-strokeplay-develop, plus this EOD)

---

## 1. Today's plan vs reality

### SOD Plan entries (from `docs/2026-05-08/sod.md`)

| Plan entry | Maps to Today item | Status | Notes |
|---|---|---|---|
| SCORECARD-DECISIONS-WIRING verify + close | #1 | **complete** | Verified in Skins Explore (02-skins-explore.md §7): scorecard/[roundId]/page.tsx:166–169 calls `buildHoleDecisions` and includes `decisions` in PUT body. wolfPick + presses confirmed. Item closed in IMPLEMENTATION_CHECKLIST.md. Committed 454724d. |
| Phase 7 sweep — Skins cutover | #2 | **complete** | Explore (02) → Plan (03) → Codex plan-review (04) → Develop (05). SP1-SP10 tests (677 total). Reviewer APPROVED. Committed effb63d. Key finding: `buildSkinsCfg` private → 1-char export needed. |
| WF7-4 + NA-5 Cowork status | #3 | **complete** | Status noted. GM has not scheduled Cowork; both items remain pending scheduling. No Code action taken. |

### Pulled-forward slices (not in SOD Today; executed mid-session after GM approval)

| Slice | SOD placement | Status | Notes |
|---|---|---|---|
| Nassau cutover (payouts.ts) | Day +1-2 item #3 | **complete** | 06-explore → 07-plan → 08-codex → 09-develop. NP1-NP10 tests (718 total). Key divergence: compound byBet keys → `netByPlayer` extraction (vs `byBet[game.id]`). NP8 revised from 0-score test to partial-round test (Codex finding). Reviewer APPROVED. Committed b528b52. |
| Stroke Play cutover (payouts.ts) | Day +3-5 item #1 | **complete** | 10-explore → 11-plan → 12-codex (failed, input too large) → 13-codex rerun (needs-attention: F1+F2) → 14-develop. STP1-STP11+STP5b tests (762 total). Most intensive Codex cycle: 3 iterations to harden F1 guard. Reviewer APPROVED. Committed 3a09d79. |
| Codex tooling resolution | Off-pipeline | **complete** | Root cause of Codex input-size failures: running from /home/seadmin (home git repo with hundreds of cache-file changes) instead of /home/seadmin/golf. Fix: explicit cd + --scope working-tree. Enabled scoped adversarial review that caught F1 + F2 plan findings. Pattern documented in doc 13. |

---

## 2. Shipped this session

**Committed (6 commits, all local):**

| SHA | Description |
|---|---|
| cc87bea | SOD 2026-05-08: Phase 7 Day 2 — Skins sweep + SCORECARD-DECISIONS-WIRING |
| 454724d | Phase 7 Skins sweep: Explore + Plan + codex review; close SCORECARD-DECISIONS-WIRING |
| effb63d | Phase 7 sweep: Skins aggregateRound cutover (Wolf-pilot pattern) |
| 2c8251f | Session log: Skins sweep Develop EOD entry |
| b528b52 | Phase 7 Nassau aggregateRound cutover (payouts.ts case 'nassau') |
| 3a09d79 | Phase 7 Stroke Play aggregateRound cutover (payouts.ts case 'strokePlay') |

**EOD commit (15-eod.md + rolling eod.md update):** pending — committed at EOD close.

**Deployed:** not applicable — local PM2 only, no remote.

**Items closed:** SCORECARD-DECISIONS-WIRING (parking lot), Skins sweep, Nassau sweep, Stroke Play sweep. All four active `payouts.ts` bet types now on `aggregateRound`.

---

## 3. In progress (carryover)

- **WF7-4 — Cowork visual verification (Wolf pilot):** Not started. Pending GM scheduling. Code has no action until Cowork findings arrive.
  - State: waiting for GM scheduling decision
  - Next step: GM schedules → Cowork runs wolf-skins-multibet round → Code triages and closes WF7-4

- **NA-5 — Nassau Cowork visual verification:** Not started. Same blocker.
  - State: NA-4 Playwright green; waiting for Cowork scheduling

- **perHoleDeltas.ts cutover:** Deferred from WF7-2 (May 7), still open. The only remaining Phase 7 #11 work after today's main sweep.
  - State: structurally independent of today's payouts.ts slices
  - Estimate: single session (S)

---

## 4. Blocked

- **WF7-4 (Cowork):** Blocked on Cowork scheduling — GM decision.
- **NA-5 (Nassau Cowork):** Blocked on Cowork scheduling — GM decision.
- **Phase 7 #11 closure:** Blocked on perHoleDeltas.ts cutover and WF7-4 Cowork.

---

## 5. Codebase changes

**Files added (net new, not counting docs):** none.

**Files significantly modified:**

| File | Change |
|---|---|
| `src/lib/payouts.ts` | Skins, Nassau, Stroke Play cases all replaced with aggregateRound orchestration. GR8 guard on each. Stroke Play adds F1 attribution pre-check. |
| `src/lib/payouts.test.ts` | SP1-SP10 (Skins), NP1-NP10 (Nassau), STP1-STP11+STP5b (Stroke Play) added. 658 → 762 (+104 tests). |
| `src/bridge/skins_bridge.ts` | 1-char: `export function buildSkinsCfg` (was private; needed for GR8 guard). |
| `src/bridge/stroke_play_bridge.ts` | 1-char: `export function buildSpCfg` (was private; same reason). |
| `IMPLEMENTATION_CHECKLIST.md` | SCORECARD-DECISIONS-WIRING closed (parking-lot entry marked `[x]`). |

**Test surface:**

| Gate | Before today | After today |
|---|---|---|
| Vitest | 658 tests (post-WF7-2/WF7-3) | 762 tests (+104: SP+NP+STP series) |
| Playwright E2E | 5 specs, 5/5 green | 5 specs, 5/5 green throughout (unchanged) |
| tsc --noEmit | clean | clean |

**Dependencies added/removed:** none.

**Schema changes:** none.

---

## 6. Updates to CLAUDE.md or templates

- **CLAUDE.md changes:** none this session. Instruction-health touch (Codex CWD discipline, stale ref cleanup, AGENTS.md pointer) queued for tomorrow.
- **Template changes:** none.
- **New parking-lot item (Nassau buildHoleState gap):** Filed during Nassau Develop (doc 09). `buildHoleState` maps absent scores to `gross=0`, not `undefined`. Nassau's forfeiture path checks for `gross===undefined` and never fires via the bridge path. Incomplete scorecards silently tie instead of forfeiting in Nassau. Correctness issue; not blocking today's sweep work.

---

## 7. Cowork queue for next session

*(No changes from yesterday's queue — Cowork has not been scheduled.)*

| Component | What to verify | When |
|---|---|---|
| Wolf wizard — "Tied hole" pills | "No pts" default; "Carry" selectable; persists through round creation | WF7-4 Cowork session |
| Wolf + Skins multi-bet round | WolfDeclare panel; BetDetailsSheet (both games); per-hole deltas; zero-sum | WF7-4 Cowork session |
| Results page — multi-bet | Wolf + Skins combined totals; Money Summary amounts; Game Breakdown | WF7-4 Cowork session |
| Nassau UI (NA-2/NA-3 features) | Press rule pills, press modal, presses confirmed, per-hole Nassau deltas | NA-5 Cowork session (can share WF7-4 session) |

---

## 8. Pipeline drift check

| Metric | Value |
|---|---|
| Items in SOD Today | 3 (SCORECARD-DECISIONS-WIRING, Skins cutover, WF7-4+NA-5 status) |
| Completed from Today | 3 / 3 (100%) |
| Items added off-pipeline | 3 (Nassau cutover, Stroke Play cutover, Codex tooling resolution) |
| Day +1-2 items pulled to today | 1 (Nassau cutover; was Day +1-2 item #3 in SOD) |
| Day +3-5 items pulled to today | 1 (Stroke Play cutover; was Day +3-5 item #1 in SOD) |
| Today items pushed back | 0 |

**Pipeline pull-in analysis:**

Nassau was Day +1-2 (#3) in today's SOD. Stroke Play was Day +3-5 (#1). Both executed today, compressing a 5-day pipeline into 2 sessions across 2 days (yesterday's Wolf pilot + today's three-bet sweep).

**Pattern match with 2026-05-07:** Identical to yesterday's pull-in structure — Day +1-2 and Day +3-5 items both collapsed into the same session after approval gates cleared faster than staged. Yesterday: WF7-1 (Day+1-2), WF7-2+WF7-3 (Day+3-5). Today: Nassau (Day+1-2), Stroke Play (Day+3-5).

**Is this healthy?** Same assessment as yesterday — yes. The SOD correctly staged conservatively to protect against gate friction that didn't materialize. The pattern is consistent: the approval-gate structure assumes gates take a day each; when gates clear within hours and the work is scoped correctly, pull-ins are the natural result. No scope creep occurred; every pull-in was a planned Phase 7 #11 slice in its intended order.

**Remaining pipeline drift risk:** perHoleDeltas.ts cutover (Day +3-5 item #2) was NOT pulled in today. It is the only remaining #11 code work and is correctly queued for tomorrow's consideration. WF7-4 and NA-5 remain correctly Cowork-gated (Code has no action to pull in).

---

## 9. Instruction-health notes for GM

**Stale references (carry from yesterday, still open):**
- CLAUDE.md §project-structure: `nassau-flow.spec.ts` gap comment is stale (NA-4 closed it). Minor.
- AGENTS.md "Current item" pointer: was updated to NA-5 context; should now point to Phase 7 #11 / WF7-4. Low priority; IMPLEMENTATION_CHECKLIST.md is authoritative.
- IMPLEMENTATION_CHECKLIST.md header (line 5): "Active item: WF7-4 (Cowork verification)" — correct for Cowork gate; "Phase 7 sweep" no longer shows Skins/Nassau/SP as pending. Consider updating to reflect main sweep complete.

**New items from today:**
- **Codex CWD discipline** (new): Codex adversarial-review fails with "Input exceeds maximum length" when run from `/home/seadmin` (home git repo). Fix: always `cd /home/seadmin/golf` before calling codex-companion. Add `--scope working-tree` for small working trees. Document in CLAUDE.md §"Codex usage notes" at next instruction-health touch.
- **buildHoleState 0-vs-undefined gap** (new, Nassau): Filed as parking-lot item during Nassau Develop (doc 09). Significant correctness issue — incomplete scorecards in Nassau silently tie rather than forfeit. Separate slice required; not in Phase 7 #11 scope.

**Ground-rule audit:**
- GR1-GR8 all verified by reviewer sub-agent on each of three sweep slices.
- F1 guard on Stroke Play is a deliberate strengthening vs Wolf/Skins `??{}` patterns — not a violation. Stroke Play's `??{}` fallback is genuinely reachable (FieldTooSmall, empty rounds), so the explicit pre-extraction attribution loop makes the semantics unambiguous and fail-closed.
- Skins escalating=false test fixture lesson (SP4-SP7 fix): documented. Future sweep tests should check flag semantics before writing fixtures.

---

## 10. Tomorrow's seed

### Carryover (blocked on Cowork scheduling — GM decision)

- **WF7-4 (Cowork):** Awaiting GM scheduling. No Code work until Cowork findings arrive.
- **NA-5 (Nassau Cowork):** Same. Can share a Cowork session with WF7-4 or run separately.

### Phase 7 #11 remaining work

**perHoleDeltas.ts cutover** — the only remaining #11 code work. Deferred from WF7-2 (May 7). Structurally independent of today's payouts.ts slices. Single session, medium complexity. File path: `src/lib/perHoleDeltas.ts`. Pattern: same aggregateRound cutover approach; compound-key handling similar to Nassau if perHoleDeltas has per-bet bucketing. Recommend: Explore first (read the current dispatch shape), then Plan, then Develop.

### Parking-lot items to address (separate slices)

- **Nassau buildHoleState 0-vs-undefined gap:** `buildHoleState` maps absent/0 scores to `gross=0` (not `undefined`). Nassau engine's forfeiture path (`grossA === undefined`) never fires via the bridge. Incomplete scorecards silently tie instead of forfeit. Correctness issue. Requires a Nassau-specific HoleState builder extension or a buildHoleState update with Nassau-aware mapping. Recommend: scope as a single Explore+Develop slice after perHoleDeltas closes.

### Instruction-health (one prompt, low urgency)

- CLAUDE.md §"Codex usage notes": document Codex CWD discipline (`cd /home/seadmin/golf`, `--scope working-tree` for small trees).
- CLAUDE.md §project-structure: update nassau-flow.spec.ts gap comment (closed) and wolf-skins-multibet-flow spec (5th spec added WF7-3).
- AGENTS.md "Current item" pointer: update to reflect Phase 7 sweep complete; perHoleDeltas as next active item.

### Phase 8 lookahead (GM should think about this overnight)

After Phase 7 fully closes (perHoleDeltas + WF7-4 + NA-5), the next phase candidates are:

| Option | What it is | Rough size |
|---|---|---|
| Match Play unpark | Engine exists; bridge, wizard, E2E all absent | L |
| Junk Phase 3 | Sandy/Barkie/Polie/Arnie (stubs return null today) | M |
| F12 engine fix | Tied-withdrawal NassauWithdrawalSettled gap | XS-S |
| Verifier (Round-state verification agent) | Pure-function verifyRound tool (parking-lot item) | M |
| perHoleDeltas closure | Phase 7 #11 final slice (already queued) | S |

### Suggested Today items for next session

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | WF7-4 + NA-5 Cowork scheduling check | Phase 7 gate | XS | GM: has Cowork been scheduled? If findings available, Code triages + closes. If not, convert to backlog. |
| 2 | perHoleDeltas.ts cutover (Explore + Plan + Develop) | Phase 7 #11; deferred WF7-2 | S | Single-session slice. Explore the current dispatch shape before planning. |
| 3 | CLAUDE.md instruction-health touch | CLAUDE.md §instruction-health | XS | Codex CWD note, nassau-flow.spec.ts gap, AGENTS.md pointer. One commit. |

---

## Closing note

Phase 7 main sweep complete. Two-day arc: yesterday's Wolf pilot (WF7-0–WF7-3), today's three-bet sweep (Skins + Nassau + Stroke Play). All four active `payouts.ts` bet types now route through `aggregateRound`. The simplicity-as-trap framing validated: Stroke Play, the simplest slice on paper, required the most Codex iterations (3) and produced the most substantive guard improvement (F1 pre-extraction attribution check). perHoleDeltas.ts cutover is the sole remaining Phase 7 #11 code work.

*EOD filed 2026-05-08.*
