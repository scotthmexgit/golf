# Pass 4 — Verifier broken-log fixture taxonomy

Date: 2026-04-24  
Status: COMPLETE — invariant 10 deferred (see §1 note). No other halts.

---

## Invariant 10 deferral note

Invariant 10 ("Supersession consistency — log.supersessions references exist in log.events") requires the supersession schema to be resolved before a broken-log fixture can be constructed. Since EventBase has no `id` field and supersessions has zero writers, there is no concrete invariant to check until supersession schema design lands (see 003_supersession_schema_dossier.md, Option C recommended). Invariant 10 fixture is deferred explicitly. Remaining 9 invariants continue.

---

## Invariant reference (from REBUILD_PLAN.md lines 1385–1394)

| # | Invariant | Phase | Source |
|---|---|---|---|
| 1 | Money zero-sum per bet (Σ byBet[key] = 0 for each key) | Phase 1 | RunningLedger.byBet |
| 2 | Money zero-sum across all participants (Σ netByPlayer = 0) | Phase 1 | RunningLedger.netByPlayer |
| 7 | Integer invariants (all money values satisfy Number.isInteger) | Phase 1 | RunningLedger |
| 4 | Hole coverage | Phase 2 | ScoringEventLog |
| 5 | Player validity | Phase 2 | ScoringEventLog |
| 6 | Bet validity | Phase 2 | ScoringEventLog |
| 8 | Junk award validity | Phase 3 | ScoringEventLog + RoundConfig |
| 9 | State-transition consistency | Phase 3 | ScoringEventLog + buildMatchStates |
| 3 | MatchState consistency | Phase 3 | buildMatchStates |
| 10 | Supersession consistency | Phase 3 | ScoringEventLog | **DEFERRED** |

---

## Phase 1 invariants — broken RunningLedger fixtures

Note: Phase 1 invariants check the pre-computed `RunningLedger` (caller passes it). The "broken" input is a manually constructed ledger, not necessarily a broken event log. `aggregateRound` already throws `ZeroSumViolationError` for invariants 1 and 2 (defense-in-depth); invariant 7 should be unreachable in practice but is checked for belt-and-suspenders.

---

### Invariant 1 — Money zero-sum per bet

**Violation condition**: `Σ byBet[key][p] ≠ 0` for some bet key.

**Broken fixture**:
```typescript
const brokenLedger: RunningLedger = {
  netByPlayer: { alice: 100, bob: -100 },  // net is balanced
  byBet: {
    'skins-1': { alice: 100, bob: 50 },    // VIOLATION: 100 + 50 = 150, not 0
  },
  lastRecomputeTs: '2026-01-01T00:00:00.000Z',
}
```

**Meta-test**:
```typescript
const result = verifyRound(anyLog, anyCfg, brokenLedger)
expect(result.passed).toBe(false)
expect(result.invariants.find(i => i.invariant === 'money-zero-sum-per-bet')?.passed).toBe(false)
```

**Note**: A valid-but-internally-inconsistent ledger (net balanced, per-bet not) is a plausible construction error from a future ledger writer.

---

### Invariant 2 — Money zero-sum across all participants

**Violation condition**: `Σ netByPlayer[p] ≠ 0`.

**Broken fixture**:
```typescript
const brokenLedger: RunningLedger = {
  netByPlayer: { alice: 100, bob: 50 },   // VIOLATION: 100 + 50 = 150, not 0
  byBet: { 'bet-1': { alice: 100, bob: 50 } },
  lastRecomputeTs: '2026-01-01T00:00:00.000Z',
}
```

**Meta-test**: same shape — check `invariant === 'money-zero-sum-all-participants'` fails.

**Note**: If the ledger came from `aggregateRound`, this invariant can never fail (ZeroSumViolationError would have been thrown first). The verifier's Phase 1 value is catching manually-constructed ledgers from non-aggregateRound paths.

---

### Invariant 7 — Integer invariants

**Violation condition**: any `netByPlayer[p]` or `byBet[key][p]` fails `Number.isInteger()`.

**Broken fixture**:
```typescript
const brokenLedger: RunningLedger = {
  netByPlayer: { alice: 50.5, bob: -50.5 },  // VIOLATION: non-integer
  byBet: { 'bet-1': { alice: 50.5, bob: -50.5 } },
  lastRecomputeTs: '2026-01-01T00:00:00.000Z',
}
```

