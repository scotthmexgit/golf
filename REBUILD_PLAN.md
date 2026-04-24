# Rebuild Plan — 2026-04-20

Drafted from `AUDIT.md` (9 Open items) plus the 7 Wolf follow-ups in `/tmp/round-5-notes.md` folded into #3 per user decision at prompt 002. Revised at prompts 003–004 with three user decisions: legacy Match Play mapping confirmed, cutover moved to parallel-path with grep gates, bet-id refactor included as new #4. Entries renumbered to sequential integers #3 through #11. Awaiting final user approval before any code changes begin on #3+.

## Scope

In-scope: 9 Open audit items (#1, #2, #3, #5, #6, #10, #14, #18, #19) + 7 Wolf follow-ups + the bet-id string-lookup refactor (pulled in from deviation flag D at user direction, prompt 004).

Explicit inclusions beyond pure "close the 9 open items":
- **#11 cutover session** — included per user constraint 5. Deletion of `src/lib/*` parallel paths; not itself an audit item but resolves parallel-path carryover noted against Fixed items #4, #7, #8, #15.
- **#4 bet-id string-lookup refactor** — promoted from deviation flag D at prompt 004. Lands before Nassau/Match Play/Junk so all 5 engines share the `id: BetId` pattern from day one rather than accumulating the reference-identity anti-pattern.

## Deviations from AUDIT-implied scope

Three AUDIT sub-gaps and two forward-facing rebuild items are **NOT** covered in this plan.

| # | Not in plan | Why excluded | Recommended disposition |
|---|---|---|---|
| A | Audit #9 sub-gap: ScoringEvent Prisma model | `#9` is classified Fixed; the Prisma-model carryover is strictly out of the "9 Open items" scope you set. | Add to backlog after this rebuild lands; don't expand current plan. |
| B | Audit #17 sub-gap: Final Adjustment engine logic + UI | `#17` is Fixed (type-level); engine logic was explicitly out of Round 3 Sub-Task 2's scope. | Same — separate post-rebuild item. |
| C | Hole-state builder (was #12 in prior checklist) | Not an audit item; UI-integration concern. | Keep in Deferred until a UI-integration phase. |
| E | UI wiring / Zustand route migration (was #13) | Not an audit item; post-cutover UI-integration concern. | Deferred. |

Flag D (bet-id string-lookup refactor) was previously deviation-flagged; user decision at prompt 004 pulled it into scope as #4. No longer a deviation.

Audit #18 (v2 quorum override) is in the 9 Open items but will remain **deferred with no work** this phase — per its own merge decision ("v2 planning round"). Plan entry is a one-line acknowledgment in the Deferred section, not a task.

Audit #19 (`matchTieRule` removal) is **folded into plan #5 Nassau engine** rather than given its own entry — removal is a one-line type change most naturally done while touching `NassauCfg`.

## Plan entries

Each entry: title + audit references, acceptance criteria with fence sentence, files touched, dependencies, sizing, risk flags.

---

### #3 — Wolf follow-ups (Round 5 cleanups)

**Audit references**: none directly (Round-5 follow-ups). Keeps `src/games/wolf.ts` aligned with the cleaned-up `docs/games/game_wolf.md` that landed in Round 5 Sub-Task 1.

**Acceptance criteria**:
- The 7 items listed in `/tmp/round-5-notes.md` Sub-Task 1 are complete:
  1. `WolfCfg.teeOrder` removed from `src/games/types.ts`.
  2. `WolfCfg.lastTwoHolesRule` removed from `src/games/types.ts`.
  3. `src/games/wolf.ts` no longer reads `teeOrder`; captain rotation sources from `RoundConfig.players[]` via `(hole - 1) mod players.length`.
  4. `src/games/wolf.ts` no longer reads `lastTwoHolesRule`; the `lowest-money-first` branch and `moneyTotalsFromEvents` helper are deleted as dead code.
  5. `src/games/__tests__/wolf.test.ts` updated: `makeWolfCfg` fixtures cleaned; 2 config-error tests + the captain-tiebreak test deleted; Test 1 Worked Example assertions updated to `{ A: +21, B: -19, C: +1, D: -3 }` with hole-17 decision `{kind: 'partner', captain: 'A', partner: 'B'}` and hole-18 decision `{kind: 'lone', captain: 'B', blind: false}`.
  6. `WolfDecisionMissing.captain` sourced from `roundCfg.players[((hole - 1) % N)].id` instead of `config.teeOrder[...]`.
  7. `WolfCaptainTiebreak` kept as reserved dead code. Variant count remains 55. A one-line comment in `src/games/events.ts` on the variant notes it is reserved for future captain-selection rules.
- `npm run test:run` passes. Total test count after #3: still 100 (the 3 deleted Wolf tests balance against no additions in #3 itself — any net change must be explicitly justified).
- `npx tsc --noEmit --strict` passes with zero errors.
- Portability grep on `src/games/` returns no forbidden imports.
- **No other changes to `wolf.ts` or `wolf.test.ts` in this PR.** No changes to `skins.ts`, `stroke_play.ts`, or their test files. No changes to `docs/games/game_wolf.md` (the rule file is the source of truth this work aligns to, not a target).

**Files touched**:
- Modify: `src/games/types.ts` (delete 2 fields from `WolfCfg`).
- Modify: `src/games/wolf.ts` (stop reading 2 fields; delete dead-code branch; re-source captain).
- Modify: `src/games/events.ts` (one-line comment on `WolfCaptainTiebreak`).
- Modify: `src/games/__tests__/wolf.test.ts` (fixtures + assertions + 3 test deletions).

**Dependencies**: none. Can land first.

**Sizing**: **S**. Single PR, no new files.

**Risk flags**:
- `WolfCfg` field removal is a type-level change. If any caller outside `src/games/` accesses `teeOrder` or `lastTwoHolesRule` it will fail to compile. Confirmed none today (grep → zero matches outside `src/games/`).
- Test 1 arithmetic change: the number `{ A: +21, B: -19, C: +1, D: -3 }` must match the rule file `docs/games/game_wolf.md` § 10 output. Rule file was rewritten in Round 5 with these numbers; engineer verifies against the rule file, not by invention.

---

### #4 — Bet-id string-lookup refactor

**Audit references**: none directly (Round 1 Spec Gap 4). Closes the reference-identity anti-pattern across all 5 `*Cfg` interfaces before Nassau / Match Play / Junk inherit it.

**Acceptance criteria**:
- All 5 `*Cfg` interfaces in `src/games/types.ts` gain an `id: BetId` field: `SkinsCfg`, `WolfCfg`, `NassauCfg`, `MatchPlayCfg`, `StrokePlayCfg`.
- The 3 `findBetId` helpers in `src/games/skins.ts`, `src/games/stroke_play.ts`, `src/games/wolf.ts` are rewritten from reference-identity (`b.config === cfg`) to string-id comparison (`b.id === cfg.id`).
- Test-file fixtures (`make*Cfg` defaults and any test-scoped config overrides) in `src/games/__tests__/skins.test.ts`, `wolf.test.ts`, `stroke_play.test.ts` gain an `id` field. The `makeRoundCfg` helpers and `BetSelection.id` continue to match for reference-check callers during this transition.
- `npm run test:run` passes. Total test count remains at 100 (modulo the #3 net-zero). `npx tsc --noEmit --strict` passes. Portability grep empty.
- After #4, the 3 new engines (#5 Nassau, #6 Match Play, #7 Junk) are built string-id-native — they use `b.id === cfg.id` from day one, never copy the reference-identity pattern.
- **Only the 5 `*Cfg` interfaces, the 3 `findBetId` helpers in skins/wolf/stroke_play, and the test-file defaults are modified. No engine logic changes. No UI or persistence touched.**

**Files touched**:
- Modify: `src/games/types.ts` (add `id: BetId` to 5 interfaces).
- Modify: `src/games/skins.ts` (rewrite `findBetId` at line 102–105).
- Modify: `src/games/wolf.ts` (rewrite equivalent `findBetId` helper).
- Modify: `src/games/stroke_play.ts` (rewrite `findBetId` at line 135–138).
- Modify: `src/games/__tests__/skins.test.ts` (add `id` to fixtures).
- Modify: `src/games/__tests__/wolf.test.ts` (add `id` to fixtures).
- Modify: `src/games/__tests__/stroke_play.test.ts` (add `id` to fixtures).

**Dependencies**: #3 (types.ts churn ordering — #3 removes Wolf fields from the same file; #4 adds `id` to all 5 interfaces).

**Sizing**: **S**. Mechanical pattern replacement; test-file fixture updates are the bulk of line count.

**Risk flags**:
- Low. If any fixture or engine site is missed, TypeScript would surface the `id` requirement at compile time; runtime reference-equality failures become unreachable after the refactor.
- A `makeRoundCfg` helper that constructs `BetSelection.id` from a parameter (already true in all 3 test files today) keeps the round-config id and the cfg id aligned. Engineer must verify this alignment in each test-file's helper.

---

### #5 — Nassau engine

**Audit references**: closes #5 (Nassau 2-player limit + no press logic), #19 (`matchTieRule` type/doc mismatch); partially closes #1 (per-game `src/games/`), #10 (pure-function signature).

**Acceptance criteria**:
- `src/games/nassau.ts` implements `settleNassauHole`, `finalizeNassauRound`, `offerPress`, `openPress` (or equivalents per `docs/games/game_nassau.md` § 5) matching the `(hole, config, roundCfg, ...) => ScoringEvent[]` signature contract.
- All rule-file features implemented: 2–5 players via `pairingMode: 'singles' | 'allPairs'`; three match bases (front / back / overall); press rules (`manual`, `auto-2-down`, `auto-1-down`) per `pressRule`; press scope (`nine`, `match`) per `pressScope`; closeout when `holesUp > holesRemaining`; halved matches emit `MatchTied` with zero delta; disputes escalate to Final Adjustment.
- `src/games/types.ts` `NassauCfg.matchTieRule` field **deleted** (closes #19). No replacement field.
- Bet-id lookup uses `b.id === cfg.id` (from #4), never reference identity.
- Test file `src/games/__tests__/nassau.test.ts` covers: § 10 Worked Example verbatim (Test 1); every § 9 edge case; every § 12 Test Case; Round Handicap integration test (mirrors Wolf Test 10 and Stroke Play Test 12).
- Zero-sum assertion on every point-producing test.
- `npx tsc --noEmit --strict` passes. Portability grep empty. No `any` / `@ts-ignore` / non-null `!` on untrusted input.
- **No changes to `src/games/skins.ts`, `wolf.ts`, `stroke_play.ts`, or their test files. No changes to `docs/games/game_nassau.md`. No UI wiring.** Old `computeNassau` in `src/lib/payouts.ts` stays untouched (parallel-path hold until #11 cutover).

**Files touched**:
- Create: `src/games/nassau.ts`.
- Create: `src/games/__tests__/nassau.test.ts`.
- Modify: `src/games/types.ts` (delete `NassauCfg.matchTieRule`; no other changes).

**Dependencies**: #3 (types.ts churn ordering), #4 (string-id pattern).

**Sizing**: **L**. Per the Round 4 Summary baseline, Nassau is the most complex remaining engine (press composition, match state across pairs, closeout). Expect Wolf-comparable line count (400–500 engine lines, 600+ test lines).

**Risk flags**:
- `src/games/types.ts` is shared with every other engine. Field removal on `NassauCfg` is low-risk but any incidental edit elsewhere in the file could break Skins/Wolf/Stroke Play. Mitigation: diff scope limited to `NassauCfg` interface.
- Rule file `game_nassau.md` § 4 interface and § 5 pseudocode may have spec gaps similar to Wolf's Round 3 gaps. Expect to log divergences to `/tmp/round-6-notes.md` (engineer session's worklist).

---

### #6 — Match Play engine

**Audit references**: closes #6 (format labels); partially closes #1, #10.

**Acceptance criteria**:
- `src/games/match_play.ts` implements `settleMatchPlayHole`, `finalizeMatchPlayRound`, `closeoutCheck` (or equivalents per `docs/games/game_match_play.md`) matching the signature contract.
- Four formats: `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'`. Closeout (`holesUp > holesRemaining` → `MatchClosedOut`). Team handicap via `teamCourseHandicap(courseHcp_p1, courseHcp_p2)` using 50%-combined rule.
- `src/types/index.ts` `GameInstance.matchFormat` widened from `'individual' | 'teams'` to the four-format union. This is a breaking type change for existing callers.
- `src/games/types.ts` `MatchPlayCfg.format` already matches the four formats (confirmed in audit); no change needed there.
- Bet-id lookup uses `b.id === cfg.id` (from #4), never reference identity.
- **Legacy-value mapping** (user-confirmed at prompt 004): migration shim for pre-existing rounds that were created under the old `'individual' | 'teams'` enum. Legacy `'individual'` maps to new `'singles'`; legacy `'teams'` maps to new `'best-ball'`. **This mapping is a one-way migration path for pre-existing rounds only — new round creation picks from the full 4-format UI** and never emits the legacy values.
- Test file `src/games/__tests__/match_play.test.ts`: § 10 Worked Example verbatim, every § 9 edge case, every § 12 Test Case, Round Handicap integration test.
- Zero-sum on every point-producing test. `tsc --noEmit --strict` passes. Portability grep empty.
- **No changes to Skins/Wolf/Stroke Play/Nassau engines. No changes to `docs/games/game_match_play.md`. No cutover of the old `computeMatchPlay` in `src/lib/payouts.ts`.**

**Files touched**:
- Create: `src/games/match_play.ts`.
- Create: `src/games/__tests__/match_play.test.ts`.
- Modify: `src/types/index.ts` (widen `matchFormat` union).
- Modify: `src/store/roundStore.ts` (line 155: default for new rounds uses `'singles'`, not `'individual'`).
- Modify: `src/components/setup/GameInstanceCard.tsx` (lines 69, 71: migration-shim read-path only — preserves existing-round rendering under the two new canonical values).

**Dependencies**: #3 (types.ts churn ordering), #4 (string-id pattern), optionally #5 (team-handicap rule shared).

**Sizing**: **L**. Four formats is multiplicative complexity on the state machine. Closeout logic, best-ball team-score computation, alternate-shot timing all add surface.

**Risk flags**:
- **Type-widening `matchFormat` is breaking**. Three consumer files must compile under the new union. Legacy-value mapping (`'individual'→'singles'`, `'teams'→'best-ball'`) avoids runtime breakage in `src/app/round/new/page.tsx` and `GameInstanceCard` during the transition. UI rewrite post-cutover (deferred) removes the shim.
- If `game_match_play.md` § 5 or § 6 has spec gaps (e.g., how handicap applies in best-ball vs. alternate-shot), expect engineer to log divergences.

### Phase breakdown — #6 Match Play engine

> Drafted 2026-04-22 (prompt 014). All 10 rule-doc gaps resolved prior to this breakdown (prompt 013). Evidence gates below verified before Phase 1 was drafted.

---

#### Evidence gates (pre-Phase-1)

**`GameInstance.matchFormat`** — `src/types/index.ts` line 71:
```ts
matchFormat?: 'individual' | 'teams'
```
This is the breaking type change target. The current union admits only two legacy values; the engine needs four.

**`MatchPlayCfg`** — `src/games/types.ts` lines 69–81:
```ts
export interface MatchPlayCfg {
  id: BetId
  stake: number
  format: 'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'
  appliesHandicap: boolean
  holesToPlay: 9 | 18
  tieRule: 'halved'
  playerIds: PlayerId[]
  teams?: [[PlayerId, PlayerId], [PlayerId, PlayerId]]
  junkItems: JunkKind[]
  junkMultiplier: number
}
```
The four-format union is **already correct in `src/games/types.ts`**. The only widening needed is in `src/types/index.ts`'s `GameInstance.matchFormat` field.

**Match Play event `matchId` fields** — `src/games/events.ts`:
- `HoleResolved` (lines 148–152): **no `matchId` field**
- `HoleHalved` (lines 153–156): **no `matchId` field**
- `MatchClosedOut` (lines 157–163): **has `matchId: string`**
- `MatchTied` (lines 164–168): **has `matchId: string`**
- `MatchHalved` (lines 169–173): **has `matchId: string`**

This constrains Q3: per-hole events (`HoleResolved`, `HoleHalved`) do not carry `matchId`; terminal-settlement events do.

---

#### Design question answers (all 8)

**Q1 — Does `settleMatchPlayHole` return `{ events, match }` or events only?**

Answer: **`{ events, match }`** — the updated `MatchState` is returned alongside events. This is consistent with Nassau's signature `(hole, cfg, roundCfg, matches) => { events, matches }` and with § 11 of the rule doc: "`match_play.ts` is stateful at the `MatchState` level — threaded by `aggregate.ts`. The per-hole settle function is pure." The caller must thread the updated `MatchState` into the next hole call; returning events only would force callers to reconstruct state from the event log on every call, which is the wrong abstraction.

The § 5 pseudocode shows `advanceMatch(match, winner): MatchState` returning a new `MatchState`. The settle function composes `holeWinner` → `advanceMatch` → emit events, so the caller needs both the emitted events and the new state. Signature: `(hole: HoleState, cfg: MatchPlayCfg, roundCfg: RoundConfig, match: MatchState) => { events: ScoringEvent[], match: MatchState }`.

No rule-doc update required; § 5 and § 11 are consistent and this is confirmed.

**Q2 — `MatchState` singular object or array?**

Answer: **singular object**. Match Play has exactly one match per bet. § 7 explicitly: "Match Play has no press mechanic." Nassau required `MatchState[]` because presses introduced new matches mid-round. Match Play has no mechanism that creates additional `MatchState` entries. The function signature is `(..., match: MatchState) => { ..., match: MatchState }` — scalar in, scalar out.

No rule-doc update required.

**Q3 — `matchId` on single-match events?**

Answer: **Match Play does not add `matchId` to `HoleResolved` or `HoleHalved`**. Evidence from `events.ts`:
- `HoleResolved` (line 148) and `HoleHalved` (line 153) have no `matchId` field.
- `MatchClosedOut` (line 160), `MatchTied` (line 167), and `MatchHalved` (line 172) already carry `matchId: string`.

Nassau emits `matchId` on `NassauHoleResolved` because it manages multiple parallel matches (front/back/overall plus presses) — `matchId` disambiguates which of the concurrent matches produced the event. Match Play has one match per bet; the `declaringBet` field on every event (via `WithBet`) already uniquely identifies the match. No per-hole `matchId` is needed.

The terminal settlement events (`MatchClosedOut`, `MatchHalved`) carry `matchId` because those event types are shared with future multi-match contexts (e.g., Nassau uses analogous settlement events). Match Play supplies `cfg.id` as the `matchId` value in those events.

**Cross-engine consistency:** This is not an inconsistency with Nassau. Match Play's per-hole events use `kind: 'HoleResolved'` and Nassau's use `kind: 'NassauHoleResolved'` — the event kind alone separates them before any further field lookup. Within the `HoleResolved` kind, `declaringBet` identifies the specific Match Play bet (and there is exactly one match per bet), so no additional `matchId` field is needed. Nassau per-hole events require `matchId === 'front' | 'back' | 'overall'` because multiple parallel matches share the same `declaringBet` (front/back/overall all declare under the same Nassau bet ID). That multiplicity doesn't exist in Match Play. Consumers disambiguate correctly: `event.kind === 'HoleResolved' && event.declaringBet === betId` returns all and only the Match Play per-hole events for that bet — no further filter is needed.

No rule-doc update required.

**Q4 — `finalizeMatchPlayRound` separate function vs inline on final hole?**

Answer: **separate exported function**, consistent with Nassau's `finalizeNassauRound`. The finalizer handles the hole-18 (or hole-9) boundary: if the match is still open at `holesToPlay`, emit `MatchClosedOut`; if tied, emit `MatchHalved` with zero deltas. The per-hole `settleMatchPlayHole` cannot know at hole-18 call time whether the round is complete; separating finalization makes the two concerns independently testable.

Signature (analogous to Nassau): `finalizeMatchPlayRound(cfg: MatchPlayCfg, roundCfg: RoundConfig, match: MatchState) => ScoringEvent[]`.

No rule-doc update required.

**Q5 — `closeoutCheck` separate or inline?**

Answer: **inline in `settleMatchPlayHole`**. The REBUILD_PLAN #6 AC names "`closeoutCheck` (or equivalents)" — this AC phrasing anticipates inline satisfaction. The closeout check is a single condition: `Math.abs(holesUp) > holesRemaining`. Extracting it as a standalone exported function adds a public API surface for no test benefit; callers do not call `closeoutCheck` independently. The `advanceMatch` pseudocode in § 5 already shows the check inline. Inline satisfies the AC.

No rule-doc update required.

**Q6 — Round Handicap: caller-applies?**

Answer: **caller-applies**. `docs/games/_ROUND_HANDICAP.md` § 3 states: "Every handicap-aware game computes the player's effective course handicap for stroke allocation as `effectiveCourseHcp = courseHcp + roundHandicap`." Section 6 (Match Play): "Best-ball uses `effectiveCourseHcp` per player. Alternate-shot and foursomes compute team handicap via `teamCourseHandicap(effectiveCourseHcp[p1], effectiveCourseHcp[p2])`." The per-hole gross score passed to `settleMatchPlayHole` has already been adjusted by the caller via `state.strokes[pid]` (populated with `effectiveCourseHcp` by the hole-state builder). `match_play.ts` reads `state.strokes[pid]` and calls `strokesOnHole` — it inherits Round Handicap without any engine-specific code.

No rule-doc update required.

**Q7 — `TeamSizeReduced` in-scope for #6 or deferred?**

Answer: **in-scope for #6**. § 9 documents the behavior explicitly: "partner withdraws → team's score on subsequent holes is the remaining player's net; team course handicap recomputes via `teamCourseHandicap` using only the remaining player. Emit `TeamSizeReduced`." The `TeamSizeReduced` event type already exists in `events.ts` (lines 194–199) with `{ kind, hole, teamId, remainingSize }`. The emission logic is a simple guard on `teams` field when a player in `state.withdrew` is detected. It is needed for correctness in best-ball and alternate-shot/foursomes formats.

**`TeamSizeReduced` belongs in Phase 4d (edge cases)**. It is not needed for the singles happy-path (Phase 1) or team happy-paths (Phase 2). It is an edge case that applies only to non-singles formats with a withdrawing partner — structurally parallel to Nassau's Phase 4b forfeit/withdrawal.

**Event-type status:** `TeamSizeReduced` already exists in `src/games/events.ts` lines 194–199:
```ts
type TeamSizeReduced = EventBase & WithBet & {
  kind: 'TeamSizeReduced'
  hole: number
  teamId: string
  remainingSize: number
}
```
No `events.ts` change is required for Phase 4d. The phase adds emit logic only.

No rule-doc update required.

**Q8 — Junk scoring: Match Play's responsibility or Junk engine?**

Answer: **Junk engine's responsibility** (#7 in backlog). `MatchPlayCfg.junkItems` and `MatchPlayCfg.junkMultiplier` declare which Junk bet kinds are in play for this Match Play bet, but `match_play.ts` does not emit `JunkAwarded` events. The Junk engine (#7) reads those config fields and emits `JunkAwarded` independently, per `docs/games/game_junk.md`. § 7 of the Match Play rule doc confirms: "Every Junk item in `junkItems` pays out at `points × stake × junkMultiplier` for this bet; see `docs/games/game_junk.md` for the points formula." The formula reference points outward to `game_junk.md`, not inward to `match_play.ts`. `match_play.ts` emits no Junk events.

No rule-doc update required.

---

#### Phase count rationale

Match Play's structure is driven by the rule doc, not by Nassau's count. The rule doc identifies four orthogonal concerns that cannot share a phase without creating untestable intermediate states:

1. **Per-hole scoring with `MatchState` threading** — the foundational data model and the singles case (§ 5 pseudocode); can be verified end-to-end for singles before any team logic exists.
2. **Team formats** — best-ball and alternate-shot/foursomes introduce `teams` config, `teamGross`/`teamStrokes` state fields, and the 50%-combined handicap formula. These are multiplicative on the § 5 `holeWinner` logic and require the `MatchState` interface from Phase 1 to be stable before they are built.
3. **End-of-round settlement and extra holes** — `finalizeMatchPlayRound`, tie-rule dispatch, sudden-death loop, and the cap-exhausted state transition are structurally separate from per-hole scoring; they trigger only at round boundary and require a complete `MatchState` from prior holes.
4. **Edge cases** — concession-closeout ordering (Gap 4), best-ball partial miss (Gap 9), `TeamSizeReduced`, `HoleForfeited`, `MatchConfigInvalid` — are correctness requirements for the engine but explicitly should not be scattered across phases. Grouping them in one phase lets them be added together with one focused test suite pass, verified by targeted edge-case tests, and gated by a single review.

The `matchFormat` type widening is a prerequisite that belongs in Phase 1 because every subsequent phase builds on the new type. Four phases total (plus the type-widening grouped into Phase 1) is the minimum that preserves testable intermediate states between phases without over-splitting.

---

#### Phase 1a — Type widening + `MatchState` interface (no new behavior)

**Objective:** Land the breaking `matchFormat` type change and legacy shims, define the engine's `MatchState` shape and typed error classes, and create the `match_play.ts` file — no behavioral functions yet.

**Why split from 1b:** The type widening (`GameInstance.matchFormat`) touches three consumer files and is a behavior-preserving breaking change independently verifiable by tsc + existing test pass. `MatchState` has no dependency on `holeWinner` types (`{ holesUp: number, holesPlayed: number, closedOut: boolean }` per § 5 — plain value object). Keeping type infrastructure separate from first-function behavior mirrors Nassau's Gate 1 / Gate 2 discipline and makes each half individually reviewable.

**Scope:**
- A. Widen `GameInstance.matchFormat` in `src/types/index.ts` (line 71) from `'individual' | 'teams'` to `'singles' | 'best-ball' | 'alternate-shot' | 'foursomes'`.
- B. Apply legacy shim in `src/store/roundStore.ts` (line 155): default for new rounds uses `'singles'`; the legacy `'individual'` literal is replaced.
- C. Apply legacy read shim in `src/components/setup/GameInstanceCard.tsx` (lines 69, 71): render path accepts the two new canonical values in place of the old literals, preserving existing-round display.
- D. Create `src/games/match_play.ts`. Define `MatchState` (singular: `{ holesUp: number, holesPlayed: number, closedOut: boolean }` per § 5), typed error classes (`MatchPlayConfigError`, `MatchPlayBetNotFoundError`), and `initialMatch(cfg): MatchState`. No `holeWinner`, no `settleMatchPlayHole` — skeleton only.
- E. Create `src/games/__tests__/match_play.test.ts` — stub file with a single `it('has a test file', () => { expect(true).toBe(true) })` so the suite registers. Real tests land in Phase 1b.

**Fence:** No `holeWinner`, no `settleMatchPlayHole`, no per-hole scoring. No team formats. No `finalizeMatchPlayRound`. No concession, forfeit, or withdrawal. `src/games/types.ts` untouched. No changes to Skins/Wolf/Stroke Play/Nassau engines.

**Stop-artifact:** All 177 existing tests pass, tsc clean, no new runtime behavior — types and interface only. `src/store/roundStore.ts` and `src/components/setup/GameInstanceCard.tsx` compile without errors (confirmed by `tsc` passing). Portability grep on `match_play.ts` → 0.

**Gate to Phase 1b:** `MatchState` interface reviewed and stable. Type widening compiles. Existing test suite still at 177 + 1 stub.

---

#### Phase 1b — Singles `holeWinner` + `settleMatchPlayHole` + § 10 worked example

**Objective:** Implement the singles per-hole scoring path and verify it end-to-end against the § 10 worked example.

**Scope:**
- A. Implement `holeWinner(state: HoleState, cfg: MatchPlayCfg): 'team1' | 'team2' | 'halved'` for `format: 'singles'` only. Net score = `gross - strokesOnHole(strokes, holeIndex)` per player. Lower net wins; tie halves. Bet-id lookup via `b.id === cfg.id`.
- B. Implement `settleMatchPlayHole(hole, cfg, roundCfg, match) => { events: ScoringEvent[], match: MatchState }` for `format: 'singles'`. Emits `HoleResolved` (`winner: 'team1' | 'team2'`) or `HoleHalved`; emits `MatchClosedOut` with `matchId: cfg.id` and full-stake points when `Math.abs(match.holesUp) > holesRemaining` (inline closeout check per Q5). Returns updated `MatchState`.
- C. Tests: § 12 Test 1 (§ 10 worked example verbatim — 14-hole singles sequence with handicap, `MatchClosedOut` after hole 14 with `holesUp = 6`, `holesRemaining = 4`, deltas `{ A: -1, B: +1 }`, Σ = 0, `Number.isInteger` on all deltas, no events for holes 15–18, exactly 6 `HoleHalved` events on holes 2, 5, 7, 10, 13, 14).

**Fence:** No team format paths in `holeWinner`. No `finalizeMatchPlayRound`. No extra-hole logic. No concession, forfeit, withdrawal, `TeamSizeReduced`. Phase 1a files untouched (no further type widening).

**Stop-artifact:** § 12 Test 1 (§ 10 worked example) passes; all singles-mode `it()` pass; 177 + stub + Phase 1b additions total; tsc clean; portability grep → 0; no `any` / `@ts-ignore` / non-null `!` on untrusted input in `match_play.ts`.

**Gate to Phase 2:** `holeWinner` and `settleMatchPlayHole` signatures reviewed and stable (Phase 2 extends them — a signature change after Phase 2 lands breaks team tests). § 12 Test 1 passing.

---

#### Phase 2 — Team formats (best-ball, alternate-shot, foursomes)

**Objective:** Extend `holeWinner` to handle all four formats, implementing team-score computation and 50%-combined handicap for the two team formats.

**Scope:**
- A. Extend `holeWinner` for `format: 'best-ball'`: per-player net, `Math.min` over team members (handles partial availability per Gap 9 / § 5 clarification; a team forfeits only when all members have missing gross scores).
- B. Extend `holeWinner` for `format: 'alternate-shot'` and `format: 'foursomes'`: single `teamGross` per team, `teamCourseHandicap(hcp1, hcp2)` via `Math.ceil((hcp1+hcp2)/2)` imported from `src/games/handicap.ts`. Confirm `teamCourseHandicap` exists in `handicap.ts` or add it there (per § 2 and REBUILD_PLAN #6 AC).
- C. Add `MatchConfigInvalid` emission: validate `teams` field before scoring (§ 4 contract — length 2, each inner length 2, all IDs in `playerIds`, no duplicates). Emit `MatchConfigInvalid` and return early on any failure.
- D. Extend `settleMatchPlayHole` to route through the team `holeWinner` paths when `format !== 'singles'`.
- E. Implement per-player delta splitting for team formats (§ 8): team delta split equally; remainder absorbed by lowest `playerId` lexicographically via `RoundingAdjustment` event.
- F. Tests: § 12 Test 3 (best-ball team win, per-player delta `{ A: +50, B: +50, C: -50, D: -50 }`, Σ = 0); § 12 Test 4 (`teamCourseHandicap` assertion for alternate-shot, AB=6, CD=8, stroke allocation matches USGA). Additional: foursomes path, `MatchConfigInvalid` on missing/invalid teams, rounding adjustment when `stake % teamSize !== 0`.

**Fence:** No `finalizeMatchPlayRound`. No concession, forfeit, or withdrawal. No extra-hole logic. No `TeamSizeReduced`. `src/types/index.ts` and `src/store/roundStore.ts` untouched (Phase 1 changes already landed).

**Stop-artifact:**
- `npm run test:run` passes. Minimum net-new tests: 8 (Tests 3 + 4 + `MatchConfigInvalid` + rounding).
- `npx tsc --noEmit --strict` zero errors.
- Portability grep clean.
- Zero-sum assertion holds for every point-producing test in the file so far.

**Gate to Phase 3:** All four `format` variants produce correct `holeWinner` results. `MatchConfigInvalid` path verified by test. Team per-player split verified including rounding edge case.

---

#### Phase 3 — End-of-round settlement

**Objective:** Implement `finalizeMatchPlayRound` — Nassau-shaped: settle any still-open match at the round boundary; emit `MatchHalved` with zero deltas on a tied match.

**Scope:**
- A. Implement `finalizeMatchPlayRound(cfg, roundCfg, match) => ScoringEvent[]`. Post-`holesToPlay` boundary: if `match.closedOut`, return `[]` (idempotent); if `match.holesUp !== 0`, emit `MatchClosedOut` with correct per-player deltas; if `match.holesUp === 0`, emit `MatchHalved` with `matchId: cfg.id`, `hole: holesToPlay`, and zero deltas for all `cfg.playerIds`.
- B. For team formats, the tied-match `MatchHalved` delta record includes all four player IDs with `0` values (no `RoundingAdjustment` needed; all zeros divide evenly).
- C. Collapse `tieRule` in `src/games/types.ts` `MatchPlayCfg` from `'halved' | 'extra-holes'` to `'halved'`; remove `extraHolesCap` field. Update callers and test fixtures.
- D. Tests: § 12 Test 2 (`MatchHalved` emitted on tied match, deltas = `{ A: 0, B: 0 }`, Σ = 0); already-closed match returns `[]`; 9-hole match closes out correctly (`holesRemaining = 9 − holesPlayed`); team format tied at `holesToPlay` emits `MatchHalved` with all-zero per-player deltas.

**Fence:** No extra-hole loop. No `ExtraHoleResolved` emission. No concession, forfeit, withdrawal, or `TeamSizeReduced`. No changes to Phase 1 or Phase 2 function signatures.

**Stop-artifact:**
- `npm run test:run` passes. Minimum net-new tests: 4 (Test 2 + already-closed idempotent + 9-hole closeout + team tied).
- `npx tsc --noEmit --strict` zero errors.
- Portability grep clean.
- Zero-sum holds for all tests including halved (Σ = 0 on zero deltas).

**Gate to Phase 4:** `finalizeMatchPlayRound` is exported and stable. Tied-match path tested by name ("MatchHalved" in describe label). Every branch produces a terminal event or empty array.

---

#### Phase 2 retrospective (2026-04-23)

<!-- retrospective 2026-04-23: scope items B (alternate-shot/foursomes holeWinner branch) and F (§ 12 Test 4, teamCourseHandicap handicap tests) were completed as planned, then removed by product decision. teamCourseHandicap deleted from handicap.ts; HoleState.teamGross/teamStrokes deleted from types.ts; 12 tests deleted in the Turn 2 subtractive pass (8 from match_play.test.ts + 4 from handicap.test.ts). See IMPLEMENTATION_CHECKLIST.md Deferred/won't-do for the permanent removal record. -->

---

#### Phase 4a — Round Handicap integration (test-only)

**Objective:** Confirm caller-applies Round Handicap for all four formats by adding integration tests; no engine code changes.

**Scope:**
- A. Integration test (mirrors Nassau Phase 4a / Wolf Test 10 / Stroke Play Test 12): caller passes `state.strokes[pid]` populated from `effectiveCourseHcp = courseHcp + roundHandicap`; engine produces correct net-score outcome. One test for singles, one for best-ball (verifying `effectiveCourseHcp` feeds `teamCourseHandicap` correctly for alternate-shot). Per `docs/games/_ROUND_HANDICAP.md` — no engine change, caller-applies confirmed.

**Fence:** No `match_play.ts` code changes. Test file only.

**Stop-artifact:** Round Handicap integration tests pass, caller-applies confirmed for singles and alternate-shot formats, no engine code changed, tsc clean.

**Gate to Phase 4b:** Round Handicap caller-applies pattern verified and documented in test describe header.

<!-- retrospective 2026-04-23: scope A second test (alternate-shot caller-applies) was completed as planned, then removed by product decision removing alt-shot/foursomes. Only the singles test was retained. Phase 4a net test contribution after subtractive pass: 1 test (not 2). -->

---

#### Phase 4b — Concession handling (Gap 4)

**Objective:** Implement concession at hole/stroke/match level and verify concession-closeout ordering (Gap 4).

**Scope:**
- A. **Concession-closeout ordering** (Gap 4, § 7): extend `settleMatchPlayHole` to handle `state.concession` signal. When a hole concession causes `holesUp > holesRemaining`, emit `ConcessionRecorded` first, then `MatchClosedOut` second, in the same function return. Test: hole concession when `holesUp === holesRemaining − 1` → two-event sequence, `ConcessionRecorded` at `events[0]` and `MatchClosedOut` at `events[1]`.
- B. **Conceded match** (§ 9): `ConcessionRecorded` with `unit: 'match'` ends the match immediately; `settleMatchPlayHole` returns `MatchState.closedOut = true`. § 12 Test 5 (B concedes after hole 10 while 3 down; `ConcessionRecorded` with `unit: 'match'`, deltas `{ A: +1, B: -1 }`, holes 11–18 produce no events, Σ = 0).

**No `events.ts` changes**: `ConcessionRecorded` already exists at `src/games/events.ts:183–188`.

**Fence:** No best-ball partial miss, `TeamSizeReduced`, or `HoleForfeited` in this phase.

**Stop-artifact:** Concession-closeout ordering test passes (event index verified, not just membership), § 12 Test 5 passes, Σ = 0 on conceded-match, tsc clean.

**Gate to Phase 4c:** Concession signal path reviewed and stable in `settleMatchPlayHole`.

---

#### Phase 4c — Best-ball partial miss + `HoleForfeited` (Gap 9)

**Objective:** Implement and test the Gap 9 best-ball partial-miss rule and the `HoleForfeited` path for all formats.

**Scope:**
- A. **Best-ball partial miss** (Gap 9, § 5, § 9): if one team member has a missing gross score and the other has a valid score, the team uses the available player's net (`Math.min` over available entries is vacuously correct). Only if ALL team members have missing scores does the team forfeit. Two tests: (i) one-player missing → `HoleResolved` using remaining player's net; (ii) all missing → `HoleForfeited`.
- B. **`HoleForfeited` for singles and alternate-shot/foursomes**: missing player score in singles or missing `teamGross` in alt-shot/foursomes → `HoleForfeited` emitted. Test: missing `teamGross` entry in alternate-shot → `HoleForfeited`.

**No `events.ts` changes**: `HoleForfeited` already exists at `src/games/events.ts:189–193`.

**Fence:** No `TeamSizeReduced`. No changes to Phase 4b concession logic.

**Stop-artifact:** Best-ball partial-miss tests pass (one-valid-score and all-missing cases), `HoleForfeited` tests pass for singles and best-ball, tsc clean.

**Gate to Phase 4d:** Singles and best-ball `holeWinner` edge cases covered (alt-shot/foursomes removed 2026-04-23; see Deferred/won't-do). `HoleForfeited` path verified.

---

#### Phase 4c retrospective (2026-04-23)

<!-- retrospective 2026-04-23: scope item B (HoleForfeited for alternate-shot/foursomes) was originally in scope but removed by the 2026-04-23 product decision removing alt-shot/foursomes formats. Phase 4c net-new tests cover singles missing-score (Tests 1–2) and best-ball partial-miss/all-missing (Tests 3–5) only; no alternate-shot HoleForfeited test was retained. Final test count after Phase 4c: 235. Engine-level only: HoleForfeited fires on missing gross (hole.gross[p] === undefined); no UI path currently produces missing gross — withdrew, pickedUp, and blank-entry flows are all absent from HoleData (see #12). -->

---

#### Phase 4d — `TeamSizeReduced` (partner withdrawal)

**Objective:** Implement best-ball partner-withdrawal handling and emit `TeamSizeReduced` per § 9. `best-ball` format only — `singles` has no team to reduce.

**Emit-once: Option (i) — caller-convention v2 (stateless engine).** `withdrew` is a per-hole transition signal, not a persistent flag. `HoleState.withdrew[N] = [A]` means "player A transitions out at hole N." Subsequent holes have `withdrew = []` for player A. The caller (bridge item #12) sets `withdrew` on the single transition hole only. The engine emits `TeamSizeReduced` once, on hole N. Persistent exclusion of A from hole N+1 onward is handled by Phase 4c `bestNet` filtering (A has no gross from N+1 onward per caller convention). No `MatchState` extension is required.

**Caller convention (from #12):** `HoleState.withdrew[N] = [A]` on the transition hole only. Subsequent `HoleState.withdrew` arrays do not include A. `TeamSizeReduced.hole = N` (transition hole = first affected hole) matches § 9's "subsequent holes" phrasing.

**Scope:**
- A. When `state.withdrew` on hole N contains a player belonging to a best-ball team, emit `TeamSizeReduced` with `{ hole: hole.hole, teamId: 'team1' | 'team2', remainingSize: 1 }`. `teamId` is `'team1'` when the withdrawing player is in `cfg.teams![0]`, `'team2'` when in `cfg.teams![1]`. No `teamCourseHandicap` call — that function was deleted 2026-04-23. Post-deletion behavior: the remaining player's individual `courseHcp` is already used by the existing `bestNet` computation; no additional handicap logic required.

The engine excludes `withdrew` players from `bestNet` regardless of gross presence — `withdrew` is the authoritative signal for team composition. In practice the caller sets `withdrew` without a gross for the transitioning player, but the engine does not rely on gross being absent. `TeamSizeReduced` is the only Phase 4d-specific event on hole N; normal scoring events (`HoleResolved` or `HoleHalved`) still fire per hole outcome.

**No `events.ts` changes**: `TeamSizeReduced` already exists at `src/games/events.ts:194–199`. Phase 4d is emit-logic only.

**Fence:** No changes to Phase 1a/1b/2/3/4a/4b/4c behavior. No changes to other engine files. No changes to `MatchState` interface. Caller compliance required: the engine does not deduplicate `TeamSizeReduced` across calls — if the caller sets `withdrew = [A]` on multiple successive holes, `TeamSizeReduced` fires each time. Single-hole transition signal is a caller contract enforced by #12, not the engine.

**Stop-artifact:** `TeamSizeReduced` emission test passes (best-ball partner withdrawal → `TeamSizeReduced` on hole N → remaining player's score used on hole N and subsequent holes; A absent on N+1+ via Phase 4c `bestNet` filter); tsc clean; no `any` / `@ts-ignore` / non-null `!` on untrusted input anywhere in `match_play.ts`; zero-sum on every point-producing test in the full file.

Final gate greps:
- `grep 'b\.config === cfg' src/games/match_play.ts` → 0 matches (no reference-identity regression)
- `grep 'b\.id === cfg\.id' src/games/match_play.ts` → at least 1 match (string-id-native confirmed)
- Portability grep on `src/games/match_play.ts` → 0

**Gate to Junk engine (#7):** #6 CLOSED (engine-level — `singles` and `best-ball` AC met). `match_play.ts` fully implemented and tested for both formats. `matchFormat` widening stable, no consumer broken. Engine-level only: `HoleState.withdrew` has no UI writer until #12 lands; production wiring is #12 and does not gate #7. Junk engine (#7) may now proceed — it reads `cfg.junkItems` and `cfg.junkMultiplier` from `MatchPlayCfg`, stable from Phase 1a.

---

#### Phase dependencies

| Phase | Depends on |
|-------|------------|
| Phase 1a | #3 (types.ts churn) + #4 (string-id pattern) landed. `MatchPlayCfg.format` already correct in `src/games/types.ts`. |
| Phase 1b | Phase 1a: `MatchState` interface stable. `holeWinner` signature established here — Phase 2 extends it, so it must not change after 1b gate. |
| Phase 2 | Phase 1b: `MatchState` interface and `settleMatchPlayHole`/`holeWinner` signatures frozen. `teamCourseHandicap` must exist in `src/games/handicap.ts` — verify before starting; add if absent. |
| Phase 3 | Phase 2: all four `holeWinner` format paths pass tests; `MatchConfigInvalid` path verified. `finalizeMatchPlayRound` shares the same `MatchState` threading — team-format paths must be correct before the finalize boundary is tested. |
| Phase 4a | Phase 3: `finalizeMatchPlayRound` stable. Tests only — no engine code change. |
| Phase 4b | Phase 3: `settleMatchPlayHole` stable (concession extends it). Phase 4a: round-handicap tests pass. |
| Phase 4c | Phase 2: best-ball `holeWinner` path stable (partial-miss modifies it). Phase 4b: concession path reviewed. |
| Phase 4d | Phase 4c: singles and best-ball `holeWinner` edge cases covered. Phase 2: `teams` field (best-ball team structure) stable. |

---

### #7 — Junk engine

> Scope-first pass completed 2026-04-24. Decisions A and B locked; topics 3, 4, 10, 11, 12 resolved; phase breakdown drafted. Rules-documenter pass pending (Topics 2, 5, 6, 7, 8, 9 — see "Open" list below).

**Audit references**: partially closes #14 (engine-side rewrite only; cutover of `src/lib/junk.ts` is #11); partially closes #1 (Junk engine is one of four remaining open items under #1's umbrella).

**Acceptance criteria**:
- `src/games/junk.ts` implements `settleJunkHole(hole, config, roundCfg)` and any finalization helpers per `docs/games/game_junk.md` § 5.
- All seven Junk kinds per `JunkKind` type (`ctp | longestDrive | greenie | sandy | barkie | polie | arnie`). `groupResolve` vs `carry` CTP tie-handling per `ctpTieRule`. Longest-drive tie split with `RoundingAdjustment` fallback. Every event is zero-sum within the declaring-bet's bettor set.
- Bet-id lookup uses `b.id === cfg.id` (from #4), never reference identity.
- Emits only existing `ScoringEvent` variants: `JunkAwarded`, `CTPWinnerSelected`, `CTPCarried`, `LongestDriveWinnerSelected`, `RoundingAdjustment`, `FieldTooSmall`. **No new variants added** (confirmed by audit — `events.ts` already covers Junk). If the rule file names a variant not in `events.ts`, the engineer stops and escalates — no invention.
- Test file `src/games/__tests__/junk.test.ts`: § 12 Tests 1–5 (verbatim). Zero-sum asserted.
- `tsc --noEmit --strict` passes. Portability grep empty.
- **No changes to Skins/Wolf/Stroke Play/Nassau/Match Play engines. No changes to `docs/games/game_junk.md`. No deletion of `src/lib/junk.ts` — that is cutover (#11).**

**Files touched**:
- Delete and replace: `src/games/junk.ts` (rebuild — see Decision A below).
- Create: `src/games/__tests__/junk.test.ts`.

**Dependencies**: #4 (string-id pattern). Can run in parallel with #5 or #6 on a different branch if schedule permits.

**Sizing**: **M**. Per-hole scoring is simpler than Wolf; complexity is the event-multiplication rule (one `JunkAwarded` per declaring-bet × junkKind) and the CTP carry logic.

**Risk flags**:
- Rule file has the drift closures from Round 5 Sub-Task 2. Should be cleaner to implement than Nassau or Match Play.
- Naming divergence between `game_junk.md` § 5 pseudocode and canonical `types.ts` fields — see Naming canon check below. Engineer uses canonical `types.ts` names, not the doc pseudocode names.

---

#### Decision A — Rebuild (delete existing 75 LOC)

**Decision: Rebuild.** The existing `src/games/junk.ts` (75 lines) is deleted and replaced.

**Reasoning:**
- 3 of 7 Junk kinds are implemented (CTP, Greenie, Longest Drive). The 4 missing kinds (Sandy, Barkie, Polie, Arnie) are not present.
- The existing 3 items use inlined `if` blocks per kind. `docs/games/game_junk.md` § 5 specifies a `resolveJunkWinner` dispatch switch over `JunkKind`. Adding 4 more `if` blocks diverges further from the doc shape; refactoring the existing 3 items into the dispatch then adding the remaining 4 is structurally a rebuild of the loop body.
- The 75 LOC contains no state accumulated across the 3 working items that would be lost by deletion; the whole file is a pure function with helpers.
- Rebuild is cleaner than a partial completion that leaves the implementation shape misaligned with the spec.

**Engineer action**: delete `src/games/junk.ts` entirely; create a fresh file following the `resolveJunkWinner` dispatch structure from § 5.

---

#### Decision B — §12 Tests 1–5 are the stop-artifact (B1)

**Decision: B1 — §12 passes = #7 closes.** Sandy, Barkie, Polie, and Arnie ship in a follow-up item (see #7b / addendum, to be created after the rules-documenter pass).

**Reasoning:**
- §12 Tests 1–5 exercise CTP (bookkeeping), Greenie (two declaring bets), CTP without Greenie (GIR toggle), non-bettor CTP, and Longest Drive tie. These cover the most common in-round scenarios and the full declaring-bet fan-out logic.
- Sandy, Barkie, Polie, and Arnie have unresolved rules-documenter questions: §5 vs §6 tie-handling conflict, Super Sandy point doubling, Polie three-putt doubled-loss event schema. Implementing them before those decisions risks engine drift that requires rework.
- B2 (all 7 items before close) would make the rules-documenter pass a hard dependency before #7 can close, blocking #8 and downstream.
- The junk engine is immediately usable for the most common case (CTP, Greenie, Longest Drive) after #7 closes under B1. Sandy/Barkie/Polie/Arnie are additive.

**Consequence**: Sandy, Barkie, Polie, Arnie are implemented in their resolver functions (the switch case structure lands as scaffolding — functions present but returning `null` until the rules pass resolves the open topics). They are NOT gated by §12.

---

#### Topic 3 — Bookkeeping event emission

**Decision: `settleJunkHole` emits bookkeeping events (`CTPWinnerSelected`, `LongestDriveWinnerSelected`) as part of its return value.**

The return type is `ScoringEvent[]` (not the narrowed `JunkAwarded[]` used in the current 75 LOC). Bookkeeping events live in the same return slice because:
- `CTPWinnerSelected` and `LongestDriveWinnerSelected` are fired once per hole regardless of declaring-bet count (§ 9: "fires exactly once per hole"). They are logically coupled to the same hole resolution that produces `JunkAwarded` events.
- Pushing bookkeeping events into a separate caller layer would require the caller to know Junk-internal rules (when does CTP fire? when does LD fire?) that belong in `junk.ts`.
- The `game_junk.md` § 5 pseudocode shows the full event list returned from `settleJunkHole`; bookkeeping events appear first, `JunkAwarded` events fan out from them.

The caller layer (bridge item #12, or any future hole-settlement orchestrator) receives the full `ScoringEvent[]` and appends it to the event log; it does not need to split bookkeeping from monetary events.

---

#### Topic 4 — `CTPCarried` in #7 or deferred

**Decision: `CTPCarried` emission is in scope for #7 but is AC-pending until the rules-documenter pass resolves §5/§6 carry handling.**

Rationale: The `CTPCarried` event type already exists in `events.ts`. Emitting it on the transition hole (when `ctpTieRule === 'carry'` and a CTP ties) requires knowing only: (a) the tie occurred, (b) the `fromHole`, and (c) the `carryPoints` accumulation. Items (a) and (b) are specifiable without the full Final Adjustment design. Item (c) requires understanding how `carryPoints` accumulates across multiple carry transitions — this is the rules-documenter dependency.

The Phase 2 scaffold includes the `carry` branch with an AC-pending note. The `CTPCarried` emission is implemented as part of Phase 2 once the rules pass confirms the carry accumulation formula. If the rules pass is not complete before Phase 2, the `carry` branch emits a `CTPCarried` with `carryPoints: 0` as a stub (compilable, non-zero-sum-breaking placeholder) and is flagged as incomplete in the test file.

---

#### Topic 10 — Return type

**Target return type for `settleJunkHole`: `ScoringEvent[]`.**

Based on Topic 3 (bookkeeping events emitted by `settleJunkHole`) and Topic 4 (`CTPCarried` emitted in the same call), the return type must be the full discriminated union, not the narrowed `JunkAwarded[]` used in the current 75 LOC. The existing `JunkAwarded[]` narrowing is a defect in the current implementation — bookkeeping events are currently not emitted by the function at all.

Signature: `settleJunkHole(hole: HoleState, roundCfg: RoundConfig, junkCfg: JunkRoundConfig): ScoringEvent[]`

---

#### Topic 11 — `aggregate.ts` dependency for #7 tests

**Decision: event-log assertion is sufficient for #7's test gate. No `aggregate.ts` stub is required.**

§12 Tests 1–5 assert on emitted events (event kinds, points maps, zero-sum on `event.points`, `Number.isInteger` on deltas). They do not assert on money totals produced by multiplying `points × stake × junkMultiplier` — that aggregation step is `aggregate.ts` territory (#8). The §12 "money at display" figures in the worked example (Test 1) are for human verification; the test asserts `points` values and zero-sum, not rendered money.

`aggregate.ts` is not a dependency for #7 to close. Test 1's money assertions are written as comments, not executable assertions, until #8 lands.

---

#### Topic 12 — Test gate

**Stop-artifact: §12 Tests 1–5 all pass.**

- Test 1: § 10 worked example verbatim (CTP + Greenie fan-out across two declaring bets, bookkeeping events, zero-sum, `Number.isInteger` on all deltas).
- Test 2: Parallel awards (two declaring bets, one `CTPWinnerSelected`, two `JunkAwarded`).
- Test 3: CTP without Greenie (GIR toggle OFF).
- Test 4: Non-bettor CTP winner (zero `JunkAwarded` events).
- Test 5: Tied Longest Drive with 3 eligible bettors (`RoundingAdjustment` present; integer-clean points).

Sandy/Barkie/Polie/Arnie tests are NOT required for #7 close. They are scaffolded as skipped (`it.skip`) in the test file, to be unskipped when the rules-documenter pass is complete and the follow-up item (#7b) is active.

---

#### Naming canon check

Canonical field names from `src/games/types.ts` (verbatim):

**Bets collection on `RoundConfig`** (line 143):
```
  bets: BetSelection[]
```

**Participant list on `BetSelection`** (line 130):
```
  participants: PlayerId[]
```

**Divergence from `game_junk.md` § 5 pseudocode:**
- Doc pseudocode uses `roundCfg.declaringBets` — canonical name is `roundCfg.bets`.
- Doc pseudocode uses `bet.bettors` — canonical name is `bet.participants`.

The existing `junk.ts` (75 LOC) already uses the canonical names (`roundCfg.bets`, `bet.participants`), so no runtime defect exists today. The doc pseudocode is the source of the naming drift. **Engineer uses canonical `types.ts` names.** This is a pointer for the rules-documenter to reconcile the pseudocode in a future doc pass; it is not a blocker for #7.

---

#### Open — rules-documenter pass pending

The following topics are NOT resolved in this pass. They must be resolved before #7b (Sandy/Barkie/Polie/Arnie) can close. They do NOT block #7 (B1 decision above).

- **Topic 2**: §5 vs §6 tie-handling conflict for Sandy, Barkie, Polie, Arnie. §5 `isSandy` returns `null` when candidates > 1 (no award on tie). §6 "all tied winners collect" formula contradicts. Rules doc must state which is authoritative.
- **Topic 5**: `ctpTieRule` optionality fix — typed optional (`ctpTieRule?: 'groupResolve' | 'carry'`) in `types.ts`, but § 4 of `game_junk.md` states the default is `'groupResolve'`. Field should be required with a default expressed in the setup layer, or the optional must be treated as `?? 'groupResolve'` everywhere it is read. Rules-doc must clarify.
- **Topic 6**: Super Sandy point doubling mechanism — §7 states "winner's points × 2" and "each loser's debit × 2 (zero-sum preserved)." The doubling is at the `points` level (event stores doubled values) vs. a separate `superSandy: boolean` flag on the event. Schema decision needed.
- **Topic 7**: Polie invoked + three-putt doubled loss — §7 states "a three-putt after invocation doubles the loss." The event schema for the doubled-loss case is unspecified. Is there a separate event, or does the `JunkAwarded` event carry a `doubled: boolean` flag?
- **Topic 8**: Multi-bet fan-out event ordering guarantee — when multiple declaring bets declare the same Junk kind, §9 states `JunkAwarded` events "fan out" from a single raw-award event. The ordering of those fan-out events relative to each other and relative to the bookkeeping event is not specified. Does order matter for `aggregate.ts`?
- **Topic 9**: Non-bettor CTP → Greenie propagation rule — §9 states "non-bettor CTP → `CTPWinnerSelected` records the winner for bookkeeping; zero `JunkAwarded` events emit." If `ctpWinner` is a non-bettor, does Greenie also suppress (since Greenie derives from CTP)? The §9 edge case is silent on this.

---

#### Rules decisions (rules-pass 2026-04-24)

**Naming canon for plan pseudocode:** Use canonical `types.ts` names throughout — `roundCfg.bets` (not `declaringBets`), `bet.participants` (not `bettors`). Code diverges from `game_junk.md` § 5 pseudocode; the code names are authoritative.

##### Topic 2 — §5 vs §6 tie-handling for Sandy, Barkie, Polie, Arnie

**Decision: §6 is authoritative. §5 is superseded for Sandy/Barkie/Polie/Arnie tie cases.**

§6 contains an explicit tie table drafted specifically to handle all Junk kinds. For Sandy/Barkie/Polie/Arnie it states: "all tied winners collect; with `N` bettors and `w` tied winners, each winner's points = `N − w`, each loser's points = `−w`; zero-sum holds." §5's `resolveJunkWinner` dispatch (and each `isSandy`/`isBarkie`/`isPolie`/`isArnie` function) returns `null` when `candidates.length !== 1` — that is a single-winner constraint in the dispatch helper, written before §6's tie table was developed. The tie table in §6 is the later, more specific specification; it takes precedence.

**Engine consequence for #7b:** `isSandy`, `isBarkie`, `isPolie`, `isArnie` must be revised to return `PlayerId | PlayerId[] | null` (or the calling layer must inspect the full candidate list). The simplest approach is: the individual resolver returns the full `candidates` array (possibly empty, single, or multi), and `settleJunkHole` applies the §6 formula when `candidates.length >= 1`. Zero-sum is guaranteed by the formula. No change to CTP or Longest Drive tie handling — those are governed by separate §6 rows.

**Authority:** `game_junk.md` §6 (tie table, Sandy/Barkie/Polie/Arnie row); §5 pseudocode is informative but superseded for the multi-candidate case.

##### Topic 5 — ctpTieRule optionality

**Decision: (a) Engine-side default. No change to `types.ts`.**

`types.ts` line 119 declares `ctpTieRule?: 'groupResolve' | 'carry'` (optional). `game_junk.md` §4 and §7 both state the default is `'groupResolve'`. The engine resolves `undefined` via `junkCfg.ctpTieRule ?? 'groupResolve'` wherever `ctpTieRule` is read. This requires no types.ts change, avoids a breaking schema change, and is consistent with how other optional config fields with documented defaults are handled in the codebase.

Option (b) — making `ctpTieRule` required in `types.ts` — is rejected. It would require all existing `JunkRoundConfig` construction sites to add the field explicitly, is a larger blast radius for a one-field default, and provides no runtime safety benefit over the `??` coalesce.

**No Phase 1 scope addition required.** The engine author uses `?? 'groupResolve'` in Phase 2 where `ctpTieRule` is first read.

**Authority:** `game_junk.md` §4 (default annotation), §7 (`ctpTieRule` default); `types.ts` line 119.

##### Topic 6 — Super Sandy point doubling

**Decision: The multiplier lives at the `pushAward` call site. `pushAward` receives a `multiplier` argument (default `1`; Super Sandy passes `2`) and computes `points × multiplier` for every player in `bet.participants`. No new event type is needed.**

`game_junk.md` §7 states: "winner's points × 2; each loser's debit × 2 (zero-sum preserved)." The event (`JunkAwarded`) stores the already-multiplied `points` values. Zero-sum is preserved because `(N − 1) × m − (N − 1) × m = 0` for any multiplier `m`.

The alternative — doubling at stake level (`junkMultiplier × 2`) — is rejected. It would alter money rendering for every item under the declaring bet, not just the Super Sandy event, and contradicts the doc's "event stores `points × 2`" phrasing.

Call chain: `isSandy` detects the fairway-bunker condition → `settleJunkHole` determines `multiplier = 2` when `junkCfg.superSandyEnabled && hole.fairwayBunker[winner]` → `pushAward` applies `points × multiplier` → `JunkAwarded.points` stores the doubled values.

`JunkAwarded` in `events.ts` requires no new field. The schema is unchanged.

**Authority:** `game_junk.md` §7 (Super Sandy variant description); `events.ts` `JunkAwarded` type (no `doubled` field present or needed).

##### Topic 7 — Polie invoked + three-putt doubled loss

**Decision: Defer to #7b. File parking-lot item. No schema change in #7.**

`game_junk.md` §7 states "a three-putt after invocation doubles the loss." The doc does not specify what "doubles the loss" means at the event-schema level. §11's `JunkAwarded` shape — `{ kind, timestamp, hole, actor, declaringBet, junk, winner, points }` — has no `doubled` field. `events.ts` has no `doubled` field on `JunkAwarded` and no separate Polie three-putt event type.

Option (a) — `doubled: boolean` on `JunkAwarded` — is a breaking schema change to `events.ts` that must be reviewed against the exhaustive-narrowing test constraint (line 8 of `events.ts`) and affects all consumers of `JunkAwarded`. Option (b) — a new event type — is also a schema change. Both require a rules-documenter ruling on what "doubles the loss" means mechanically (is it losers only, or winner + losers, does zero-sum still hold?).

The three-putt Polie variant is a rare edge case with no §11 coverage and no §12 test case for it. Deferring to #7b keeps #7's schema footprint clean and groups this decision with the other Sandy/Barkie/Polie/Arnie rules.

**Parking-lot item filed** in `IMPLEMENTATION_CHECKLIST.md`: Polie three-putt doubled-loss schema — rules-pass needed before #7b implements `isPolie`; specify whether "doubles the loss" applies to losers only (zero-sum preserved) or all parties; confirm whether `JunkAwarded.doubled: boolean` or a separate event type is the right carrier.

##### Topic 8 — Multi-bet fan-out ordering

**Decision: Declaration order in `roundCfg.bets` (array iteration order). No sort is applied.**

When one hole produces N `JunkAwarded` events for the same Junk kind (one per declaring bet), the events are emitted in the order `roundCfg.bets` is iterated — i.e., the array's natural declaration order. This is deterministic given a fixed `roundCfg.bets` array, requires no sorting pass, and is consistent with the loop structure in the §5 pseudocode.

**Bookkeeping-before-awards rule:** For a given Junk kind, the bookkeeping event (`CTPWinnerSelected` or `LongestDriveWinnerSelected`) is emitted exactly once, before any `JunkAwarded` fan-out events for that kind. Within the fan-out, bet-array iteration order applies. This ordering is a test-assertion requirement: any test that asserts on event index positions must respect this rule.

`aggregate.ts` (#8) sums by `declaringBet` identity, not by event position, so ordering does not affect settlement correctness. The ordering rule exists solely for deterministic test assertions.

**Authority:** `game_junk.md` §9 ("fires exactly once per hole"); §5 pseudocode loop structure.

##### Topic 9 — Non-bettor CTP → Greenie propagation

**Decision: If the CTP winner is not in `bet.participants` for a given declaring bet, no Greenie is awarded for that bet, regardless of GIR status. The `CTPWinnerSelected` bookkeeping event still fires exactly once.**

`game_junk.md` §9 states: non-bettor CTP → "`CTPWinnerSelected` records the winner for bookkeeping; zero `JunkAwarded` events emit." Greenie derives from CTP via the `isGreenie → isCTP` chain in §5. Because the winner check (`if (!bet.participants.includes(winner)) continue`) precedes Greenie emission in the fan-out loop, Greenie is suppressed by the same condition that suppresses CTP.

**§12 Test 4 confirmation:** Test 4 asserts zero `JunkAwarded` events when a non-bettor wins CTP. Test 4's bettor set is `{Bob, Carol, Dave}` with `junkItems = ['ctp']`. If `junkItems` had included `'greenie'`, the same zero-`JunkAwarded` result would hold — no Greenie can emit if no CTP `JunkAwarded` emits for that bet. This is consistent with the decision.

**Authority:** `game_junk.md` §9 (non-bettor CTP edge case); §12 Test 4 (zero `JunkAwarded` assertion).

---

#### Phase breakdown — #7 Junk engine (rebuild + B1)

##### Phase 1 — Delete old file, scaffold engine per doc shape

**Objective:** Delete `src/games/junk.ts`, create a new file with the `resolveJunkWinner` dispatch switch from § 5, implement CTP + Greenie + Longest Drive (the 3 working items from the 75 LOC) using the canonical function shapes. Implement `settleJunkHole` with `ScoringEvent[]` return type and bookkeeping event emission for CTP and Longest Drive.

**Scope:**
- A. Delete `src/games/junk.ts`.
- B. Create `src/games/junk.ts` with: `resolveJunkWinner` dispatch switch, all 7 `JunkKind` arms. CTP/Greenie/Longest Drive arms return `null` stub (`// Phase 2 — full implementation`). Sandy/Barkie/Polie/Arnie arms return `null` stub (`// #7b — rules pass 2026-04-24 pending`). Exhaustive `default` branch (`const _exhaustive: never = kind`). Named exports only.
- C. `settleJunkHole(hole: HoleState, roundCfg: RoundConfig, junkCfg: JunkRoundConfig): ScoringEvent[]` — body returns `[]`. Phase 2 fills in event emission. Named export.
- D. Create `src/games/__tests__/junk.test.ts` — scaffold: import check; one test asserting all 7 `resolveJunkWinner` arms do not throw; one test asserting `settleJunkHole` returns `[]`.

**Fence:** No CTP carry logic, no Longest Drive tie `RoundingAdjustment`, no Sandy/Barkie/Polie/Arnie beyond stubs. No changes to any other engine file.

**Stop-artifact:** `tsc --noEmit --strict` zero errors. Portability grep → 0. Old `junk.ts` absent from repo (confirm via `git status`). New file present and compilable.

**Gate to Phase 2:** `resolveJunkWinner` switch compiles with all 7 arms. `settleJunkHole` signature stable (return type `ScoringEvent[]`, not `JunkAwarded[]` — this is a breaking change from the 75 LOC; must be confirmed before Phase 2 builds on it).

---

##### Phase 2 — CTP + Greenie + Longest Drive (with bookkeeping and tie handling)

**Objective:** Implement CTP (including `CTPWinnerSelected` bookkeeping), Greenie, and Longest Drive (including tie split and `RoundingAdjustment`). Implement `CTPCarried` emission stub (AC-pending rules pass). Wire §12 Tests 1–5.

**Scope:**
- (Absorbs from Phase 1 amendment: isCTP, isLongestDrive, isGreenie named helpers are implemented here, not in Phase 1.)
- A. CTP: emit `CTPWinnerSelected` (once per hole, regardless of declaring-bet count) before the `JunkAwarded` fan-out. `gir` field on `CTPWinnerSelected` sourced from `junkCfg.girEnabled && hole.gir[winner]`.
- B. Greenie: derives from CTP per `isCTP` result and `junkCfg.girEnabled`. Fan-out per declaring bet same as CTP.
- C. Longest Drive: emit `LongestDriveWinnerSelected` (once per hole) before `JunkAwarded` fan-out. Tie handling: `w` tied winners, each winner `points = N − w`, each loser `points = −w`; zero-sum holds. When `(points × stake × junkMultiplier)` has a per-winner cent remainder, emit `RoundingAdjustment` routing remainder to the tied winner with the lowest `playerId` lexicographically.
- D. CTP carry branch: when `junkCfg.ctpTieRule === 'carry'` and a CTP tie exists (UI has not selected `ctpWinner`), emit `CTPCarried` with `hole: hole.hole`, `fromHole: hole.hole`, `carryPoints: 0` (stub — AC pending rules pass). Mark in test file as `// AC-pending: rules pass needed for carry accumulation formula`.
- E. Tests: §12 Test 1 (worked example), Test 2 (parallel awards), Test 3 (GIR toggle OFF), Test 4 (non-bettor CTP), Test 5 (Longest Drive tie). All five pass. Zero-sum asserted on `event.points` for every `JunkAwarded`.

**Fence:** Sandy/Barkie/Polie/Arnie stubs remain returning `null`. `CTPCarried` carry-accumulation logic is `carryPoints: 0` stub only. No `aggregate.ts` dependency.

**Stop-artifact:**
- §12 Tests 1–5 all pass (this is the #7 close gate per Decision B1).
- `npm run test:run` passes — net-new tests from Phase 2 must not break any existing test.
- `npx tsc --noEmit --strict` zero errors. Portability grep → 0.
- Zero-sum assertion holds on every `event.points` map in the test file.
- `Number.isInteger` holds for every `points[p]` and every `RoundingAdjustment.delta`.
- Grep gate: `grep 'bet\.bettors' src/games/junk.ts` → 0 (no doc-pseudocode name leaked into engine).
- Grep gate: `grep 'declaringBets' src/games/junk.ts` → 0 (canonical `roundCfg.bets` used throughout).

**Gate to Phase 3 (Sandy/Barkie/Polie/Arnie — AC pending rules pass):** #7 is CLOSED at Phase 2 stop-artifact. Phase 3 is item #7b (follow-up), gated on the rules-documenter pass completing Topics 2, 5, 6, 7, 8, 9.

---

##### Phase 3 (follow-up item #7b — AC pending rules documenter pass)

Sandy, Barkie, Polie, and Arnie implementation. Not in scope for #7 close. Full AC to be drafted after the rules-documenter pass resolves Topics 2, 5, 6, 7, 8, 9 listed above. Skipped tests in `junk.test.ts` (`it.skip`) serve as the implementation spec placeholders. Per the rules-pass decisions (2026-04-24): §6 governs Sandy/Barkie/Polie/Arnie ties (all tied winners collect, `N − w` / `−w` formula, zero-sum); Super Sandy doubling applies via `multiplier = 2` passed to `pushAward` (no new event type); Polie three-putt doubled-loss schema is parking-lot-deferred and must be resolved before `isPolie` is unskipped.

---

### #8 — `src/games/aggregate.ts`

**Audit references**: closes #10 remainder (pure-function signature contract names `aggregate.ts` for round-total aggregation).

**Acceptance criteria**:
- `src/games/aggregate.ts` provides `aggregateRound(events: ScoringEvent[], roundCfg: RoundConfig): RunningLedger` that walks the event log and produces the `RunningLedger` shape already defined in `src/games/types.ts`.
- Idempotent and pure. Identical input → identical output. No dependence on event ordering beyond `hole` ascending; within a hole, the emit order from per-hole `settle*Hole` functions is preserved.
- Zero-sum assertion holds: `Σ netByPlayer == 0` when every registered game module has settled.
- Test file `src/games/__tests__/aggregate.test.ts`: purity test, zero-sum test against a multi-game round (Skins + Wolf + Stroke Play + Nassau + Match Play + Junk events), per-bet ledger slice.
- `tsc --noEmit --strict` passes. Portability grep empty.
- **No changes to any engine file. No changes to `src/games/types.ts` or `events.ts`. No routing through `src/lib/*`.**

**Files touched**:
- Create: `src/games/aggregate.ts`.
- Create: `src/games/__tests__/aggregate.test.ts`.

**Dependencies**: #5, #6, #7 (for a meaningful multi-game zero-sum test; technically can land with Skins+Wolf+StrokePlay only, but a strong test asks Nassau/Match Play/Junk events to round-trip too).

**Sizing**: **S**. Small module; the complexity is in `RunningLedger` correctness against a realistic event stream.

**Risk flags**: none significant.

---

### #9 — `GAME_DEFS` cleanup

**Audit references**: closes #3 (9 game types with no disabled flag).

**Acceptance criteria**:
- `src/types/index.ts` `GAME_DEFS` entries for `stableford`, `bestBall`, `bingoBangoBongo`, `vegas` gain a `disabled: true` field. The `GAME_DEFS` type literal is widened to include `disabled?: boolean`.
- In-scope games (`strokePlay`, `matchPlay`, `skins`, `nassau`, `wolf`) keep `disabled` unset or `disabled: false` (prefer unset for terseness).
- **No removal of the four non-scope games from the `GameType` union** — AGENTS.md rationale ("keep the extra labels visible in UI but mark non-scope games as disabled") preserved.
- **This item is a pure data-shape change. It adds the flag and widens the type; it does NOT change any UI rendering behavior.** The `GameList.tsx` hide-vs-greyed-out decision belongs to the UI wiring phase and is explicitly out of scope here.
- **No changes outside `src/types/index.ts`.** No test changes (no tests cover this today; adding tests is out of scope).

**Files touched**:
- Modify: `src/types/index.ts` (widen `GAME_DEFS` type; mark 4 entries).

**Dependencies**: none.

**Sizing**: **XS**.

**Risk flags**: none. Type-level change only. UI continues to render all 9 entries unchanged; downstream UI consumers opt into the `disabled` signal when the UI rewrite phase picks it up.

---

### #10 — Prisma `stake` `Float` → `Int` cents migration

**Audit references**: closes #2.

**Acceptance criteria**:
- `prisma/schema.prisma` lines 79 and 98 changed from `Float` to `Int` for `Game.stake` and `SideBet.stake`. Integer represents minor units (cents).
- **Migration strategy: drop and recreate.** Per project baseline, existing data is disposable. The migration does not preserve rows; `npx prisma migrate reset` (or equivalent destructive migration) is acceptable. No data-preservation work required.
- `src/lib/scoring.ts` `formatMoneyDecimal` is preserved during this PR (needed by UI display for the cents-to-dollars render boundary). **Deletion of `formatMoneyDecimal` happens post-cutover, not here.**
- Stake consumers that currently assume dollar values get a conversion-boundary update: the UI display sites (`src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:100`, `src/app/results/[roundId]/page.tsx:66`, `src/app/round/new/page.tsx:48`) continue to use `formatMoneyDecimal` (no behavior change). Engine-side sites in `src/games/*` already treat `stake` as integer (confirmed in audit); no change needed there.
- Existing 100 tests still pass.
- **No deletion of `src/lib/payouts.ts`, `src/lib/junk.ts`, or `src/lib/scoring.ts`** — those are cutover-time deletions/renames in #11.
- **No engine-file changes** beyond what's strictly required by a schema migration (should be zero).

**Files touched**:
- Modify: `prisma/schema.prisma` (two lines).
- Create: `prisma/migrations/<timestamp>_stake_int_cents/migration.sql` (drop-and-recreate shape).
- Possibly modify: `src/store/roundStore.ts:173` if the default stake expression uses a float literal (verify; I don't think it does — the audit evidence suggests integer already in UI).

**Dependencies**: none. Independent track; can interleave with #5/#6/#7.

**Sizing**: **S**. Schema change + disposable-data migration.

**Risk flags**:
- Low. No data to preserve; no pre-migration SELECT needed; no fractional-value reconciliation. Consumer sites that format stake as dollars will display `100` instead of `$1.00` if the conversion boundary isn't preserved — `formatMoneyDecimal` exists for exactly this reason and stays in place until UI rewrite.

---

### #11 — Cutover session (delete `src/lib/*` parallel paths)

**Audit references**: resolves parallel-path carryover from Fixed items #4, #7, #8, #15; deprecated shim from audit #11. Not itself an audit item.

**Strategy (user-confirmed at prompt 004): parallel-path migration, consumer-by-consumer commits with grep gates.** A single-commit cutover was considered and rejected — parallel-path means if consumer N breaks, consumers 1..N-1 still work, and per-commit revert is targeted rather than wholesale.

**Acceptance criteria**:

**Commit 1 — inline handicap re-export:**
- `src/games/handicap.ts` replaces its re-exports from `src/lib/handicap.ts` with inline function bodies (`calcCourseHcp`, `calcStrokes`, `strokesOnHole`). `src/games/` has no remaining dependency on `src/lib/*`.
- `npm run test:run` passes. `tsc --noEmit --strict` passes.
- **Grep gate**: `git grep -rn "from.*['\"][@./]*lib/handicap" src/games/` returns zero matches. **If any match remains, commit 1 is not complete.**

**Commits 2–N — consumer migrations (one commit per consumer or small cluster):**
- Each commit migrates a single consumer or a tightly-coupled small cluster away from `@/lib/payouts` / `@/lib/junk` / `@/lib/handicap` / `@/lib/scoring` to the appropriate `@/games/*` or presentation-tier equivalent.
- `npm run test:run` passes after each commit.
- Proposed sequence (adjustable):
  - Commit 2: `src/store/roundStore.ts` — switch `calcCourseHcp`, `calcStrokes` to `@/games/handicap`.
  - Commit 3: `src/components/scorecard/ScoreRow.tsx` — switch `strokesOnHole` to `@/games/handicap`.
  - Commit 4: rename `src/lib/scoring.ts` → `src/components/util/format.ts`. Update 6 consumer imports. `src/lib/scoring.ts` does NOT exist after this commit (git-rename semantics).
  - Commit 5: migrate `defaultJunk`, `syncJunkAmounts`, `hasGreenieJunk`, `hasAnyJunk` consumers (4 files) from `@/lib/junk` to the equivalents in `@/games/junk` (provided by #7) or a thin `src/games/junk-config.ts`.
  - Commit 6: migrate `src/app/results/[roundId]/page.tsx` and `src/app/bets/[roundId]/page.tsx` from `computeAllPayouts` to `aggregateRound` (from #8), wrapping output via `payoutMapFromLedger(ledger: RunningLedger): PayoutMap` in the presentation tier. Adapter confirmed at prompt 003 to stay one release cycle.

**Final deletion commit:**
- Delete: `src/lib/payouts.ts`, `src/lib/junk.ts`, `src/lib/handicap.ts` (the deprecated shim). `src/lib/scoring.ts` already gone from commit 4's rename.
- Preserve: `src/lib/prisma.ts` (Prisma client singleton — not a scoring target; not subject to cutover).
- **Grep gates (all three must return zero matches before the deletion commit lands)**:
  - `git grep -rn "from.*['\"][@./]*lib/payouts" src/` → 0.
  - `git grep -rn "from.*['\"][@./]*lib/junk" src/` → 0.
  - `git grep -rn "from.*['\"][@./]*lib/handicap" src/` → 0.
- `npm run test:run` passes. `tsc --noEmit --strict` passes. A manual smoke test of the app's three main screens (scorecard, bets, results) produces correct deltas against a known multi-game round.

**Cross-commit fence**:
- **No new engine features during #11. No test additions beyond what's required to keep existing tests green. No UI rewrite — adapter handles the `PayoutMap` / `RunningLedger` shape mismatch, and UI rewrite is explicitly deferred.**

**Divergence-window disclosure**: during commits 2–N (estimated elapsed time: one to a few days), different pages of the app call different scoring paths. Users navigating between migrated and unmigrated pages may see different numbers for the same round. For a pre-v1 app with no production users this is acceptable; for v1+ rollout a feature flag or transient banner would be advisable.

**Consumer migration table** (what each commit above touches):

| Consumer | Current import | Replace with | Target commit |
|---|---|---|---|
| `src/store/roundStore.ts:7` | `calcCourseHcp, calcStrokes` from `@/lib/handicap` | `@/games/handicap` | 2 |
| `src/components/scorecard/ScoreRow.tsx:4` | `strokesOnHole` from `@/lib/handicap` | `@/games/handicap` | 3 |
| `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:8` | `vsPar` from `@/lib/scoring` | `@/components/util/format` | 4 |
| `src/app/scorecard/[roundId]/page.tsx:14` | `vsPar` | Same | 4 |
| `src/app/results/[roundId]/page.tsx:6` | `formatMoneyDecimal, vsPar` | Same | 4 |
| `src/app/bets/[roundId]/page.tsx:5` | `vsPar, parLabel, parColor, formatMoney` | Same | 4 |
| `src/components/scorecard/ScoreRow.tsx:5` | `vsPar, parLabel, parColor` | Same | 4 |
| `src/components/layout/LiveBar.tsx:4` | `vsPar` | Same | 4 |
| `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx:9` | `hasGreenieJunk` from `@/lib/junk` | `@/games/junk` (from #7) | 5 |
| `src/app/scorecard/[roundId]/page.tsx:13` | `hasGreenieJunk` | Same | 5 |
| `src/app/round/new/page.tsx:12` | `hasAnyJunk` from `@/lib/junk` | Same | 5 |
| `src/store/roundStore.ts:8` | `defaultJunk, syncJunkAmounts` from `@/lib/junk` | Same | 5 |
| `src/app/results/[roundId]/page.tsx:7` | `computeAllPayouts` from `@/lib/payouts` | `aggregateRound` from `@/games/aggregate` (+ `payoutMapFromLedger` adapter) | 6 |
| `src/app/bets/[roundId]/page.tsx:6` | Same | Same | 6 |

`src/lib/scoring.ts` is NOT a scoring-engine file despite its name. Rename to `src/components/util/format.ts` during commit 4; do not delete.

**Dependencies**: #5, #6, #7, #8 must all land before commits 5–6 (#7 provides `@/games/junk` helpers; #8 provides `aggregateRound`). Commits 1–4 can start once #3 and #4 land.

**Sizing**: **M**. Mechanical consumer migration distributed across ~7 commits; risk comes from correctness-verification, not line count.

**Risk flags**:
- Highest-severity risk in the plan. Mitigation: parallel-path sequence with grep gates bounds the blast radius to one commit at a time.
- `PayoutMap` vs `RunningLedger` shape mismatch handled by adapter — kept one release cycle, removed in UI rewrite phase.
- **Revert path**: `git revert <commit-N>` returns a single consumer to the old path. The engine files `src/games/*.ts` remain throughout; the only thing that can be lost is the consumer-migration commit itself. No data loss.
- Divergence-window risk is explicit and acceptable for pre-v1.

---

### #12 — HoleData ↔ HoleState bridge

Wire `withdrew`, `pickedUp`, and `conceded` from `HoleData` into `HoleState`; add covering-score indicator field; guard `setScore(0)` at store boundary; add `PlayerWithdrew` UI writer for Wolf and UI caller for Nassau's `settleNassauWithdrawal`.

**Dependencies**: #6 Phase 4d landed (engine-level `withdrew` consumed), #7 (Junk engine, for complete engine surface before bridge AC is drafted). Full AC drafted after A/B/C decision and Phase 4d close.

**Sizing**: **L** (placeholder — not yet scoped for implementation).

---

## Deferred (not touched by this plan)

Carried forward from AUDIT.md; no work in this phase.

- **#18** — Role-holder disconnect quorum override (v2 deferred). Variant stays in the union; no code emits it this phase. Single sentence acknowledgment.
- **Audit #9 sub-gap** — ScoringEvent Prisma model. Post-rebuild.
- **Audit #17 sub-gap** — Final Adjustment engine logic + UI. Post-rebuild.
- **Hole-state builder** — Post-cutover, UI-integration phase.
- **UI wiring / Zustand store migration** — Post-cutover.
- **Player abandonment / `PlayerWithdrew` UI flow** — Deferred indefinitely.
- **Comeback Multiplier** — Deferred to PlayerDecision design round.
- **`PlayerDecision` generic mechanism** — Deferred to its own design round.

## Dependency graph

```
#3 (Wolf cleanups) ──> #4 (bet-id refactor)
                             │
                             ├──> #5 (Nassau)
                             ├──> #6 (Match Play)
                             └──> #7 (Junk)

#5, #6, #7 ──> #8 (aggregate.ts)

#9 (GAME_DEFS)    ─── independent
#10 (Prisma Int)  ─── independent

#11 (cutover)     ─── parallel-path; commits 1–4 start once #3, #4 land; commits 5–6 require #7, #8
```

Parallelization opportunities: #9 and #10 can run any time. #5 + #6 + #7 can parallelize after #3 and #4 land (three independent engines). #11 commits 1–4 can interleave with engine work; commits 5–6 are final.

## Risk register (consolidated)

| Risk | Item | Severity | Mitigation |
|---|---|---|---|
| Prisma `Float → Int` schema change | #10 | Low | Drop-and-recreate per disposable-data baseline. No preservation work. |
| `matchFormat` widening breaks consumers | #6 | Medium | Legacy-value mapping (`'individual'→'singles'`, `'teams'→'best-ball'`) as one-way migration shim; new rounds pick from full 4-format UI. |
| Cutover correctness across 14 consumers | #11 | Medium (was High) | Parallel-path strategy with grep gates per commit. Downgrade reflects commit-level revert granularity. |
| `src/lib/scoring.ts` name misleadingly implies scoring-engine content | #11 | Low | Rename to `src/components/util/format.ts` rather than delete; preserve display helpers. |
| Rule-file spec gaps for Nassau / Match Play | #5, #6 | Medium | Log divergences to `/tmp/round-6-notes.md`; follow Wolf pattern. |
| `WolfCaptainTiebreak` variant reserved vs removed | #3 | Low | User decision: keep reserved. One-line comment suffices. |
| Missed `id` fixture in a test file | #4 | Low | TypeScript surfaces missing field at compile time. |
| Divergence window during cutover (migrated vs unmigrated pages) | #11 | Low | Acceptable for pre-v1; feature flag available if needed. |

## Open questions for user before #3 starts

None. All three previously-paused items resolved at prompt 004:
- #6 legacy-value mapping: confirmed (`'individual'→'singles'`, `'teams'→'best-ball'`; migration shim only, new rounds use full 4-format UI).
- #11 cutover strategy: confirmed (parallel-path with grep gates).
- Flag D bet-id refactor: confirmed (included as new #4).

## Sizing totals

| Item | Size |
|---|---|
| #3 | S |
| #4 | S |
| #5 | L |
| #6 | L |
| #7 | M |
| #8 | S |
| #9 | XS |
| #10 | S |
| #11 | M |

Rough effort order: S + S + L + L + M + S + XS + S + M. Three parallel tracks possible (engines #5/#6/#7 after #3+#4 land; infrastructure #9/#10 interleaved; cutover #11 commits 1–4 can start as soon as #4 lands).

---

## Plan status

**Awaiting user approval.** No code changes until the user signs off. #2 (this rebuild plan) stays Active until sign-off; #3 then becomes Active.
