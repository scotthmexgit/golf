# Cowork Walkthrough Triage — 2026-04-27

**Researcher pass.** No code changes. No edits to plan/checklist artifacts.  
**Input:** Cowork walkthrough report (2026-04-27, round id=9, Alice + Bob, Stroke Play $5/hole, Chambers Bay 18 holes).  
**Authority:** `docs/plans/STROKE_PLAY_PLAN.md` (ACTIVE) supersedes the SOD April 27 "structurally complete" characterization, which is stale.

---

## Summary

Two fence violations (F1, F2): the Stroke Play game card exposes a fully wired junk picker and the scorecard exposes per-player junk event buttons; both violate STROKE_PLAY_PLAN.md §1e explicitly. Four in-scope bugs (F3, F4, F5, F6): score PUTs return 503 (server-level, code not confirmed broken); game is persisted with `playerIds: []` (hardcode in `api/rounds/route.ts:66`, documented as a known limitation at PF-1 close but with impact badly underestimated); bets and results pages render empty/broken state as downstream consequences of F3+F4. Two additional in-scope bugs: F7 (date off by one day, timezone arithmetic) and F9 (Save & Next Hole gating, already in checklist line 74). F8 (RSC prefetch 503s) defers as infrastructure backlog. F10 defers — insufficient coverage. F3–F6 are causally linked with F4 as primary driver of the engine crash; F3 is an independent parallel failure. **PF-1 closure does not hold for end-to-end correctness.** The `playerIds: []` known limitation was micharacterized at PF-1 close as "not a regression for the current product surface"; it in fact crashes `computeAllPayouts` via `StrokePlayConfigError`, making both the bets and results pages non-functional for any Stroke Play round.

---

## Per-finding triage

### F1 — Junk / Side Bets picker exposed inside Stroke Play bet config

**Classification: Fence violation (must fix in current phase)**

Fence sentence from STROKE_PLAY_PLAN.md §1e: *"No junk side bets are wired, displayed, or settable on Stroke Play rounds."*

The junk section in `GameInstanceCard` is rendered unconditionally. Every other game-specific block in the same component carries a game-type guard (`game.type === 'matchPlay'`, `game.type === 'skins'`, etc.); the junk block at lines 121–162 does not.

**Evidence:** `src/components/setup/GameInstanceCard.tsx:121` — `{/* Junk / Side Bets — collapsible */}` block through line 162 has no surrounding `game.type !== 'strokePlay'` condition. The guard pattern is established at lines 51, 65, 77, 84, 98 for other game-specific sections and is simply absent for junk.

**Proposed checklist item:**
> SP-UI-1 — Wrap the Junk/Side Bets section in `GameInstanceCard.tsx` (lines 121–162) in a `game.type !== 'strokePlay'` guard. No other changes in this item. Fence: `src/components/setup/GameInstanceCard.tsx` only. AC: Stroke Play card shows no Junk section; all other game cards continue to show it.

**Causal chain:** F1 is not causally upstream of F3–F6. The junk picker can be toggled but: (a) junk config defaults are all false, so `hasAnyJunk` is false and junk payouts are $0; (b) `game.playerIds = []` means junk detection in `detectNotices` is suppressed anyway. F1 is a UI surface violation only.

**New sub-item or fold into existing?** New sub-item required. SP-6 covers `GameList.tsx` filter; it does not touch `GameInstanceCard.tsx`. No existing SP-x item covers this.

---

### F2 — Per-player junk event buttons exposed on Stroke Play scorecard

**Classification: Fence violation (must fix in current phase)**

Fence sentence from STROKE_PLAY_PLAN.md §1e: *"No junk side bets are wired, displayed, or settable on Stroke Play rounds."*

The four `DotButton` renders in `ScoreRow` are unconditional: Sandy, ChipIn, ThreePutt, and OnePutt buttons appear on every player row regardless of whether any active game has junk enabled.

**Evidence:** `src/components/scorecard/ScoreRow.tsx:70-73` — four `<DotButton>` renders for `sandy`, `chipIn`, `threePutt`, `onePutt` with no condition on `activeGames` or game type. The `activeGames` prop is already passed in (line 17) but never consulted for dot-button visibility.

**Proposed checklist item:**
> SP-UI-2 — In `ScoreRow.tsx`, wrap the four DotButton renders (lines 70–73) in a condition: render only when at least one active game has junk enabled (e.g., derive a boolean `showJunkDots` in the parent scorecard page — `games.some(g => hasAnyJunk(g.junk) && activeGameIds.includes(g.id))` — and pass as a new `showJunkDots: boolean` prop). Fence: `src/components/scorecard/ScoreRow.tsx` and `src/app/scorecard/[roundId]/page.tsx` only. AC: Stroke Play scorecard shows no junk dot buttons; a game with junk enabled does show them.

