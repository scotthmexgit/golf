// src/games/__tests__/junk.test.ts
//
// Phase 2 Iteration 1: CTP + Greenie surface tests.
// §12 Tests 1–4 implemented. Test 5 (Longest Drive tie) deferred to
// Phase 2 Iteration 2.

import { describe, it, expect } from 'vitest'
import { resolveJunkWinner, settleJunkHole } from '../junk'
import type {
  HoleState,
  JunkKind,
  JunkRoundConfig,
  RoundConfig,
  BetSelection,
  ScoringEvent,
} from '../types'

// ─── Zero-sum assertion helper ────────────────────────────────────────────────

function assertZeroSum(events: ScoringEvent[]): void {
  for (const ev of events) {
    if (ev.kind === 'JunkAwarded') {
      const sum = Object.values(ev.points).reduce((a, b) => a + b, 0)
      expect(sum).toBe(0)
    }
  }
}

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makeJunkCfg(overrides: Partial<JunkRoundConfig> = {}): JunkRoundConfig {
  return {
    girEnabled: true,
    longestDriveHoles: [],
    ctpEnabled: true,
    longestDriveEnabled: true,
    greenieEnabled: true,
    sandyEnabled: true,
    barkieEnabled: true,
    polieEnabled: true,
    arnieEnabled: true,
    polieMode: 'automatic',
    barkieStrict: false,
    superSandyEnabled: false,
    ...overrides,
  }
}

function makeHole(overrides: Partial<HoleState> = {}): HoleState {
  return {
    hole: 4,
    par: 3,
    holeIndex: 4,
    timestamp: 'ts-1',
    gross: { alice: 3, bob: 4, carol: 4, dave: 4 },
    strokes: { alice: 0, bob: 0, carol: 0, dave: 0 },
    status: 'Confirmed',
    ctpWinner: 'alice',
    longestDriveWinner: null,
    bunkerVisited: { alice: false, bob: false, carol: false, dave: false },
    treeSolidHit: { alice: false, bob: false, carol: false, dave: false },
    treeAnyHit: { alice: false, bob: false, carol: false, dave: false },
    longPutt: { alice: false, bob: false, carol: false, dave: false },
    polieInvoked: { alice: false, bob: false, carol: false, dave: false },
    fairwayHit: { alice: false, bob: false, carol: false, dave: false },
    gir: { alice: true, bob: false, carol: false, dave: false },
    pickedUp: [],
    conceded: [],
    withdrew: [],
    ...overrides,
  }
}

function makeBet(
  id: string,
  participants: string[],
  stake: number,
  junkMultiplier: number,
  junkItems: JunkKind[],
): BetSelection {
  return {
    id,
    type: 'skins',
    stake,
    participants,
    config: {
      id,
      stake,
      escalating: false,
      tieRuleFinalHole: 'no-points',
      appliesHandicap: false,
      playerIds: participants,
      junkItems,
      junkMultiplier,
    },
    junkItems,
    junkMultiplier,
  }
}

function makeRoundCfg(
  bets: BetSelection[],
  junkCfg: JunkRoundConfig,
): RoundConfig {
  return {
    roundId: 'r1',
    courseName: 'Test Course',
    players: [],
    bets,
    junk: junkCfg,
    longestDriveHoles: [],
    locked: true,
    unitSize: 100,
  }
}

// ─── Phase 1 scaffold tests (retained) ───────────────────────────────────────

describe('#7 Phase 1 — dispatch scaffold', () => {
  const minimalJunkCfg = makeJunkCfg()
  const minimalHole = makeHole({ ctpWinner: null })
  const minimalRoundCfg = makeRoundCfg([], minimalJunkCfg)

  it('resolveJunkWinner does not throw for any JunkKind', () => {
    const allKinds: JunkKind[] = [
      'ctp',
      'longestDrive',
      'greenie',
      'sandy',
      'barkie',
      'polie',
      'arnie',
    ]
    for (const kind of allKinds) {
      expect(() => resolveJunkWinner(kind, minimalHole, minimalJunkCfg)).not.toThrow()
    }
  })

  it('settleJunkHole returns empty array when no ctpWinner and no bets', () => {
    const result = settleJunkHole(minimalHole, minimalRoundCfg, minimalJunkCfg)
    expect(result).toEqual([])
  })
})

// ─── §12 Test 1 — CTP + Greenie worked example (two declaring bets) ──────────