**Meta-test**: `invariant === 'money-integer-invariant'` fails.

**Note**: Unreachable in practice (all engine arithmetic is integer), but catches UI-layer ledger construction from floating-point sources.

---

## Phase 2 invariants — broken ScoringEventLog fixtures

Phase 2 invariants walk the event log. The "broken" input is a ScoringEventLog with semantic violations. The base fixture is a minimal 2-player Skins round (simplest game, clean log).

### Base Skins fixture (shared template for invariants 4, 5, 6)

```typescript
const baseSkinsCfg: SkinsCfg = {
  id: 'skins-1',
  stake: 10,
  escalating: false,
  tieRuleFinalHole: 'carryover',
  appliesHandicap: false,
  playerIds: ['alice', 'bob'],
  junkItems: [],
  junkMultiplier: 1,
}

const baseRoundCfg: RoundConfig = {
  roundId: 'r1',
  courseName: 'Test',
  players: [
    { id: 'alice', name: 'Alice', courseHandicap: 0, tee: 'white', teamId: null },
    { id: 'bob', name: 'Bob', courseHandicap: 0, tee: 'white', teamId: null },
  ],
  bets: [{ id: 'skins-1', type: 'skins', stake: 10, participants: ['alice', 'bob'],
           config: baseSkinsCfg, junkItems: [], junkMultiplier: 1 }],
  junk: { ... },
  longestDriveHoles: [],
  locked: false,
  unitSize: 1,
}
```

---

### Invariant 4 — Hole coverage

**Scope clarification**: The invariant checks that every hole in the declared range (1..9 or 1..18) has at least one event from each active bet, unless the bet was already closed on a prior hole. This requires knowing the holesToPlay per bet and tracking which matches closed early.

**Deferral note (soft)**: For Match Play and Nassau bets that close early (MatchClosedOut before hole 18), "hole coverage" is satisfied with fewer than 18 holes. The precise definition of "coverage" for early-closeout bets is an open scope question. The fixture below covers the clear case (Skins: all holes should have events).

**Broken fixture (Skins, hole 7 missing)**:
```typescript
// Events for holes 1–6 and 8–9; hole 7 has no SkinWon, SkinCarried, or SkinVoid.
const brokenLog: ScoringEventLog = {
  events: [
    { kind: 'SkinWon', declaringBet: 'skins-1', hole: 1, ... },
    { kind: 'SkinCarried', declaringBet: 'skins-1', hole: 2, ... },
    // ... holes 3, 4, 5, 6 ...
    // HOLE 7 MISSING
    { kind: 'SkinWon', declaringBet: 'skins-1', hole: 8, ... },
    { kind: 'SkinWon', declaringBet: 'skins-1', hole: 9, ... },
  ],
  supersessions: {},
}
```

**Meta-test**: `invariant === 'hole-coverage'` fails.

**Open scope question (not halted)**: The invariant needs a `maxHole` per bet (from RoundConfig — not directly available in SkinsCfg). Verifier will need to derive this from bet config or RoundConfig metadata. Bet configs don't directly store holesToPlay for Skins; it would need to be inferred from the declared set (min 1, max = highest hole in events + any declared range). This is a Phase 2 implementation detail.

---

### Invariant 5 — Player validity

**Violation condition**: An event's actor/winner/target player is not in `roundCfg.players`.

**Broken fixture**:
```typescript
const brokenLog: ScoringEventLog = {
  events: [
    {
      kind: 'SkinWon',
      declaringBet: 'skins-1',
      hole: 1,
      timestamp: '1',
      actor: 'system',
      winner: 'unknown-player',   // VIOLATION: not in roundCfg.players
      points: { alice: 10, bob: -10 },
    },
  ],
  supersessions: {},
}
```

**Meta-test**: `invariant === 'player-validity'` fails.

---

### Invariant 6 — Bet validity

**Violation condition**: An event's `declaringBet` (or `targetBet` for FinalAdjustmentApplied) is not in `roundCfg.bets`.

**Broken fixture**:
```typescript
const brokenLog: ScoringEventLog = {
  events: [
    {
      kind: 'SkinWon',
      declaringBet: 'unknown-bet-id',   // VIOLATION: not in roundCfg.bets
      hole: 1,
      timestamp: '1',
      actor: 'system',
      winner: 'alice',
      points: { alice: 10, bob: -10 },
    },
  ],
  supersessions: {},
}
```

