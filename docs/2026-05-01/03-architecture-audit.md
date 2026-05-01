---
prompt_id: 03
timestamp: 2026-05-01
checklist_item_ref: "Architecture audit — engine + bridge + state layers"
tags: [audit, architecture, nassau-sequencing]
---

## §1 Scope and Method

### Scope

Target files (read-only):
- `src/games/` — skins.ts, wolf.ts, nassau.ts, match_play.ts, stroke_play.ts, handicap.ts, aggregate.ts, events.ts, types.ts, junk.ts (all engines + event union)
- `src/bridge/` — skins_bridge.ts, stroke_play_bridge.ts, wolf_bridge.ts, shared.ts
- `src/store/roundStore.ts`
- `src/types/index.ts` — GAME_DEFS, HoleData, shared types
- `src/lib/payouts.ts`, `src/lib/perHoleDeltas.ts` — dispatch surfaces
- `src/lib/handicap.ts` — legacy transitional file

Reference (not target): `AGENTS.md` ground rules section.

### Method

Codex adversarial-review was attempted but failed with `401 Unauthorized` on `api.openai.com/v1/responses` despite successful `codex login --device-auth` — root cause: the companion script v1.0.4 uses `source: app-server` mode which expects auth token injection from the Claude Code extension server; the ChatGPT device auth token is not automatically forwarded to the OpenAI Responses API in a direct shell invocation. Three separate attempts all 401'd.

This report is a **manual code-reading audit** covering the same framing prompt. All target files were read in full within this session.

---

## §2 Codex Output (verbatim)

```
[codex] Starting Codex task thread.
[codex] Thread ready (019de42b-95a7-7671-9eb1-b35c7bbdc8c9).
[codex] Turn started (019de42b-95bc-7183-abfe-b048e5a1b70c).
[codex] Codex error: Reconnecting... 2/5
...
[codex] Codex error: unexpected status 401 Unauthorized: Missing bearer or basic authentication
  in header, url: https://api.openai.com/v1/responses,
  cf-ray: 9f4fd76fea8ea348-SEA, request id: req_ee4181bf180343718b2512bb7cdbef8b
[codex] Turn failed.
# Codex Adversarial Review
Codex did not return valid structured JSON.
- Parse error: unexpected status 401 Unauthorized: Missing bearer or basic authentication in header,
  url: https://api.openai.com/v1/responses, cf-ray: 9f4fd76fea8ea348-SEA,
  request id: req_ee4181bf180343718b2512bb7cdbef8b
```

All three probe runs (plain review, minimal adversarial probe, full adversarial review) returned identical 401 errors. No Codex findings were produced.

---

## §3 Findings Triage Table

10 findings from manual code reading. Severity: **High** = blocks correctness or safety; **Medium** = violates a ground rule or creates integration risk; **Low** = cosmetic or edge-case risk.

| # | Finding | Severity | File:Line | Invariant | Code Triage | Cross-reference |
|---|---|---|---|---|---|---|
| F1 | Handicap math in `payouts.ts` bypasses `src/games/handicap.ts` | Medium | `payouts.ts:2,39,40,64,65,92` | #5 handicap-in-one-place | ACCEPT | MIGRATION_NOTES.md item 11; IMPLEMENTATION_CHECKLIST.md "Stale rebuild-context" |
| F2 | `roundStore.ts` imports from deprecated `src/lib/handicap` | Medium | `roundStore.ts:7` | #5 handicap-in-one-place | ACCEPT | MIGRATION_NOTES.md item 11 |
| F3 | `setPress(hole, gameKey)` stores game UUID — not Nassau match ID | **High** | `roundStore.ts:320-323` | Bridge contract | ACCEPT | NASSAU_PLAN.md NA-3 (already proposes `setPressConfirmation`) |
| F4 | `computeMatchPlay` and `computeNassau` bypass ScoringEvent emission | Medium | `payouts.ts:21-49`, `52-80` | #6 every delta emits ScoringEvent | ACCEPT | IMPLEMENTATION_CHECKLIST.md #11 full cutover deferred |
| F5 | Stroke Play / Match Play remainder absorbed silently (no `RoundingAdjustment` event) | Low | `stroke_play.ts:343-350`, `match_play.ts:139-146` | #7 no silent defaults | DEFER-TO-GM | `RoundingAdjustment` schema exists but marked "dead" in aggregate.ts |
| F6 | Nassau: bridge MatchState vs `aggregate.ts::buildMatchStates` consistency invariant unspecified | **High** | `aggregate.ts:170-319`, `nassau.ts:202-247` | Bridge generalization | ACCEPT | NASSAU_PLAN.md NA-1 R1 — add explicit test AC |
| F7 | `perHoleDeltas.ts` + `payouts.ts` nassau cases must land in one atomic commit at NA-1 | Medium | `perHoleDeltas.ts:47`, `payouts.ts:116` | Bridge generalization | ACCEPT | NASSAU_PLAN.md NA-1 Fence |
| F8 | `aggregate.ts` stale phase comments ("Phase 1/2/3 scope") — Phase 3 already complete | Low | `aggregate.ts:1-18` | Cosmetic | ACCEPT | IMPLEMENTATION_CHECKLIST.md "Stale rebuild-context" parking-lot entry |
| F9 | `src/games/handicap.ts` re-exports from `src/lib/handicap.ts` — two-hop portability risk | Low | `games/handicap.ts:15-16` | #4 portability | ACCEPT | MIGRATION_NOTES.md item 11; resolves at #11 cutover |
| F10 | `hydrateRound` loses Nassau-specific config fields (`pressRule`, `pressScope`, `pairingMode`) | Medium | `roundStore.ts:263-270` | Bridge generalization | ACCEPT | NASSAU_PLAN.md NA-2 §R5 (Explore gate item) |