describe('§12 Test 1 — CTP + Greenie worked example', () => {
  // Four players: alice, bob, carol, dave. Two declaring bets.
  // skinsBet: all four, stake=100, junkMultiplier=1, junkItems=['greenie']
  // nassauBet: alice+bob, stake=200, junkMultiplier=2, junkItems=['greenie']
  // Hole 4, par 3. alice wins CTP, gir=true, gross=3 (par). girEnabled=true.

  const skinsBet = makeBet('skinsBet', ['alice', 'bob', 'carol', 'dave'], 100, 1, ['greenie'])
  const nassauBet = makeBet('nassauBet', ['alice', 'bob'], 200, 2, ['greenie'])
  const junkCfg = makeJunkCfg({ girEnabled: true })
  const roundCfg = makeRoundCfg([skinsBet, nassauBet], junkCfg)
  const hole = makeHole({
    hole: 4,
    par: 3,
    ctpWinner: 'alice',
    gross: { alice: 3, bob: 4, carol: 4, dave: 4 },
    gir: { alice: true, bob: false, carol: false, dave: false },
  })

  it('emits exactly one CTPWinnerSelected with winner=alice, gir=true', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpSel = events.filter((e) => e.kind === 'CTPWinnerSelected')
    expect(ctpSel).toHaveLength(1)
    const ev = ctpSel[0]
    expect(ev.kind).toBe('CTPWinnerSelected')
    if (ev.kind === 'CTPWinnerSelected') {
      expect(ev.winner).toBe('alice')
      expect(ev.gir).toBe(true)
    }
  })

  it('emits zero JunkAwarded for ctp (neither bet declares ctp)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpAwards = events.filter((e) => e.kind === 'JunkAwarded' && e.junk === 'ctp')
    expect(ctpAwards).toHaveLength(0)
  })

  it('emits exactly two JunkAwarded for greenie (one per bet)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const greenieAwards = events.filter((e) => e.kind === 'JunkAwarded' && e.junk === 'greenie')
    expect(greenieAwards).toHaveLength(2)
  })

  it('CTPWinnerSelected is at index 0', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    expect(events[0].kind).toBe('CTPWinnerSelected')
  })

  it('CTPWinnerSelected is first, then Greenie JunkAwarded in bet declaration order (Topic 8 ordering)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    expect(events[0].kind).toBe('CTPWinnerSelected')
    const greenieAwards = events.filter((e) => e.kind === 'JunkAwarded' && e.junk === 'greenie')
    expect(greenieAwards).toHaveLength(2)
    if (greenieAwards[0].kind === 'JunkAwarded' && greenieAwards[1].kind === 'JunkAwarded') {
      expect(greenieAwards[0].declaringBet).toBe('skinsBet')
      expect(greenieAwards[1].declaringBet).toBe('nassauBet')
    }
  })

  it('Skins Greenie points: alice +3, bob -1, carol -1, dave -1; sum=0', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ev = events.find(
      (e) => e.kind === 'JunkAwarded' && e.junk === 'greenie' && e.declaringBet === 'skinsBet',
    )
    expect(ev).toBeDefined()
    if (ev && ev.kind === 'JunkAwarded') {
      expect(ev.points).toEqual({ alice: 3, bob: -1, carol: -1, dave: -1 })
      const sum = Object.values(ev.points).reduce((a, b) => a + b, 0)
      expect(sum).toBe(0)
    }
  })

  it('Nassau Greenie points: alice +1, bob -1; sum=0', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ev = events.find(
      (e) => e.kind === 'JunkAwarded' && e.junk === 'greenie' && e.declaringBet === 'nassauBet',
    )
    expect(ev).toBeDefined()
    if (ev && ev.kind === 'JunkAwarded') {
      expect(ev.points).toEqual({ alice: 1, bob: -1 })
      const sum = Object.values(ev.points).reduce((a, b) => a + b, 0)
      expect(sum).toBe(0)
    }
  })

  it('zero-sum holds for every JunkAwarded event', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    assertZeroSum(events)
  })

  it('all points are integers', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    for (const ev of events) {
      if (ev.kind === 'JunkAwarded') {
        for (const v of Object.values(ev.points)) {
          expect(Number.isInteger(v)).toBe(true)
        }
      }
    }
  })
})

// ─── §12 Test 2 — Parallel awards ────────────────────────────────────────────

describe('§12 Test 2 — Parallel awards', () => {
  // Same four players. Skins and Nassau both declare junkItems=['greenie'].
  // Hole 7, par 3. Alice wins CTP + par with GIR ON.

  const skinsBet = makeBet('skinsBet', ['alice', 'bob', 'carol', 'dave'], 100, 1, ['greenie'])
  const nassauBet = makeBet('nassauBet', ['alice', 'bob'], 200, 2, ['greenie'])
  const junkCfg = makeJunkCfg({ girEnabled: true })
  const roundCfg = makeRoundCfg([skinsBet, nassauBet], junkCfg)
  const hole = makeHole({
    hole: 7,
    par: 3,
    ctpWinner: 'alice',
    gross: { alice: 3, bob: 4, carol: 4, dave: 4 },
    gir: { alice: true, bob: false, carol: false, dave: false },
  })

  it('emits exactly one CTPWinnerSelected', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpSel = events.filter((e) => e.kind === 'CTPWinnerSelected')
    expect(ctpSel).toHaveLength(1)
  })

  it('emits exactly two JunkAwarded events (one per declaring bet)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const awards = events.filter((e) => e.kind === 'JunkAwarded')
    expect(awards).toHaveLength(2)
  })

  it('each JunkAwarded is independently zero-sum', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    assertZeroSum(events)
  })
})

// ─── §12 Test 3 — CTP without Greenie (girEnabled = false) ───────────────────