> **Pushback 2 — accepted (justified).** SP-UI-1 uses a direct `game.type !== 'strokePlay'` guard inside `GameInstanceCard` because `GameInstanceCard` receives a full `GameInstance` including `.type`. `ScoreRow` receives only `activeGames: string[]` (game IDs, not game types) — it has no access to game type information without threading more data in. The `showJunkDots` boolean derived in the parent is the appropriate boundary. In the current SP-only phase the `hasAnyJunk` condition always evaluates to **false** (no Stroke Play game has junk enabled by default), so behavior is functionally identical to a type guard for this phase. The `hasAnyJunk` form is forward-compatible: when a junk-enabled bet unparks, dots appear without touching `ScoreRow`. A type-guard alternative — `games.some(g => activeGameIds.includes(g.id) && g.type !== 'strokePlay')` — is also valid but narrower (would require updating when a non-strokePlay, non-junk game is added). Prop-threading with `hasAnyJunk` is preferred; type-guard alternative noted as viable.

**Causal chain:** F2 is not causally upstream of F3–F6. Dot state is written to Zustand (`setDot`) and checked in `detectNotices` (threePutt → snake detection), but since no Stroke Play game has `junk.snake = true`, the notice path is a no-op. The dots are also passed to junk payout computation but `hasAnyJunk` is false for default junk config, so no payout fires. F2 is a UI surface violation only.

**New sub-item or fold into existing?** New sub-item required. No existing SP-x item covers `ScoreRow.tsx` junk visibility. Cannot fold into SP-UI-1 (different file, different flow, different fix location).

---

### F3 — Every per-hole score PUT returns 503

**Classification: In-scope bug (must fix in current phase)**

Scope: PF-1 AC Step 4 requires `PUT /golf/api/rounds/{id}/scores/hole/{hole}` to return 204. The Cowork walkthrough shows all 18 return 503.

**Evidence: Code not located in one-pass grep.** The route implementation at `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts` looks correct: validates path params, validates round existence, validates player membership, wraps upserts in a `prisma.$transaction`. No code path in the route itself returns 503. The 503 is a Next.js-level response for an unhandled server error (likely Prisma/database failure). Server logs are required to identify the specific exception. No application code for this failure was findable in one grep pass.

**PF-1 smoke check comparison:** PF-1 Turn 2 step d and Turn 3 step c both recorded PUT returning 204. The smoke checks passed programmatically on 2026-04-26. The Cowork session is 2026-04-27. The 503 may indicate the dev server's database is not in the same state (migration not applied to running server, or DB connection issue). This is not a code regression from PF-1; it is a deployment/environment state problem.

**Proposed checklist item:**
> PF-1-F3 — Diagnose PUT 503s on Cowork host. Steps: (1) check dev server logs for the exception thrown in the score PUT route at the time of the Cowork session; (2) verify the Prisma migration for `Score.@@unique` was applied (`npx prisma migrate status`); (3) confirm `prisma db push` or `migrate deploy` was run after the M-1 Float→Int migration; (4) if DB issue confirmed, fix and re-verify PUT returns 204 for a fresh round.

**Causal chain:** F3 is causally upstream of F5 and F6 (no scores persisted → bets page empty state, round stays InProgress). F3 does NOT cause F4 (they are independent root causes). See Causal Chain Analysis section.

---

### F4 — Stroke Play game persisted with `playerIds: []`; client throws `StrokePlayConfigError`

**Classification: In-scope bug (must fix in current phase)**

This item was documented at PF-1 close (IMPLEMENTATION_CHECKLIST.md line 116) as a known limitation with the assessment: *"Not a regression for the current product surface (Stroke Play has junk empty; other bets are parked), but becomes a bug when any bet with junk is unparked."* That assessment is incorrect. The walkthrough shows `playerIds: []` triggers `StrokePlayConfigError` from `assertValidStrokePlayCfg`, which is called during every `computeAllPayouts` invocation involving a non-empty holes array. This crashes the bets and results pages at render time.