---

### Detailed Finding Notes

#### F1 — Handicap math in `payouts.ts` bypasses `src/games/handicap.ts`

`src/lib/payouts.ts:2` imports `strokesOnHole` from `'./handicap'` (the deprecated `src/lib/handicap.ts`), not from `src/games/handicap.ts`. Three call sites: lines 39, 40 (computeMatchPlay), 64, 65 (computeNassau), 92 (computeStableford). Ground rule 5 requires handicap math to live only in `src/games/handicap.ts`.

This is the known transitional state during MIGRATION_NOTES.md item 11. The functions are identical — `src/games/handicap.ts` re-exports from `src/lib/handicap.ts` — so there is no behavioral divergence. Risk is low but the invariant is violated. Resolves at #11 cutover when legacy functions are replaced by bridges.

**Proposed remediation:** No immediate action. Add a comment to `payouts.ts:2` noting the import is transitional (alongside the existing `@deprecated` pattern). Sweep at #11 cutover.

---

#### F2 — `roundStore.ts` imports from deprecated `src/lib/handicap`

`roundStore.ts:7`: `import { calcCourseHcp, calcStrokes } from '@/lib/handicap'`. Same invariant violation as F1, different file. Same resolution path.

---

#### F3 — `setPress(hole, gameKey)` stores game UUID, not Nassau match ID

`roundStore.ts:320-323`:
```typescript
setPress: (hole, gameKey) => set((state) => ({
  holes: state.holes.map(h =>
    h.number === hole ? { ...h, presses: [...(h.presses || []), gameKey] } : h
  ),
})),
```

`gameKey` is a game instance UUID (e.g. `"a1b2c3d4"`). `HoleData.presses` is typed as `string[]` and the caller passes game IDs.

But Nassau's `PressConfirmation.parentMatchId` (nassau.ts:163) expects `'front'`, `'back'`, `'overall'`, or `'press-N'`. The two namespaces are incompatible — a game UUID will never match a matchId.

**Impact on Nassau bridge (NA-3):** If the bridge reads `holeData.presses?.includes(matchId)` it will never find a match for auto-press confirmation, silently skipping all presses. This would be a silent correctness bug.

**Resolution:** NASSAU_PLAN.md NA-3 already correctly proposes a NEW `setPressConfirmation(hole, matchId)` Zustand action — not reusing `setPress`. This is the right design. The existing `setPress` has **no active callers in the UI** (confirmed: no calls in `src/app/scorecard/[roundId]/page.tsx`). It appears to be a stale stub.

**Proposed remediation:** Add a comment to `setPress` noting the semantic mismatch with Nassau match IDs. Rename or deprecate if it remains unused after NA-3. File as a parking-lot item.

---

#### F4 — Legacy payouts bypass ScoringEvent emission

`payouts.ts::computeNassau` (lines 52-80) and `computeMatchPlay` (lines 21-49) return `PayoutMap` directly without any `ScoringEvent` being emitted. Ground rule 6 requires every delta to emit a typed event. These paths were never wired to the event-sourced engine.

These are known legacy paths that will be replaced by bridges: Nassau in NA-1, Match Play in the Match Play phase. The Skins and Wolf paths (lines 118-126) are already on the correct engine bridge path. Stroke Play (lines 111-114) is also correct.