**Meta-test**: `invariant === 'bet-validity'` fails.

---

## Phase 3 invariants — state-aware broken fixtures

Phase 3 invariants use `buildMatchStates(log, roundCfg)` inside `verifyRound`. The base fixture is a minimal 2-player Nassau round (alice vs bob, 1 front match, 3 holes) for invariants 3 and 9.

### Base Nassau fixture (shared template for invariants 3, 9)

```typescript
const nassauCfg: NassauCfg = {
  id: 'nassau-1',
  stake: 10,
  pressRule: 'manual',
  pressScope: 'nine',
  appliesHandicap: false,
  pairingMode: 'singles',
  playerIds: ['alice', 'bob'],
  junkItems: [],
  junkMultiplier: 1,
}

const nassauRoundCfg: RoundConfig = {
  ...
  bets: [{ id: 'nassau-1', type: 'nassau', config: nassauCfg, ... }],
}
```

---

### Invariant 3 — MatchState consistency

**Definition**: The final MatchState from `buildMatchStates(log, roundCfg)` should be consistent with the events in the log. Specifically, if a MatchClosedOut event is in the log, the corresponding MatchState should have `closed: true`. If no MatchClosedOut is present, `closed` should reflect the natural trajectory.

**Broken fixture (MatchClosedOut present but MatchState says still-open)**:

This invariant requires the verifier to call `buildMatchStates` and then compare its output against what the MatchClosedOut events claim. A broken log would be one where MatchClosedOut is present but events that would produce it (enough NassauHoleResolved wins) are absent.

```typescript
// alice wins 0 holes, bob wins 0 holes (3 NassauHoleResolved 'tie'),
// but then a MatchClosedOut claims alice won 2 up.
const brokenLog: ScoringEventLog = {
  events: [
    { kind: 'NassauHoleResolved', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 1, winner: 'tie', timestamp: '1', actor: 'system' },
    { kind: 'NassauHoleResolved', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 2, winner: 'tie', timestamp: '2', actor: 'system' },
    { kind: 'NassauHoleResolved', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 3, winner: 'tie', timestamp: '3', actor: 'system' },
    // VIOLATION: MatchClosedOut claims alice 2 up, but NassauHoleResolved history shows 0-0
    { kind: 'MatchClosedOut', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 3, holesUp: 2, holesRemaining: 6, timestamp: '3', actor: 'system',
      points: { alice: 10, bob: -10 } },
  ],
  supersessions: {},
}
```