**Evidence:**
- Root cause: `src/app/api/rounds/route.ts:66` — `playerIds: [],` hardcoded in the `games.create` block. The `g.playerIds` from the wizard payload is ignored.
- Crash path: `src/app/results/[roundId]/page.tsx:13` and `src/app/bets/[roundId]/page.tsx:12` both call `computeAllPayouts(holes, players, games)`.
- `src/lib/payouts.ts:135` — `case 'strokePlay'` calls `settleStrokePlayBet(holes, players, game)`.
- `src/bridge/stroke_play_bridge.ts:35` — `playerIds: game.playerIds` (i.e. `[]`) passed into `buildSpCfg`.
- `src/bridge/stroke_play_bridge.ts:70` — `settleStrokePlayHole(state, cfg, roundCfg)` is called per hole.
- `src/games/stroke_play.ts:163` — `settleStrokePlayHole` calls `assertValidStrokePlayCfg(config)`.
- `src/games/stroke_play.ts:81-82` — throws `StrokePlayConfigError('playerIds', 'length must be 2..5')` when `playerIds.length < 2`.
- Also: `src/games/stroke_play.ts:214` — `finalizeStrokePlayRound` also calls `assertValidStrokePlayCfg`, meaning even with empty holes the crash fires.

**Proposed checklist item:**
> PF-1-F4 — Two phases:
>
> **(a) Type-contract verification (prerequisite — researcher or reviewer pass):** Before editing, verify the full int-array round-trip chain: DB `Game.playerIds Int[]` → `GET /api/rounds/[id]` response serialization → `hydrateRound` in `roundStore.ts` (currently hardcodes `game.playerIds = []`; confirm whether a non-empty array would be stored as-is or would require an Int→String mapping per the `GameInstance.playerIds: string[]` type) → Zustand `GameInstance.playerIds` → `buildSpCfg(game).playerIds` → `assertValidStrokePlayCfg`. Also confirm that `PUT /api/rounds/[id]/scores/hole/[hole]` derives player IDs from `players` (not from `game.playerIds`), so the score write path is unaffected. Write the chain explicitly. If any site maps Int→String inconsistently, note it; do not fix it speculatively.
>
> **(b) Edit (only after (a) confirms consistent chain):** In `src/app/api/rounds/route.ts:66`, replace `playerIds: []` with the integer IDs of betting players derived from `playerRecords` filtered to `players[i].betting !== false`. No other files changed in this edit.
>
> AC: `GET /api/rounds/{id}` returns non-empty `game.playerIds`; `computeAllPayouts` does not throw `StrokePlayConfigError` for a two-player Stroke Play round; bridge-level tests for `stroke_play` with populated `playerIds` continue to pass unchanged.

> **Pushback 3 — accepted (two phases).** Open question 2 acknowledged a potential separate hydration mapping correction, revealing the type-contract risk. PF-1-F4 restated above with explicit verification prerequisite before the edit. F4 is **not dispatchable** until phase (a) completes and the chain is confirmed consistent. See Dispatch Order section.

**Causal chain:** F4 is causally upstream of F5 and F6. See Causal Chain Analysis.

**§7 entanglement check:** None. The fix (populate `playerIds` at round creation) does not touch any deferred §7 decision.

---

### F5 — Bets page renders empty state; Back link points to `/golf/scorecard/null`

**Classification: In-scope bug (downstream of F3 + F4 + PF-1 hydration limitation)**

The bets page is broken by a combination of:
1. **F4**: `computeAllPayouts` throws `StrokePlayConfigError` when called in-session with populated holes and `playerIds: []`.
2. **F3**: No scores were persisted to the DB.
3. **PF-1 known limitation** (checklist line 115): bets page has no hydration — post-reload, Zustand is empty (`holes=[]`, `games=[]`). With empty games, `computeAllPayouts` does not throw (no strokePlay game to call `settleStrokePlayBet` on), and `scoredHoles=[]` renders "No holes scored yet."

The `← Back` null link is an independent symptom:

**Evidence (null link):** `src/app/bets/[roundId]/page.tsx:17` — `<Header title="Bet History" backHref={/scorecard/${roundId}} />`. The `roundId` value is read from `useRoundStore()` at line 10. After page reload, the bets page has no `useEffect` hydration (confirmed by PF-1 known limitation, checklist line 115). Zustand's `roundId` defaults to `null`. This makes the href `/scorecard/null` verbatim.

**Evidence (empty state):** Downstream of F3+F4 as described. The bets page URL param `[roundId]` is not used to hydrate Zustand; the page reads only from `useRoundStore()`.