**Impact:** Any `computeNassau`/`computeMatchPlay` settlement is not recorded in the `ScoringEventLog`, which means `aggregateRound` cannot reconstruct the settlement history. This is acceptable for the legacy path since Nassau/Match Play are still `disabled: true` in production.

---

#### F5 — Winner-takes-pot remainder absorbed without `RoundingAdjustment` event

`stroke_play.ts:343-350`:
```typescript
const perWinner = Math.floor(loserPot / winners.length)
const remainder = loserPot - perWinner * winners.length
// ... if remainder > 0, points[absorbingPlayer] += remainder
```

The remainder IS handled (not dropped) — it's absorbed by the lexicographically-first winner. This is deterministic and zero-sum. However, no `RoundingAdjustment` event is emitted when `remainder > 0`. The `RoundingAdjustment` event type exists but `aggregate.ts` comments label it as "dead schema (never emitted under integer-only mandate)".

Same pattern in `match_play.ts:139-146` (`splitToTeam`).

A concrete case: 4 players, 3 tied winners (winner-takes-pot), stake=100. `loserPot = 100`, `perWinner = Math.floor(100/3) = 33`, `remainder = 1`. One winner gets 34, two get 33. Correct settlement, zero-sum, but the 1-cent rounding is invisible in the event log.

**Proposed remediation (DEFER-TO-GM):** Two options:
- (A) Accept current behavior: absorb-first-winner convention is the rounding rule; no additional event needed; the aggregate already matches.
- (B) Emit `RoundingAdjustment` event when `remainder > 0`, making the absorb visible in the audit trail.

Option A is simpler and the current test suite already validates the behavior. Option B provides better audit fidelity. Decision is a product call.

---

#### F6 — Nassau bridge MatchState vs aggregate.ts consistency invariant (HIGH)

`aggregate.ts::buildMatchStates` (lines 170-319) rebuilds `MatchState[]` from the event log by replaying `NassauHoleResolved`, `NassauHoleForfeited`, `PressOpened`, `NassauWithdrawalSettled`, and `MatchClosedOut` events. This is the source of truth for `aggregateRound`.

The new `nassau_bridge.ts` will also maintain `MatchState[]` as it iterates holes. If the bridge produces events in the correct order and with complete coverage, `buildMatchStates(events) === bridge.finalMatches` will hold.

**Risk:** If the bridge:
- Calls `openPress` but doesn't emit `PressOpened` before the next `settleNassauHole` call
- Emits events out of hole order (rare but possible if holes are unsorted)
- Skips `PressOpened` for a zero-hole press (which IS correctly handled — `PressVoided` is emitted and `openPress` returns early without adding MatchState)

Then `buildMatchStates` will diverge from the bridge's internal MatchState. This would cause `aggregateRound` to compute a different settlement than `settleNassauBet`.

**Critical: the bridge-level test AC for NA-1 must include:**

```typescript
const { events } = settleNassauBet(holes, players, game)
const { nassauMatches } = buildMatchStates({ events, supersessions: {} }, roundCfg)
// Assert: nassauMatches matches the bridge's internally computed final matches
```

