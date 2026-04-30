---
prompt_id: 001
date: 2026-04-29
role: researcher
checklist_item_ref: "GM context pull — read-only survey of planning docs and session logs"
tags: [researcher, gm-context, read-only]
---

# GM Context Pull — 2026-04-29

Read-only survey of planning docs, session logs, and git state. No file edits.

---

## 1. Planning Document Summaries

### STROKE_PLAY_PLAN.md

- **Status:** ACTIVE. Stroke-Play-only phase plan. Header note supersedes the SOD Apr27 "structurally complete" characterization; open fence-violation items and PF-2 correctness gates must close before the phase is done.
- **Phases:** SP-1 through SP-4 closed 2026-04-25. SP-6 closed 2026-04-25. SP-5 (verifier) deferred post-SP-4. Phase-end trigger is SP-4 §4 manual browser playthrough — this condition is **explicitly unmet** (see SP-4 closure note at §3 and PF-2 scope).
- **PF-2 section (§3):** Six items in scope: PF-1-F3, PF-1-F4 (a+b), PF-1-F5A, PF-1-F6, and the SP-4 §4 manual playthrough. F3/F4/F5A/F6 all have code committed as of 2026-04-27 (see §3 below). The manual playthrough remains the last unmet gate.
- **§7 Deferred Decisions:** Eleven decisions explicitly deferred until after SP-4 closes: A (Skins UI player count), B (Skins rule-doc scope), C (#11 gate validation method), D (Match Play sequence position), E (Match Play format toggle), F (Stroke Play beyond Option α Minimal), Junk architecture (Alt A vs B), Junk §11 event schema, Junk §4 formula, ctpWinner data model, Nassau allPairs v1 scope. None of these are in-scope now.
- **Out-of-scope drift (§8):** Four items noted in authoring: computeMatchPlay algorithm divergence, computeNassau 2-player assumption, src/lib/handicap.ts active caller, scorecard-playoff silent fallthrough in finalizeStrokePlayRound. These are not active tasks.

### IMPLEMENTATION_CHECKLIST.md

- **Active item text (verbatim):** "PF-2 correctness cluster + SP-UI fence-violation fixes." This text is **stale** — all SP-UI items (SP-UI-1/2/3) and all PF-2 code items (PF-1-F3/F4/F5A/F6) have committed code as of 2026-04-27 (see §3). The active item has not been updated to reflect this.
- **IMPL Checklist open `[ ]` items in Parking Lot that are in-scope now:**
  - SP-UI-1, SP-UI-2, SP-UI-3: still marked `[ ]` in the parking lot — not moved to `[x]` or Done. Code committed.
  - PF-1-F3, PF-1-F4, PF-1-F5A, PF-1-F6: still marked `[ ]` — not moved to `[x]` or Done. Code committed.
  - F9-a-HOLE18-RACE: `[ ]` open, filed 2026-04-27, commit 51660c4.
  - PUT-HANDLER-400-ON-MISSING-FIELDS: `[ ]` backlog, filed 2026-04-27, commit 51660c4.
- **Design timeline:** Phase 5 (Stroke-Play-only UI phase) is listed as "done" in the timeline table, but the SP-4 §4 manual playthrough is still unmet. The timeline is inconsistent with plan §3 PF-2.
- **Checklist hygiene note:** The active item, parking lot `[ ]`→`[x]` closures for all Apr27 items, and the Done section entries for SP-UI-1/2/3 and PF-2 items have not been written. This is a grooming backlog.

### REBUILD_PLAN.md

- **Header status note (authoritative summary, added 2026-04-25):** #3–#8 complete; #9 elevated to SP-6 (closed); #10 closed 2026-04-26; #11 superseded for Stroke-Play-only phase (full cutover deferred until third bet unparks); #12 split (happy-path in SP-2/SP-3, edge cases deferred).
- **Done items:** #3 (Wolf follow-ups, 2026-04-20), #4 (bet-id refactor, 2026-04-20), #5 (Nassau engine, 2026-04-22), #6 (Match Play engine, 2026-04-24), #7 (Junk Phases 1–2, 2026-04-24), #8 (aggregate.ts, 2026-04-24), #9 (GAME_DEFS as SP-6, 2026-04-25), #10 (Float→Int, 2026-04-26).
- **Active/deferred items:** #11 deferred (full multi-bet cutover; resumes when third bet unparks); #12 split (edge cases deferred with parked bets).
- **Status:** REBUILD_PLAN.md is now a history document. No action items in it are current work. The header note is the authoritative summary.

### AUDIT.md

A 2026-04-20 classification of the 19 MIGRATION_NOTES items (11 Fixed, 8 Open at that date) that served as the origin document for REBUILD_PLAN.md. All items it named as Open have since been addressed (engines built, #10 Float→Int closed, GAME_DEFS cleaned). AUDIT.md is reference-only; no open action items remain in it. The "Cross-cutting carryover to cutover (backlog #3)" section still applies to #11 (full cutover), but that is tracked in STROKE_PLAY_PLAN.md.

---

## 2. Recently Modified .md Files (Last 3 Days)

Files from `find -mtime -3`, excluding node_modules and .next. "Uncommitted" = newer than HEAD.

| Path | One-line purpose | Active artifact or session log | Committed? |
|---|---|---|---|
| `2026-04-27/001_COWORK_TRIAGE_27-April-2026.md` | Cowork walkthrough triage F1–F10 researcher pass | Session log | Yes (b880e1d) |
| `2026-04-27/002_DOCUMENTER_PASS_27-April-2026.md` | Encoding triage decisions into checklist/plan | Session log | Yes (b880e1d) |
| `2026-04-27/003_SP_UI_1_27-April-2026.md` | SP-UI-1 engineer session log | Session log | Yes (b880e1d) |
| `2026-04-27/004_COMMIT_SEQUENCE_27-April-2026.md` | Commit sequence meta log (commits 1–3) | Session log | Yes (778bb99) |
| `2026-04-27/005_F4_PHASE_A_VERIFICATION_27-April-2026.md` | PF-1-F4 phase (a) type-contract verification | Session log | Yes (b880e1d) |
| `2026-04-27/006_BATCH_RUN_SUMMARY_27-April-2026.md` | Batch run meta summary | Session log | Yes (b880e1d) |
| `2026-04-27/007_PF1_F4_PHASE_B_27-April-2026.md` | PF-1-F4 phase (b) engineer session log | Session log | Yes (e5a8de3) |
| `2026-04-27/008_F9_A_27-April-2026.md` | F9-a par-default engineer session log | Session log | Yes (ba2cf9e) |
| `2026-04-27/009_BOOKKEEPING_27-April-2026.md` | Bookkeeping: F9-b closure, F4 AC revision | Session log | Yes (011ca8b) |
| `2026-04-27/010_PF1_F6_27-April-2026.md` | PF-1-F6 results page hydration session log | Session log | Yes (941a858) |
| `2026-04-27/011_F3_DIAGNOSIS_27-April-2026.md` | F3 v1 diagnosis (not reproducible) | Session log | Yes (645cc61) |
| `2026-04-27/012_F3_DIAGNOSIS_V2_27-April-2026.md` | F3 v2 diagnosis (PM2 restart storm + payload race) | Session log | Yes (481ad90) |
| `CLAUDE.md` | Agent/workflow configuration for this repo | Active artifact | **NO — uncommitted** |
| `docs/plans/STROKE_PLAY_PLAN.md` | Active phase plan (Stroke-Play-only) | Active artifact | Yes (d2ef5b0) |
| `docs/proposals/2026-04-27-cowork-triage.md` | Cowork triage proposal/findings document | Session artifact | Yes (d2ef5b0) |
| `docs/sessions/2026-04-26/002_PF1_TURN1_SCHEMA_MIGRATION.md` | PF-1 Turn 1 schema migration session log | Session log | Yes |
| `docs/sessions/2026-04-26/003_PF1_TURN2_API_ROUTES.md` | PF-1 Turn 2 API routes session log | Session log | Yes |
| `docs/sessions/2026-04-26/004_PF1_TURN3_UI_WIRING.md` | PF-1 Turn 3 UI wiring session log | Session log | Yes |
| `EOD_26-April-2026.md` | Rolling EOD log for April 26 | EOD log | Yes |
| `EOD_27-April-2026.md` | Rolling EOD log for April 27 | EOD log | Yes (481ad90) |
| `IMPLEMENTATION_CHECKLIST.md` | Single source of truth for scope | Active artifact | Yes (51660c4, last touch) |

**Note on CLAUDE.md:** The working-tree CLAUDE.md has been substantially rewritten since commit 51660c4. The new content introduces a DevFlow chain-of-command structure (GM / Code / Cowork), a 4-phase rule for every prompt, SOD/EOD/FINAL EOD procedures, and project conventions (stack, test commands, hosting details via Tailscale). The old content is preserved below a "Preserved from prior CLAUDE.md" divider with `@AGENTS.md` include. This is a significant uncommitted change.

---

## 3. Identifier Status from Session Logs (2026-04-25 through 2026-04-27)

### 2026-04-25 identifiers

| Identifier | Status | Notes |
|---|---|---|
| SP-1 | Closed | Session: `SP1_STROKE_PLAY_RULE_DOC_CHECK_25-April-2026.md`. 9 findings, none blocking. Rule-doc edits in `SP1_RULE_DOC_EDITS_25-April-2026.md`. |
| SP-2 | Closed | Session: `SP2_STROKE_PLAY_BRIDGE_25-April-2026.md`. `buildStrokePlayHoleState` exported from `src/bridge/stroke_play_bridge.ts`. 316 tests. |
| SP-3 | Closed | Session: `SP3_SP4_BRIDGE_CUTOVER_25-April-2026.md`. `settleStrokePlayBet` + `payoutMapFromLedger` exported. 326 tests. |
| SP-4 | Closed (programmatic only) | Same session as SP-3. `computeStrokePlay` deleted; grep gate zero. Browser verification deferred; carried as PF-2 gate. |
| SP-5 | Deferred | Deferred post-SP-4. Parked to STROKE_PLAY_PLAN.md §3 SP-5. |
| SP-6 | Closed | Session: `SP6_GAMEDEFS_PARK_25-April-2026.md`. 8 GAME_DEFS entries marked `disabled: true`; GameList.tsx filter added. 307 tests. |
| #10 (Float→Int) | Closed | 2026-04-26 session: `2026-04-26/001_M1_PRISMA_FLOAT_INT_CENTS.md`. SideBet/SideBetResult also dropped. 348 tests. |

### 2026-04-26 identifiers

| Identifier | Status | Notes |
|---|---|---|
| PF-1 | Closed | Session: `docs/sessions/2026-04-26/004_PF1_TURN3_UI_WIRING.md`. Three turns: schema+migration, API routes, scorecard hydration. 348/348 tests. 15 smoke-check substeps pass. |

### 2026-04-27 identifiers

| Identifier | Status | Commit hash | Notes |
|---|---|---|---|
| SP-UI-1 | Closed | cd6ec99 | `GameInstanceCard.tsx` junk section wrapped in `game.type !== 'strokePlay'` guard. 348/348 tests. IMPL checklist `[ ]` not yet updated to `[x]`. |
| SP-UI-2 | Closed | 647520f | `ScoreRow.tsx` DotButtons gated behind `showJunkDots` prop. 348/348 tests. IMPL checklist `[ ]` not updated. |
| SP-UI-3 | Closed | ab0f3b1 | `page.tsx:88` date rendering fixed with `timeZone: 'UTC'`. 348/348 tests. IMPL checklist `[ ]` not updated. |
| PF-1-F3 | Closed (no code defect) | 645cc61, 481ad90 | v1: not reproducible (transient). v2: two root causes — PM2 restart storm (~16/17 failures) + `gross: undefined` payload on round 12 hole 18 (1/17 failure). No PUT handler defect. Ops fix documented. IMPL checklist `[ ]` not updated. |
| PF-1-F4 (a) | Closed | debd931 | Type-contract verification: chain INCONSISTENT; Int→String mismatch at `roundStore.ts:262`; two files need changing. Not a one-liner. |
| PF-1-F4 (b) | Closed | 25839a9 | `api/rounds/route.ts:66` populates `playerIds` from `playerRecords`; `roundStore.ts:262` fixes Int→String cast. 348/348 tests. IMPL checklist `[ ]` not updated. Full closure pending SP-4 §4 manual playthrough. |
| PF-1-F5A | Closed | 5c36797 | `bets/[roundId]/page.tsx` backHref reads from `useParams().roundId`. 348/348 tests. IMPL checklist `[ ]` not updated. |
| PF-1-F6 | Closed | 6150ba8 | Results page gets `useEffect` + `hydrateRound` + loading guard, same pattern as scorecard. 348/348 tests. IMPL checklist `[ ]` not updated. |
| F9-a | Closed | 108e629 | Par written to Zustand on hole mount via `useEffect`; Save & Next enabled without user interaction. 348/348 tests. IMPL checklist marked `[x]`. F9-b closed-not-opened per 009 bookkeeping eval. |
| F9-a-HOLE18-RACE | Open | filed via 51660c4 | F9-a useEffect may race with Finish Round save on hole 18; one `gross: undefined` observed in F3 v2 diagnosis. Investigation needed. |
| PUT-HANDLER-400 | Open (backlog) | filed via 51660c4 | PUT handler surfaces `PrismaClientValidationError` as 500; should return 400 with message. Low priority. |
| SP-4 §4 manual playthrough | Open | — | Never done. Required to formally close PF-2 and the Stroke-Play-only phase. Requires browser session. |

---

## 4. State Summary

### Current active checklist item

**Verbatim (IMPLEMENTATION_CHECKLIST.md Active item):**
> "PF-2 correctness cluster + SP-UI fence-violation fixes."
> [Sub-text]: "SP-UI items (fence enforcement per §1e, dispatchable independently of PF-2)... PF-2 cluster (end-to-end correctness gates): PF-1-F4 phase (a) is the next action... PF-2 AC: bets and results pages render correctly for a completed Stroke Play round in the browser; SP-4 §4 manual-playthrough condition is met."

This text was written 2026-04-27 when the work started. It is now outdated — most of the named items have landed.

### Identifiers open and in-scope right now

1. **SP-4 §4 manual browser playthrough** — The last unmet gate for PF-2 and for the Stroke-Play-only phase to close. Requires: full 18-hole Stroke Play round on the running dev server, `appliesHandicap: true`, correct settlement on the results page, zero-sum verified by inspection. No code blocker; requires a browser session.
2. **F9-a-HOLE18-RACE** — Investigation needed: did the F9-a `useEffect` reliably fire on hole 18, or can a page-refresh + late-hydration window still produce `gross: undefined`? One confirmed instance (round 12 hole 18 from F3 v2 diagnosis). Filed 2026-04-27 commit 51660c4.
3. **IMPL checklist grooming** — SP-UI-1/2/3 and PF-1-F3/F4/F5A/F6 are all `[ ]` in the parking lot but their code is committed and done. The active item text, parking lot closures, Done section additions, and design timeline row for Phase 5 all need updating. Not a blocker for the playthrough.
4. **CLAUDE.md uncommitted** — The working tree has a substantially rewritten CLAUDE.md (DevFlow structure + project conventions). This is the only uncommitted change in the repo. Not a blocker, but the start-of-day catch-up commit gate applies.

### Identifiers open but parked / deferred

| Identifier | Parked to / unblock trigger |
|---|---|
| SP-5 (verifier) | Post-SP-4 closure; researcher pass required before any engineer work |
| D1 sub-task B (Nassau §9 N35 tied-withdrawal) | Two open questions on implementation correctness and I3 decision provenance; Nassau unparks |
| D2 (Junk §5 multi-winner annotation) | #7b Phase 3 landing |
| D4 (Nassau §7 junk annotation) | Nassau bridge prompt; independent of engine work |
| #11 (full multi-bet cutover) | Third bet unparks; operator decision |
| §7 Decisions A–F, Junk architecture, Junk §11/§4, ctpWinner, Nassau allPairs v1 | Each deferred to the corresponding bet's bridge prompt |
| F9-b (visual affordance for par-default state) | Closed-not-opened per 009 bookkeeping; no longer applicable after F9-a landed |
| Bridge hardcodes (`appliesHandicap: true`, `junkMultiplier: 1`) | Option β/γ scope expansion; junk re-entering Stroke Play scope |
| Course schema slope/rating granularity | Course integration phase |
| Backlog section header drift in IMPL checklist | Next grooming pass |
| resolve/[hole]/page.tsx:69 bare template literal | Junk display surfaces next touched |
| Various future-bucket items (auth, friends list, main screen, late-arrival handling) | Separate operator scoping |

### Pending operator decisions blocking forward progress

**Only one item is currently blocking forward progress:**

1. **SP-4 §4 manual playthrough (operator/developer action):** Someone needs to sit at a browser, run a full 18-hole Stroke Play round on the dev server (port 3000, basePath /golf), confirm correct settlement on the results page, and record it. This is the last gate before PF-2 can be declared closed and the Stroke-Play-only phase ends. No code is needed first. Note: the production server at port 3000 is running an Apr26 12:39 build — all Apr27 code changes (F4, F5A, F6, SP-UI-1/2/3, F9-a) are NOT yet deployed. The production server needs `pm2 stop golf && npm run build && pm2 start golf` before a valid playthrough can be done on the Cowork host. The dev server (port 3001) would have current code if still running.

**No other pending operator decisions block forward progress** toward the remaining open in-scope items. All other §7 deferred decisions are post-SP-4.

### Commit 3 from 004_COMMIT_SEQUENCE — did it land?

**Yes.** The 004 log recorded commit 3 as "pending operator approval." Commit `778bb99` ("Session logs and EOD for 2026-04-27") is in the git log immediately after `cd6ec99` (commit 2). Commit 3 landed. The `⏸` status in EOD_27 row 004 is stale.

### PF-1-F3 — is anything still owed?

F3 is closed as a code issue (no defect found). Two items remain as open ops observations:

1. **Production server rebuild required:** The server at port 3000 (the Cowork host nginx target) is running a stale Apr26 12:39 build. All Apr27 code changes are not live. This must be done before the SP-4 §4 manual playthrough on the Cowork host. Procedure: `pm2 stop golf && npm run build && pm2 start golf` (documented in commit 51660c4; per F3 v2 ops recommendation).
2. **F9-a-HOLE18-RACE:** One `gross: undefined` payload was observed for round 12 hole 18 during the rebuild walkthrough. This may be a hydration-timing race on the last hole that F9-a's `useEffect` doesn't fully prevent. Filed as an open investigation item (commit 51660c4). Not currently blocking the playthrough, but could cause a 500 if it recurs.

---

## 5. Additional Documents GM Should Be Aware Of

### CLAUDE.md — DevFlow rewrite (uncommitted)

The working-tree CLAUDE.md has been rewritten since the last commit. The new sections establish a "DevFlow" structure — explicitly naming GM (Claude App), Code (Claude Code), and Cowork as the three roles; defining a 4-phase prompt rule (Explore/Plan/Develop/Report); SOD/EOD/FINAL EOD procedures with what each produces; and GM reporting conventions. Project conventions (stack, test count at 307, hosting via Tailscale at 100.71.214.25/golf) are also added inline.

The old CLAUDE.md content (session-logging, commit practice, scope/focus, agent routing, active phase note) is preserved verbatim below a "Preserved from prior CLAUDE.md (2026-04-29)" divider. The `@AGENTS.md` include is retained.

This is the only uncommitted change in the working tree. The start-of-day catch-up commit gate applies at the next session start.

### AGENTS.md — current item text is stale

`AGENTS.md` line 21 reads: "Current item: SP-6 (GAME_DEFS cleanup + GameList filter)." SP-6 closed 2026-04-25. The AGENTS.md current item should be updated to match the current active item (PF-2 / manual playthrough). AGENTS.md is in the "do not touch" list in CLAUDE.md, so this update requires explicit operator authorization; flagging for awareness only.

### docs/proposals/2026-04-27-cowork-triage.md

The Cowork triage proposal document authored 2026-04-27 (committed in d2ef5b0). This is the source artifact for the decisions encoded into IMPLEMENTATION_CHECKLIST.md and STROKE_PLAY_PLAN.md during the Apr27 documenter pass. It contains the full F1–F10 findings, pushback responses, dispatch order, and plan-document impact section. Active reference for anyone replaying the Apr27 triage.

### docs/proposals/ directory — five other proposals

Five proposals under `docs/proposals/` are not directly referenced in the active plan but are the documented reasoning behind the Stroke-Play-only phase decisions:
- `bridge-file-structure.md` — bridge file location decision (SP-2)
- `junk-architecture-evaluation.md` — Alternative A vs B for junk Phase 3; deferred decision in §7
- `pending-items-evaluation.md` — source for §7 Decisions A–F
- `stroke-play-only-scoping.md` — source for §2 Option α Minimal and §1 park definitions
- `ui-first-reframe.md` and `ui-first-reframe-sod.md` — the original reframe that produced this plan

These are not active work items; they are the reasoning record behind the current plan.

### IMPLEMENTATION_CHECKLIST.md — Backlog section header drift (flagged item)

A parking-lot entry (filed 2026-04-26) notes that the Backlog section header sentence "Items D1–D4, #9, #10 carry forward" is stale: #10 closed 2026-04-26, #9 elevated to SP-6 and closed 2026-04-25, D1/D3 are closed or withdrawn. This has been flagged twice without being fixed. Worth addressing in the next grooming pass.