**Proposed checklist item:**
> PF-1-F5A — Fix null backHref in bets page: read `roundId` from `useParams().roundId` directly as the source of truth for the back link. The bets page is at `/bets/[roundId]`; the URL param is authoritative for which round is being viewed. Replace the Zustand-sourced `roundId` in `backHref={/scorecard/${roundId}}` with the URL param value. No fallback or Zustand-derived logic; the param is always present by Next.js routing contract when the page renders. `src/app/bets/[roundId]/page.tsx` only.
>
> Note: the empty-state issue (F5B) is a compound consequence of F3+F4+PF-1-hydration and will resolve when F3 and F4 are fixed and hydration is added. F5A (null backHref) is the one independent fix here.

> **Pushback 4 — accepted (direction corrected).** Original proposal treated the URL param as a Zustand fallback. Corrected: the URL param is the source of truth; Zustand state may be derived from or consistent with the round being viewed but is not the routing authority. No fallback logic. Single-source read from `useParams()`.

**Causal chain:** See Causal Chain Analysis.

---

### F6 — Results page after Finish Round shows generic "Golfer / 0 / E" with no winner

**Classification: In-scope bug (downstream of F3 + F4 + PF-1 hydration limitation)**

After a reloaded visit to the results page, Zustand is empty (no hydration on results page — PF-1 known limitation, checklist line 115). `computeAllPayouts([], [], [])` returns `{}`. `players=[]` → `sorted=[]` → `winner=undefined` → `winner?.name || 'Winner'` = `'Winner'`. Player rows render with name fallback `'Golfer'`, totalGross=0, totalVsPar=0 (`'E'`). The winning amount is 0 → shows `—`.

In-session (before reload), `computeAllPayouts` throws `StrokePlayConfigError` (F4 causal path) when holes are non-empty, crashing the component.

**Evidence:**
- `src/app/results/[roundId]/page.tsx:13` — `computeAllPayouts(holes, players, games)` — crashes in-session with non-empty holes + `playerIds:[]`.
- `src/app/results/[roundId]/page.tsx:35` — `winner = sorted[0]` → `undefined` when players empty.
- `src/app/results/[roundId]/page.tsx:35-36` — `winner?.name || 'Winner'` renders "Winner wins!" with no name.
- PF-1 known limitation (checklist line 115): results page reads from Zustand only; no hydration.

**Proposed checklist item:**
> PF-1-F6 — Results page correctness depends on F4 fix (populate `playerIds`) and F3 fix (PUT 204) as prerequisites. After those land, add server-authoritative hydration to the results page (`useEffect` on mount, same pattern as scorecard page). Until hydration is added, Complete rounds navigated to from Home will render empty. This item covers the hydration addition only; correctness requires F3+F4 first.

**Causal chain:** See Causal Chain Analysis.

---

### F7 — Recent Rounds list shows date shifted by one day

**Classification: In-scope bug**

`new Date("2026-04-27")` is parsed as UTC midnight per ECMA-262 date-only string semantics. `toLocaleDateString()` converts UTC midnight to local time in the browser, shifting back one calendar day in any UTC-negative timezone (e.g., PDT = UTC-7 → renders as April 26).

**Evidence:**
- `src/store/roundStore.ts:109` — `const today = new Date().toISOString().slice(0, 10)` — produces a UTC-based date string `"2026-04-27"`, not a local-timezone string.
- `src/app/api/rounds/route.ts:52` — `playedAt: playedAt ? new Date(playedAt) : new Date()` — interprets `"2026-04-27"` as `Date("2026-04-27T00:00:00.000Z")` (UTC midnight).
- `src/app/page.tsx:88` — `new Date(r.playedAt).toLocaleDateString()` — renders UTC midnight in local time, one day early in UTC-negative zones.

**Proposed checklist item:**
> SP-UI-3 — Fix playDate display at the rendering boundary. In `src/app/page.tsx:88`, change `new Date(r.playedAt).toLocaleDateString()` to `new Date(r.playedAt).toLocaleDateString(undefined, { timeZone: 'UTC' })`. The stored value is UTC midnight (`2026-04-27T00:00:00.000Z`); rendering it in the UTC timezone returns the correct calendar date regardless of browser locale. Fence: `src/app/page.tsx` only. AC: a round created with `playedAt = 2026-04-27T00:00:00.000Z` renders as the correct date string (e.g., "4/27/2026") in any UTC-negative timezone.

> **Pushback 5 — accepted (switched to option (a), single-file).** The three-file approach mutated how dates are generated in the store, interpreted in the API route, and rendered in the page — touching three sites for a defect that lives only at the display layer. UTC midnight stored as UTC midnight is correct and internally consistent; the rendering was the sole defect. Option (a) — `{ timeZone: 'UTC' }` at the display boundary — is a one-file change that fixes the defect without altering storage or generation. Three-file approach dropped.