This test does not currently exist (nassau_bridge.ts doesn't exist yet). Must be added in NA-1.

**Proposed remediation:** Add to NASSAU_PLAN.md NA-1 AC: "Bridge test must assert `buildMatchStates(events, roundCfg).nassauMatches` matches bridge's final MatchState for a round with at least one press."

---

#### F7 — `perHoleDeltas.ts` + `payouts.ts` nassau cases must be atomic at NA-1

`perHoleDeltas.ts:47`: `default: return []` silently returns no events for nassau.
`payouts.ts:116`: `case 'nassau': return computeNassau(...)` produces payouts without events.

After NA-1 lands:
- `payouts.ts` `case 'nassau'` → routes through `settleNassauBet` bridge
- `perHoleDeltas.ts` `case 'nassau'` → returns `settleNassauBet(...).events`

Both must land in the same commit. If only `payouts.ts` is updated, the scorecard would show correct end-of-round settlement but $0 per-hole in BetDetailsSheet. If only `perHoleDeltas.ts` is updated, the per-hole display would show deltas but the results page settlement would be stale legacy.

**Proposed remediation:** Confirmed already in NASSAU_PLAN.md NA-1 Fence ("payouts.ts nassau case, perHoleDeltas.ts nassau case"). No new action needed — ensure the NA-1 AC explicitly calls out both file changes in the same commit.

---

#### F8 — `aggregate.ts` stale phase comments

`aggregate.ts:1-18` comments reference "Phase 1 scope", "Phase 2 adds Skins + Wolf", "Phase 3 adds Nassau + Match Play". Phase 3 is already fully implemented. The comments mislead a new reader into thinking Nassau/Match Play aren't yet wired in `aggregateRound`.

**Proposed remediation:** One-pass comment update to `aggregate.ts:1-18`. Can fold into NA-1 commit (touching the same file) or any housekeeping prompt. Add to parking lot.

---

#### F9 — `src/games/handicap.ts` re-export chain

`src/games/handicap.ts:15-16`:
```typescript
export { calcCourseHcp, calcStrokes, strokesOnHole } from '../lib/handicap'
```

This re-export chain means `src/games/handicap.ts` is not truly self-contained — it depends on `src/lib/handicap.ts`. For React Native portability, the concern is: any non-portable code added to `src/lib/handicap.ts` would silently propagate into `src/games/`. Currently `src/lib/handicap.ts` is pure math with no framework imports, so this is safe. Risk increases if the migration is deferred long enough that someone adds a framework import to `src/lib/handicap.ts` without realizing it propagates.

**Proposed remediation:** No immediate action. Note the dependency. Resolves at MIGRATION_NOTES.md item 11 when `src/lib/handicap.ts` is deleted and functions inlined into `src/games/handicap.ts`.

---

#### F10 — `hydrateRound` loses Nassau-specific GameInstance config fields

`roundStore.ts:263-270`:
```typescript
const games: GameInstance[] = apiGames.map(g => ({
  id: String(g.id),
  type: g.type as GameType,
  label: GAME_DEFS.find(d => d.key === g.type)?.label ?? g.type,
  stake: g.stake,
  playerIds: g.playerIds.map(String),
  junk: defaultJunk(g.stake),
}))
```

No `pressRule`, `pressScope`, or `pairingMode` fields are mapped from the API response. After hydration, a Nassau `GameInstance` will have `pressRule: undefined`, `pressScope: undefined`, `pairingMode: undefined`. The Nassau bridge's `buildNassauCfg(game)` will receive undefined for these fields and must either throw or silently use defaults.

**Impact:** A hydrated Nassau round (resumed from DB after page reload) will have incorrect/default press configuration. User-configured `pressRule: 'auto-2-down'` will silently revert to `undefined`.

**Proposed remediation:** This is the NA-2 Explore gate item in NASSAU_PLAN.md §R5. Before NA-2, the engineer must:
1. Confirm `Game` Prisma model stores `pressRule`, `pressScope`, `pairingMode` as typed columns or JSON.
2. Confirm GET /api/rounds/[id] serializes these fields in the games array.
3. Add mapping in `hydrateRound` for Nassau-specific fields.
If a DB migration is needed, file as an Approval Gate item before NA-2 proceeds.

---

## §4 Recommended IMPLEMENTATION_CHECKLIST.md Entries

New parking-lot items to add:

| # | Item | Source | Priority |
|---|---|---|---|
| PL-1 | `setPress(hole, gameKey)` semantic mismatch with Nassau match IDs — document or rename | F3 above | Before NA-3 |
| PL-2 | Emit `RoundingAdjustment` event when winner-takes-pot/splitToTeam remainder > 0 — GM decision needed | F5 above | GM decision |
| PL-3 | Nassau bridge test AC: assert `buildMatchStates(events, cfg) === bridge.finalMatches` for round with one press | F6 above | NA-1 AC addition |
| PL-4 | `aggregate.ts:1-18` stale phase comments — update to reflect Phase 3 complete | F8 above | Cosmetic; fold into NA-1 commit |

Existing tracked items that cover remaining findings:
- F1, F2, F9 → MIGRATION_NOTES.md item 11 (handicap migration, tracked)
- F4 → IMPLEMENTATION_CHECKLIST.md #11 full cutover (tracked)
- F7 → NASSAU_PLAN.md NA-1 Fence (already covers both files)
- F10 → NASSAU_PLAN.md NA-2 §R5 (already called out as Explore gate)

---

## §5 Findings That Affect Nassau Sequencing

The following findings bear directly on the Nassau sequencing decision (Option A bridge-first vs. other options):

### F3 — `setPress` semantic mismatch (HIGH, affects NA-3 timing)

**Impact on sequencing:** The existing `setPress(hole, gameKey)` is not usable for Nassau press confirmation — it stores game UUIDs, not match IDs. NA-3 (`setPressConfirmation`) must add a new Zustand action. This is already in the plan, but the engineer must NOT accidentally reuse `setPress`. The NA-3 scope statement in NASSAU_PLAN.md should explicitly note this.

**Sequencing implication:** Does not change the recommended Option A sequencing. NA-1 (bridge) and NA-2 (wizard) are unaffected by press confirmation storage. NA-3 adds the new action. No resequencing needed.

### F6 — Bridge/aggregate MatchState consistency invariant (HIGH, affects NA-1 AC)

**Impact on sequencing:** This is the most significant architectural finding. The Nassau bridge must produce a complete, ordered event log that `buildMatchStates` can replay to get the same final state. This is a testable invariant that must be part of NA-1 AC.

**Sequencing implication:** Favors Option A (bridge-first) because this invariant is foundational — it must be proven by the bridge tests before any UI work (NA-2, NA-3) proceeds. If Option C (combined bridge+wizard) were chosen, a bridge correctness bug would block the wizard from closing, which is worse. Option A's split between NA-1 and NA-2 isolates the risk.

**Recommendation:** Add the explicit `buildMatchStates(events) === bridge.finalMatches` test AC to NASSAU_PLAN.md NA-1 before NA-1 begins.

### F10 — `hydrateRound` loses Nassau config fields (MEDIUM, gates NA-2)

**Impact on sequencing:** The `Game` Prisma model and API serialization must be confirmed before NA-2 can close. If `pressRule`/`pressScope`/`pairingMode` are not stored in the DB, a migration is required. This is a potential Approval Gate for NA-2.

**Sequencing implication:** Favors keeping NA-2 separate from NA-1 (i.e., Option A over Option C). If bridge and wizard are combined in one pass and the Explore phase of that pass reveals a DB migration is needed, the bridge work is blocked while the migration is planned. Keeping them separate means NA-1 can close independently of the DB field question.

### F7 — Atomic `payouts.ts` + `perHoleDeltas.ts` commit (MEDIUM, NA-1 commit discipline)

**Impact on sequencing:** Confirms that NA-1 cannot partially update one dispatch surface. The bridge must land both `payouts.ts` and `perHoleDeltas.ts` in the same commit. Already in the NA-1 Fence; reiterated here for emphasis.

---

## §6 Invariants: Audit Summary (Pass / Finding / N/A)

| Invariant | Status | Notes |
|---|---|---|
| 1. Rules-from-docs | PASS | All engines have `docs/games/game_<name>.md` pointers in comments |
| 2. Integer-unit math in src/games/ | PASS | No Float, no toFixed found in engine files |
| 3. Zero-sum settlement | PASS | `aggregate.ts` throws `ZeroSumViolationError`; bridge ledger tests assert zero-sum |
| 4. Portability (no next/react/dom) | PASS | No framework imports in src/games/ or src/bridge/; lib/handicap.ts re-export is transitional (F9, low risk) |
| 5. Handicap-in-one-place | FINDING | `payouts.ts` and `roundStore.ts` still use `src/lib/handicap.ts` (F1, F2 — transitional, tracked) |
| 6. Every delta emits ScoringEvent | FINDING | Legacy `computeNassau` / `computeMatchPlay` bypass event emission (F4 — transitional, tracked) |
| 7. No silent defaults | FINDING (low) | Winner-takes-pot remainder absorbed without RoundingAdjustment event (F5 — defer to GM) |
| 8. Bet-id lookup is string-equality | PASS | All aggregate.ts and engine lookups use `=== ` string comparison |
| Bridge generalization: Skins/Wolf → Nassau | FINDING (HIGH) | MatchState consistency invariant unspecified in NA-1 AC (F6); setPress semantic mismatch (F3); hydrateRound config loss (F10) |
| ScoringEvent coverage for Nassau | PASS | PressOffered, PressOpened, PressVoided, NassauHoleForfeited, NassauWithdrawalSettled all present in events.ts |
| payouts.ts / perHoleDeltas.ts third-bet risks | PASS (with note) | `default:` fallthrough is safe; atomic commit discipline required at NA-1 (F7) |

---

## Verify

- tsc: clean (no source changes — 0 TypeScript errors before or after)
- vitest: 441/441 (no source changes)
- Report only: single commit covers `docs/2026-05-01/03-architecture-audit.md`

---

**Awaiting GM review of architecture audit. Findings affecting Nassau sequencing flagged in §5. NA-1 blocked until GM confirms sequencing.**