describe('§12 Test 3 — CTP without Greenie (GIR toggle OFF)', () => {
  // Same four players. Skins declares junkItems=['ctp','greenie'].
  // Round config girEnabled=false. Alice wins CTP with par.

  const skinsBet = makeBet('skinsBet', ['alice', 'bob', 'carol', 'dave'], 100, 1, ['ctp', 'greenie'])
  const junkCfg = makeJunkCfg({ girEnabled: false })
  const roundCfg = makeRoundCfg([skinsBet], junkCfg)
  const hole = makeHole({
    hole: 4,
    par: 3,
    ctpWinner: 'alice',
    gross: { alice: 3, bob: 4, carol: 4, dave: 4 },
    gir: { alice: true, bob: false, carol: false, dave: false },
  })

  it('emits one CTPWinnerSelected with gir=false', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpSel = events.filter((e) => e.kind === 'CTPWinnerSelected')
    expect(ctpSel).toHaveLength(1)
    const ev = ctpSel[0]
    if (ev.kind === 'CTPWinnerSelected') {
      expect(ev.gir).toBe(false)
    }
  })

  it('emits one JunkAwarded for ctp (Skins)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpAwards = events.filter((e) => e.kind === 'JunkAwarded' && e.junk === 'ctp')
    expect(ctpAwards).toHaveLength(1)
  })

  it('emits zero JunkAwarded for greenie', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const greenieAwards = events.filter((e) => e.kind === 'JunkAwarded' && e.junk === 'greenie')
    expect(greenieAwards).toHaveLength(0)
  })

  it('total events = 2 (1 bookkeeping + 1 CTP award)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    expect(events).toHaveLength(2)
  })

  it('zero-sum holds for every JunkAwarded event', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    assertZeroSum(events)
  })
})

// ─── §12 Test 4 — Non-bettor CTP winner ──────────────────────────────────────

describe('§12 Test 4 — Non-bettor CTP winner', () => {
  // Skins bettors = {bob, carol, dave} (alice excluded from both bets).
  // junkItems=['ctp']. Alice still wins CTP.

  const skinsBet = makeBet('skinsBet', ['bob', 'carol', 'dave'], 100, 1, ['ctp'])
  const nassauBet = makeBet('nassauBet', ['bob', 'carol'], 200, 2, ['ctp'])
  const junkCfg = makeJunkCfg({ girEnabled: true })
  const roundCfg = makeRoundCfg([skinsBet, nassauBet], junkCfg)
  const hole = makeHole({
    hole: 4,
    par: 3,
    ctpWinner: 'alice',
    gross: { alice: 3, bob: 4, carol: 4, dave: 4 },
    gir: { alice: true, bob: false, carol: false, dave: false },
  })

  it('emits one CTPWinnerSelected with winner=alice', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpSel = events.filter((e) => e.kind === 'CTPWinnerSelected')
    expect(ctpSel).toHaveLength(1)
    const ev = ctpSel[0]
    if (ev.kind === 'CTPWinnerSelected') {
      expect(ev.winner).toBe('alice')
    }
  })

  it('emits zero JunkAwarded events (alice not in any bet)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const awards = events.filter((e) => e.kind === 'JunkAwarded')
    expect(awards).toHaveLength(0)
  })

  it('zero-sum trivially satisfied (no point events)', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    assertZeroSum(events)
  })
})

// ─── Topic 8 ordering — Declaration order is authoritative ───────────────────

describe('Topic 8 — JunkAwarded fan-out respects bets array order', () => {
  // Three bets in specific order: betA, betB, betC. All declare ['ctp'].
  // Alice wins CTP. Assert JunkAwarded order matches betA, betB, betC.

  const betA = makeBet('betA', ['alice', 'bob'], 100, 1, ['ctp'])
  const betB = makeBet('betB', ['alice', 'carol'], 100, 1, ['ctp'])
  const betC = makeBet('betC', ['alice', 'dave'], 100, 1, ['ctp'])
  const junkCfg = makeJunkCfg({ girEnabled: true })
  const roundCfg = makeRoundCfg([betA, betB, betC], junkCfg)
  const hole = makeHole({
    hole: 4,
    par: 3,
    ctpWinner: 'alice',
    gross: { alice: 3, bob: 4, carol: 4, dave: 4 },
    gir: { alice: true, bob: false, carol: false, dave: false },
  })

  it('JunkAwarded events for CTP appear in betA, betB, betC order', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    const ctpAwards = events.filter(
      (e): e is Extract<ScoringEvent, { kind: 'JunkAwarded' }> =>
        e.kind === 'JunkAwarded' && e.junk === 'ctp',
    )
    expect(ctpAwards).toHaveLength(3)
    expect(ctpAwards[0].declaringBet).toBe('betA')
    expect(ctpAwards[1].declaringBet).toBe('betB')
    expect(ctpAwards[2].declaringBet).toBe('betC')
  })

  it('zero-sum holds for all three awards', () => {
    const events = settleJunkHole(hole, roundCfg, junkCfg)
    assertZeroSum(events)
  })
})