**§7 entanglement:** None.

---

### F8 — Intermittent 503s on RSC prefetches

**Classification: Backlog (infrastructure / Next.js dev server issue)**

The RSC prefetch 503s are on `GET /golf/{scorecard,results,bets}/{N}?_rsc=...` routes — Next.js server-side rendering payloads, not API routes. They are intermittent (same URL with different token sometimes 200, sometimes 503). The score PUT 503s (F3) are consistent (all 18 fail). These are different failure modes. See Causal Chain Analysis §F8 for confirmation that F8 and F3 are unrelated.

No code path in the application produces a 503 response for RSC fetches; 503 is a Next.js infrastructure response when the server cannot handle a request. Likely cause: dev server memory pressure or cold-start behavior on the Cowork host. Recommending operator investigate server process logs rather than application code.

**No proposed checklist item.** Log as infrastructure observation. Revisit if 503s persist on a production host.

---

### F9 — Save & Next Hole disabled on default (par) score; no visual cue

**Classification: In-scope bug (already in checklist)**

This is IMPLEMENTATION_CHECKLIST.md line 74: *"Hole score entry: default each player's score to par so 'Next' is immediately clickable without manual entry."*

**Evidence:** `src/app/scorecard/[roundId]/page.tsx:52` — `allScored = holeData ? players.every(p => (holeData.scores[p.id] || 0) > 0) : false`. The `scores[p.id]` is `undefined` or `0` until `setScore` is called from Stepper interaction. `src/components/scorecard/ScoreRow.tsx:78` — `value={score || par}` — the Stepper renders the par value as a display default but does NOT write it to Zustand. A user who wants to record par must click +1 then −1 (returning to par) to trigger `setScore`. No visual indicator distinguishes "par displayed but not entered" from "par entered."

The button-disable behavior is by design (guard against empty scores); the bug is that the par display default is not wired as an initial Zustand write.

**Proposed checklist items (split per pushback 6):**
> **F9-a** — Write par to Zustand on hole mount: when `currentHole` changes (or `ScorecardPage` mounts with a new hole), for each player where `holeData.scores[p.id]` is `undefined` or `0`, call `setScore(p.id, currentHole, holeData.par)`. This makes "Save & Next Hole" immediately enabled at par without any user interaction. Fold into existing checklist line 74; add this explicit mechanism to its AC.
>
> **F9-b** — Visual affordance for unsaved-default state: add a distinct visual indicator when the displayed Stepper value equals par but has not been written to Zustand (i.e., `scores[p.id] === 0` or `undefined`). E.g., a faint "par" sublabel or subdued stepper border. **If F9-a lands (par written on mount, eliminating the unsaved state entirely), F9-b becomes moot.** Open as a new checklist item only after F9-a lands and evaluation confirms whether the unsaved-default state still exists.

> **Pushback 6 — accepted (split).** F9-a (par-default Zustand write) and F9-b (visual cue) are distinct fixes at different implementation sites with different urgencies. F9-b depends on whether F9-a eliminates the unsaved-default state entirely; defer F9-b pending F9-a evaluation.

---

### F10 — Money rendering: `+$5.00/hole` on Review screen; other sites not surveyed

**Classification: Backlog (insufficient coverage)**

The only observable money value was `+$5.00/hole` on the Review step, rendered via `formatMoneyDecimal` at `src/app/round/new/page.tsx:49`. This is the correct behavior — `formatMoneyDecimal` is the designated display boundary function (M-1 scope). The bare `${amount}` template literal at `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:69` (already filed as IMPLEMENTATION_CHECKLIST.md line 112) was not reachable because no junk-enabled round was tested.

No new finding. The existing line-112 item covers the known bare template site. Bets and results pages were non-functional (F5, F6) so money rendering there could not be verified.

**No proposed checklist item.**

---

## Causal Chain Analysis

### F3 / F4 / F5 / F6 cascade

**Is the cascade real?** Yes, with F4 as primary and F3 as parallel.

**F4 → F5 and F6 (in-session, before any reload):**

Call chain: `computeAllPayouts` (`payouts.ts:156`) → `computeGamePayouts` (`payouts.ts:135`) → `settleStrokePlayBet` (`stroke_play_bridge.ts:57`) → `buildSpCfg` returns `cfg.playerIds = game.playerIds = []` (`stroke_play_bridge.ts:35`) → `settleStrokePlayHole(state, cfg, roundCfg)` (`stroke_play_bridge.ts:70`) → `assertValidStrokePlayCfg(cfg)` (`stroke_play.ts:163`) → throws `StrokePlayConfigError: playerIds length must be 2..5` (`stroke_play.ts:82`).