**Meta-test**: `invariant === 'matchstate-consistency'` fails (MatchClosedOut.holesUp=2 doesn't match buildMatchStates holesWonA=0, holesWonB=0).

---

### Invariant 9 — State-transition consistency

**Definition**: MatchClosedOut may not fire on a match that was already marked `closed: true` in the MatchState trajectory (duplicate closeout).

**Broken fixture (MatchClosedOut appears twice for same matchId)**:

```typescript
const brokenLog: ScoringEventLog = {
  events: [
    { kind: 'NassauHoleResolved', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 1, winner: 'A', timestamp: '1', actor: 'system' },
    { kind: 'NassauHoleResolved', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 2, winner: 'A', timestamp: '2', actor: 'system' },
    // First MatchClosedOut — legitimate
    { kind: 'MatchClosedOut', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 2, holesUp: 2, holesRemaining: 7, timestamp: '2', actor: 'system',
      points: { alice: 10, bob: -10 } },
    // VIOLATION: second MatchClosedOut on the same matchId — match already closed
    { kind: 'MatchClosedOut', declaringBet: 'nassau-1', matchId: 'nassau-1::front',
      hole: 3, holesUp: 3, holesRemaining: 6, timestamp: '3', actor: 'system',
      points: { alice: 10, bob: -10 } },
  ],
  supersessions: {},
}
```

**Meta-test**: `invariant === 'state-transition-consistency'` fails (second MatchClosedOut on already-closed match).

---

### Invariant 8 — Junk award validity

**Definition**: JunkAwarded events must reference a `kind` that appears in the declaring bet's `junkItems`, and the winner must be in the bet's `playerIds`.

**Broken fixture (declared kind not in bet's junkItems)**:

```typescript
const skinsWithJunkCfg: SkinsCfg = {
  id: 'skins-1',
  ...,
  junkItems: ['ctp'],      // only CTP declared — no greenie
  junkMultiplier: 1,
}

const brokenLog: ScoringEventLog = {
  events: [
    {
      kind: 'JunkAwarded',
      declaringBet: 'skins-1',
      hole: 5,
      timestamp: '5',
      actor: 'system',
      junkKind: 'greenie',   // VIOLATION: 'greenie' not in bet's junkItems
      points: { alice: 10, bob: -10 },
    },
  ],
  supersessions: {},
}
```

**Meta-test**: `invariant === 'junk-award-validity'` fails.

**Second broken fixture (winner not in bet's playerIds)**:
```typescript
// JunkAwarded where points include 'carol' who is not in skins-1's playerIds
const brokenLog2: ScoringEventLog = {
  events: [
    {
      kind: 'JunkAwarded',
      declaringBet: 'skins-1',
      hole: 5,
      timestamp: '5',
      actor: 'system',
      junkKind: 'ctp',
      points: { alice: 10, bob: -5, carol: -5 },  // VIOLATION: carol not in playerIds
    },
  ],
  supersessions: {},
}
```

---

## 3. Shared fixture patterns

**Template 1 — Minimal 2-player Skins log (invariants 4, 5, 6, 8 broken forms)**:
- 2 players: alice, bob
- 9-hole format
- 1 Skins bet with declared junkItems for invariant 8 variants

**Template 2 — Minimal 2-player Nassau log (invariants 3, 9 broken forms)**:
- 2 players: alice, bob
- Nassau front match only (matchId: nassau-1::front)
- 3 NassauHoleResolved events → 3 holes

**Template 3 — Broken RunningLedger (invariants 1, 2, 7)**:
- Any log (even empty log with `supersessions: {}`)
- Manually constructed ledger with specific violations

The two log-based templates (Template 1 and 2) can share the same `roundCfg` structure with different bets.

---

## 4. Fixture organization recommendation

**REBUILD_PLAN.md line 1450**: "Inline for Phase 1; decide before Phase 2 if complexity warrants sharing."

**Recommendation**:
- **Phase 1**: Inline fixtures in `src/verify/__tests__/verifyRound.test.ts`. Three broken RunningLedger objects fit inline without ceremony.
- **Phase 2**: Create `src/verify/__tests__/fixtures/` directory with:
  - `brokenSkins.ts` — base Skins fixture + broken variants
  - `brokenNassau.ts` — base Nassau fixture + broken variants
- **Phase 3**: Extend the same fixture files.

Existing codebase precedent: all game test files (aggregate.test.ts, nassau.test.ts, etc.) use inline helpers that construct configs and logs per-test. No shared fixture library exists yet. A `fixtures/` directory would be a new pattern — introduce only if Phase 2 test complexity clearly warrants sharing (judge at Phase 2 start).

---

## 5. Meta-test template

```typescript
// Pattern for all verifier tests
const result = verifyRound(brokenLog, roundCfg, ledger)
expect(result.passed).toBe(false)

const failing = result.invariants.filter(i => !i.passed)
expect(failing.length).toBeGreaterThanOrEqual(1)
expect(failing.some(i => i.invariant === 'INVARIANT_KEY')).toBe(true)

// For severity checks (optional):
expect(failing.find(i => i.invariant === 'INVARIANT_KEY')?.severity).toBe('error')
```

**Invariant key names** (suggested, matching VerificationReport schema from REBUILD_PLAN.md):

| # | Suggested key |
|---|---|
| 1 | `'money-zero-sum-per-bet'` |
| 2 | `'money-zero-sum-all-participants'` |
| 7 | `'money-integer-invariant'` |
| 4 | `'hole-coverage'` |
| 5 | `'player-validity'` |
| 6 | `'bet-validity'` |
| 8 | `'junk-award-validity'` |
| 9 | `'state-transition-consistency'` |
| 3 | `'matchstate-consistency'` |
| 10 | (deferred) |

---

## Summary

- 9 of 10 invariants have concrete broken-log fixture specifications above.
- Invariant 10 explicitly deferred (supersession schema unresolved).
- Invariant 4 "hole coverage" has a soft open question on early-closeout semantics — fixture above covers the clear Skins case; Match Play/Nassau early-closeout edge case needs clarification at Phase 2 start.
- Shared fixture templates: 2 log-based (Skins, Nassau) + 1 ledger-based. Recommended as `src/verify/__tests__/fixtures/` starting at Phase 2.