This throw fires whenever the holes array is non-empty (loop at `stroke_play_bridge.ts:68`). With populated Zustand holes (set by Stepper + clicks), the bets and results pages crash at render time. With an empty holes array (post-reload, no hydration), `finalizeStrokePlayRound([], cfg)` is called at `stroke_play_bridge.ts:76`, which also calls `assertValidStrokePlayCfg` (`stroke_play.ts:214`) and also throws. **F4 alone is sufficient to break bets and results pages at all times, regardless of whether holes are empty or populated.**

**F3 → F5 and F6 (server-side persistence dimension):**

F3 (503 on PUT) independently causes: no scores in DB → bets page shows "No holes scored yet" even if F4 were fixed; round stays `status: InProgress` → results page reflects no completion. F3 is a parallel independent failure, not a downstream consequence of F4.

**Whether fixing only F4 restores bets/results:** No. Fixing F4 prevents the `StrokePlayConfigError` crash. But post-reload empty state (bets/results read Zustand only, no hydration) persists as a PF-1 known limitation. And if F3 is unresolved, scores are still not in the DB, so bets page shows empty holes regardless. All three must land together: F4 fix, F3 fix, and hydration additions (PF-1-F6).

**Is F4 the single engineer-turn root for the F4/F5/F6 cluster?** Yes for the crash. The one-line fix at `api/rounds/route.ts:66` eliminates the `StrokePlayConfigError`. F5 (null backHref) has an independent fix that doesn't depend on F4. F6 (generic results) additionally requires results-page hydration (also independent of F4).

**F3 and F4 are independent:** F4 is in the round-creation POST handler (`api/rounds/route.ts:66`). F3 is a failure in the score PUT handler (`api/rounds/[id]/scores/hole/[hole]/route.ts`) at the database layer. The round-creation hardcode has no causal connection to why the PUT fails with 503.

### F8 separation from F3 503s

F8 (RSC prefetch 503s) and F3 (score PUT 503s) do not share a code path:

- **F3 503s**: Route `PUT /golf/api/rounds/9/scores/hole/N` — hits `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts`, a Next.js Route Handler with Prisma database writes. All 18 fail **consistently**. No application code returns 503; failure is a Prisma/DB exception propagating to the Next.js runtime.
- **F8 503s**: Routes `GET /golf/{scorecard,results,bets}/{N}?_rsc=<token>` — React Server Component payload fetches, handled by Next.js framework machinery (RSC serialization, not Route Handlers). Failures are **intermittent** (same URL succeeds with different token). No application code is involved; these are framework-level timeouts or concurrency issues.

Confirmed unrelated. F8 is infrastructure; F3 is database/Prisma. Fixing F3's root cause (DB state) will not affect F8, and vice versa.

---

## Dispatch Order

**Independently dispatchable (no prerequisites):**

- **SP-UI-1 + SP-UI-2** (F1 + F2): separate engineer turns, dispatchable in any order. No dependency on F3, F4, or any §7 decision.
- **SP-UI-3** (F7): single-file display-boundary fix. Independent of all other items.
- **PF-1-F5A** (F5 null backHref): single-file `useParams()` change. Independent of F4 and F3.

**Blocked — not dispatchable until prerequisite met:**

- **PF-1-F4 phase (a)** (type-contract verification): prerequisite for phase (b). Not an engineer turn; a grep/read pass.
- **PF-1-F4 phase (b)** (the edit): blocked on phase (a) completing and confirming the int-array chain is consistent. The §7 entanglement check ("dispatchable") in the original triage was stated against decision entanglement only; pushback 3 adds the type-contract prerequisite. Corrected here.
- **PF-1-F6** (results-page hydration): blocked on F4 phase (b) landing first.
- **F3 diagnosis + fix**: blocked on server/DB investigation on the Cowork host; no engineer turn until root cause is known.

**Sequencing:**

1. SP-UI-1 + SP-UI-2 + SP-UI-3 + PF-1-F5A — four separate engineer turns, dispatchable in any order. Each item is fenced to its own file(s); no coordination required between items; any one can be committed without affecting the others.
2. PF-1-F4 phase (a) — type-contract verification pass
3. PF-1-F4 phase (b) — edit (only after step 2 confirms chain)
4. F3 diagnosis (parallel to steps 2–3 if operator can access server logs)
5. PF-1-F6 — results-page hydration (after step 3)
6. F9-a — par-default Zustand write (independent; can go any time, tentatively after step 1 to batch UI items)
7. F9-b — evaluate after F9-a; open or close based on that evaluation
8. SP-4 manual playthrough — after F4 + F3 + F6 all resolved

---

## PF-1 Closure Audit

### Closure evidence

- **PF-1 Turn 2 smoke check** (`docs/sessions/2026-04-26/003_PF1_TURN2_API_ROUTES.md`): Step d — "PUT /api/rounds/[id]/scores/hole/[hole] returns 204" — PASS.
- **PF-1 Turn 3 smoke check** (`docs/sessions/2026-04-26/004_PF1_TURN3_UI_WIRING.md`): Step c — "PUT hole 1 scores: 204 returned" — PASS; Steps f/g — multi-hole writes, simulated refresh — PASS. All 15 substeps passed.
- **Correction commit (also 2026-04-26)**: `handleSaveNext` changed from fire-and-forget to `await PUT; advance only on response.ok`. `confirmFinish` changed to navigate only on 204 or 409. Code at `src/app/scorecard/[roundId]/page.tsx:119-122` reflects the spec-compliant behavior.
- **Known limitations documented at close**: IMPLEMENTATION_CHECKLIST.md lines 115–116 — (1) results/bets/resolve page hydration deferred; (2) `game.playerIds: []` post-hydration suppresses junk notices.

### Is the closure defensible?

**For the persistence mechanism: yes.** The PUT route was verified returning 204 on 2026-04-26 via programmatic smoke check. The spec-compliant await-and-gate behavior was confirmed implemented. The 503s seen in the Cowork walkthrough (2026-04-27) are most likely a server/DB state issue on the Cowork host (migration not applied or database unavailable at that time) — not a regression in the application code. The PF-1 smoke checks do not cover deployment state management; that gap is a precondition concern, not a code defect.

**For end-to-end round correctness: no.** The PF-1 closure note characterized `playerIds: []` as affecting only junk notice suppression — *"Not a regression for the current product surface."* The walkthrough contradicts this: `playerIds: []` causes `StrokePlayConfigError` to be thrown synchronously in `computeAllPayouts`, crashing both the bets and results pages at render time. This is a correctness regression, not a future risk. The impact assessment at PF-1 close was wrong.

Additionally, SP-4 explicitly deferred the manual browser playthrough (*"Browser rendering verification deferred (no browser access at close)"*; `2026-04-25/SP3_SP4_BRIDGE_CUTOVER_25-April-2026.md:123-125`). The SP-4 closure condition §4 of the plan requires a manual 18-hole playthrough with correct payout display on the results page. That condition has not been met.

### Does PF-1 need to reopen?

**Partial reopen recommended.** Specifically:

1. IMPLEMENTATION_CHECKLIST.md line 116 must be **upgraded from "known limitation" to "active in-scope bug"**: `playerIds: []` crashes `computeAllPayouts` via `StrokePlayConfigError`, not just suppresses junk notices. The fix (`api/rounds/route.ts:66`) is one line and does not entangle any §7 decision.

2. The SP-4 manual playthrough closure condition remains unmet. The programmatic scenarios that substituted for it do not exercise the browser UI path where `computeAllPayouts` is called at render time.

3. F3 (503 on PUT) requires a separate investigation to confirm the Cowork server's DB state. If the PUT route is confirmed working in the dev environment (run `npx prisma migrate status` and re-verify), PF-1's score-write closure holds.

The operator needs to decide whether the partial reopen is handled as a PF-1 reopening or as a new PF-2 that explicitly adds the end-to-end correctness gates PF-1 deferred.

---

## Open questions for operator

1. **F3 503 root cause**: Is the dev server's Prisma migration current on the Cowork host? Run `npx prisma migrate status` and confirm the `Score.@@unique` migration (from M-1 / PF-1 Turn 1) is applied. If not applied, apply it and re-verify PUT. This must be answered before F3 is closed.

2. **F4 fix scope decision**: The fix is `api/rounds/route.ts:66` — populate `playerIds` from `playerRecords` filtered to `betting: true`. The current Prisma schema has `playerIds Int[]` on `Game`. The `hydrateRound` in `roundStore.ts` maps player IDs as `String(rp.playerId)`. The fix must ensure the stored int array round-trips correctly through hydration (int in DB → `String(rp.playerId)` in Zustand → `Number(p.id)` on PUT). Confirm this is a one-turn fix or whether a separate hydration mapping correction is needed.

3. **PF-1 partial reopen vs PF-2 — three options (operator picks; triage does not recommend):**

   - **Option A — Reopen PF-1:** Extend PF-1 scope to include end-to-end correctness gates. Add F4 fix, results-page hydration, and SP-4 manual playthrough to PF-1 AC. Re-close once all gates pass.
   - **Option B — New PF-2:** Leave PF-1 closed as a persistence-mechanism deliverable. Open PF-2 with explicit end-to-end correctness AC covering F4 fix, results-page hydration, and SP-4 manual playthrough. Reclassify checklist line 116 as active in-scope bug without reopening PF-1.
   - **Option C — PF-1 closes with corrected scope, PF-2 for correctness gates:** PF-1 remains closed for persistence mechanics, with a documented correction: checklist line 116 is explicitly acknowledged as misclassified at close (impact severity was "future risk / junk notices suppressed"; actual severity is "crashes bets and results pages now"). F4 fix, results-page hydration, and SP-4 manual playthrough open as PF-2, scoped as end-to-end correctness gates that PF-1's mechanism-only AC by design did not cover. PF-1's smoke-check closure evidence is valid and untouched.

   > **Pushback 1 — accepted (third option added).** The original two-option framing collapsed "reopen PF-1" with "PF-1 correction." Option C separates them: PF-1 closure stands as a mechanism deliverable with a documented impact-assessment correction; PF-2 takes on what PF-1 never claimed to cover. Three options presented; operator decides.

4. **F1 / F2 ordering** — answered by Dispatch Order step 1: SP-UI-1 (F1) and SP-UI-2 (F2) are separate engineer turns with no prerequisites. They do not depend on F3/F4 resolution and can be dispatched in any order relative to each other and to the F3/F4 repair sequence. Not an open question.

5. **F9 gating behavior**: Checklist line 74 says "default each player's score to par." The walkthrough's F9 report shows the interaction also lacks a visual cue (no indicator that the displayed default hasn't been "entered"). Should the line-74 fix requirement explicitly include the visual-cue dimension (e.g., a faint "tap to confirm" label), or is a functional fix (write par to Zustand on hole mount) sufficient?

6. **No §7 deferred-decision entanglement found.** None of F1–F10 requires resolving any deferred §7 decision (Skins/Match Play/Wolf/Nassau unpark triggers, Stroke Play scope beyond Option α, junk architecture, junk §11 event schema, junk §4 formula, ctpWinner data model, Nassau allPairs v1 scope). Safe to dispatch engineer turns on F1, F2, F4, F7 without touching §7.

7. **F8 (RSC 503s) server state**: The Cowork browser session was on `http://segui.tailcb3e05.ts.net/golf`. If that host runs the dev server, RSC 503s may indicate memory pressure or the dev server restarting during the session. Consider whether the Cowork host should run `next build && next start` (production mode) instead of `next dev` for walkthrough sessions.

---

## Plan-Document Impact

This triage does not edit plan or checklist artifacts (scope fence). The operator should authorize revision of the following before the next engineer turn.

**IMPLEMENTATION_CHECKLIST.md:**

- **Line 116** (`game.playerIds: [] post-hydration suppresses junk notices`) must be reclassified from "known limitation" to "active in-scope bug" with corrected severity. Current description understates impact; the actual consequence is a crash in `computeAllPayouts` affecting bets and results pages for every Stroke Play round, not just junk-notice suppression.
- **New items** SP-UI-1, SP-UI-2, SP-UI-3, PF-1-F3, PF-1-F4 (two phases), PF-1-F5A, PF-1-F6, F9-a, F9-b (conditional on F9-a evaluation) need to be added once the operator decides PF-1/PF-2 framing (open question 3 above). The item labels and proposed AC text are in the per-finding sections above.

**STROKE_PLAY_PLAN.md:**

- **SP-4 §4 manual-playthrough condition is unmet.** The plan states the manual 18-hole playthrough is "required for SP-4 closure, not a separate validation step." SP-4 was closed 2026-04-25 with browser verification explicitly deferred (`2026-04-25/SP3_SP4_BRIDGE_CUTOVER_25-April-2026.md:123-125`). A plan revision is needed to either: (a) add the manual playthrough as a PF-2 gate (consistent with Option C or B above), or (b) formally reopen SP-4 and add the playthrough as its outstanding AC (consistent with Option A).
- **PF-1 line 116 reclassification** has plan-level implications: STROKE_PLAY_PLAN.md §2 describes the UI components required for v1 and the phase as "fully functional." Neither §2 nor the plan's scope section acknowledges that `computeAllPayouts` crashes on `playerIds: []`. When the plan is revised, this gap should be noted.

No plan or checklist edits in this turn. Operator decides scope and timing of revision.
