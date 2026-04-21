import { describe, it, expect } from 'vitest'
import {
  settleNassauHole,
  initialMatches,
  offerPress,
  openPress,
  NassauConfigError,
  NassauBetNotFoundError,
  type MatchState,
  type PressConfirmation,
} from '../nassau'
import type {
  BetSelection,
  HoleState,
  JunkRoundConfig,
  NassauCfg,
  PlayerId,
  PlayerSetup,
  RoundConfig,
  ScoringEvent,
} from '../types'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const defaultJunkCfg: JunkRoundConfig = {
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
  barkieStrict: true,
  superSandyEnabled: false,
}

function makeNassauCfg(overrides: Partial<NassauCfg> = {}): NassauCfg {
  return {
    id: 'nassau-1',
    stake: 1,
    pressRule: 'manual',
    pressScope: 'nine',
    appliesHandicap: false,
    pairingMode: 'singles',
    playerIds: ['A', 'B'],
    junkItems: [],
    junkMultiplier: 1,
    ...overrides,
  }
}

function makeRoundCfg(cfg: NassauCfg): RoundConfig {
  const bet: BetSelection = {
    id: cfg.id,
    type: 'nassau',
    stake: cfg.stake,
    participants: cfg.playerIds,
    config: cfg,
    junkItems: cfg.junkItems,
    junkMultiplier: cfg.junkMultiplier,
  }
  const players: PlayerSetup[] = cfg.playerIds.map((id) => ({
    id,
    name: id,
    hcpIndex: 0,
    tee: 'white',
    isCourseHcp: true,
    courseHcp: 0,
    betting: true,
    isSelf: false,
    roundHandicap: 0,
  }))
  return {
    roundId: 'r1',
    courseName: 'Test Course',
    players,
    bets: [bet],
    junk: defaultJunkCfg,
    longestDriveHoles: [],
    locked: true,
    unitSize: 100,
  }
}

function makeHole(
  holeNum: number,
  holeIndex: number,
  gross: Record<PlayerId, number>,
  opts: { par?: number; strokes?: Record<PlayerId, number> } = {},
): HoleState {
  const playerIds = Object.keys(gross)
  const zeroBool: Record<PlayerId, boolean> = {}
  for (const p of playerIds) zeroBool[p] = false
  const zeroStrokes: Record<PlayerId, number> = {}
  for (const p of playerIds) zeroStrokes[p] = 0
  return {
    hole: holeNum,
    par: opts.par ?? 4,
    holeIndex,
    timestamp: `ts-${holeNum}`,
    gross,
    strokes: opts.strokes ?? zeroStrokes,
    status: 'Confirmed',
    ctpWinner: null,
    longestDriveWinner: null,
    bunkerVisited: { ...zeroBool },
    treeSolidHit: { ...zeroBool },
    treeAnyHit: { ...zeroBool },
    longPutt: { ...zeroBool },
    polieInvoked: { ...zeroBool },
    fairwayHit: { ...zeroBool },
    gir: { ...zeroBool },
    pickedUp: [],
    conceded: [],
    withdrew: [],
  }
}

// Run a sequence of holes through settleNassauHole, threading matches.
function runHoles(
  rows: Array<{
    hole: number
    idx: number
    gross: Record<PlayerId, number>
    strokes?: Record<PlayerId, number>
  }>,
  cfg: NassauCfg,
  round: RoundConfig,
): { events: ScoringEvent[]; matches: MatchState[] } {
  let matches = initialMatches(cfg)
  const events: ScoringEvent[] = []
  for (const row of rows) {
    const hole = makeHole(row.hole, row.idx, row.gross, { strokes: row.strokes })
    const out = settleNassauHole(hole, cfg, round, matches)
    events.push(...out.events)
    matches = out.matches
  }
  return { events, matches }
}

// ─── Test 1 — game_nassau.md § 10 Worked Example, front 9 ──────────────────
//
// A (scratch, hcp 0) vs B (hcp 5). Pair-wise USGA: diff = 5, B receives one
// stroke on holes with hole-index ≤ 5 (idx 1, 3, 5 in this example's table
// cover holes 4, 2, 7 respectively). Front-9 result per rule-file table:
// A wins holes 3, 5, 6, 8; B wins holes 1, 4, 7; holes 2 and 9 tie.
// Final front state: A 4, B 3.

describe('game_nassau.md § 10 Worked Example — front 9 (singles, pair-wise handicap)', () => {
  const cfg = makeNassauCfg({ appliesHandicap: true })
  const round = makeRoundCfg(cfg)
  const strokes = { A: 0, B: 5 }

  const front9 = [
    { hole: 1, idx: 7,  gross: { A: 5, B: 4 } },
    { hole: 2, idx: 3,  gross: { A: 3, B: 4 } },
    { hole: 3, idx: 15, gross: { A: 3, B: 4 } },
    { hole: 4, idx: 1,  gross: { A: 5, B: 5 } },
    { hole: 5, idx: 11, gross: { A: 4, B: 5 } },
    { hole: 6, idx: 17, gross: { A: 3, B: 4 } },
    { hole: 7, idx: 5,  gross: { A: 5, B: 4 } },
    { hole: 8, idx: 9,  gross: { A: 5, B: 6 } },
    { hole: 9, idx: 13, gross: { A: 5, B: 5 } },
  ].map((r) => ({ ...r, strokes }))

  const result = runHoles(front9, cfg, round)

  it('emits one NassauHoleResolved per active match per hole (front + overall, 18 events for 9 holes)', () => {
    const resolvedEvents = result.events.filter((e) => e.kind === 'NassauHoleResolved')
    expect(resolvedEvents).toHaveLength(18) // front + overall are active on holes 1-9
    const frontEvents = resolvedEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'front',
    )
    const overallEvents = resolvedEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
    )
    expect(frontEvents).toHaveLength(9)
    expect(overallEvents).toHaveLength(9)
    // No back events during front-9 since back.startHole = 10.
    const backEvents = resolvedEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'back',
    )
    expect(backEvents).toHaveLength(0)
  })

  it('produces the expected winner sequence per § 10 table', () => {
    const frontEvents = result.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'front',
    )
    const winners = frontEvents.map((e) => e.winner)
    // Per § 10: B, tie, A, B, A, A, B, A, tie
    expect(winners).toEqual(['B', 'tie', 'A', 'B', 'A', 'A', 'B', 'A', 'tie'])
  })

  it('front match state ends at { holesWonA: 4, holesWonB: 3 }', () => {
    const front = result.matches.find((m) => m.id === 'front')
    expect(front).toBeDefined()
    expect(front?.holesWonA).toBe(4)
    expect(front?.holesWonB).toBe(3)
  })

  it('overall match state mirrors front through hole 9 { holesWonA: 4, holesWonB: 3 }', () => {
    const overall = result.matches.find((m) => m.id === 'overall')
    expect(overall?.holesWonA).toBe(4)
    expect(overall?.holesWonB).toBe(3)
  })

  it('back match state remains untouched at { 0, 0 } during the front 9', () => {
    const back = result.matches.find((m) => m.id === 'back')
    expect(back?.holesWonA).toBe(0)
    expect(back?.holesWonB).toBe(0)
  })
})

// ─── Test 2 — Pair-wise allocation distinguishes from per-player ────────────
//
// With A hcp 8 and B hcp 10 on a hole of index 9:
//   Pair-wise (correct per § 2): diff = 2; strokesOnHole(2, 9) = 0 (2 < 9).
//     Neither player gets a stroke. Pure gross comparison applies.
//   Per-player (the incorrect § 5 pseudocode reading): A strokes(8, 9) = 0,
//     B strokes(10, 9) = 1. B's net drops by 1.
// Engineered gross A=5, B=5 produces:
//   Pair-wise → tie. Per-player → B wins.
// This test enforces the pair-wise interpretation.

describe('pair-wise USGA allocation (distinguishes from per-player)', () => {
  const cfg = makeNassauCfg({ appliesHandicap: true })
  const round = makeRoundCfg(cfg)

  it('A hcp 8, B hcp 10, idx 9, gross 5/5 → pair-wise tie (would be B win under per-player)', () => {
    const hole = makeHole(1, 9, { A: 5, B: 5 }, { strokes: { A: 8, B: 10 } })
    const out = settleNassauHole(hole, cfg, round, initialMatches(cfg))
    const overall = out.events.find(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
    )
    expect(overall?.winner).toBe('tie')
  })

  it('tied hole does not increment either holesWon counter', () => {
    const hole = makeHole(1, 9, { A: 5, B: 5 }, { strokes: { A: 8, B: 10 } })
    const out = settleNassauHole(hole, cfg, round, initialMatches(cfg))
    const overall = out.matches.find((m) => m.id === 'overall')
    expect(overall?.holesWonA).toBe(0)
    expect(overall?.holesWonB).toBe(0)
  })
})

// ─── Test 3 — Typed errors ─────────────────────────────────────────────────

describe('typed errors: invalid or missing config', () => {
  const hole = makeHole(1, 1, { A: 4, B: 4 })

  it("throws NassauConfigError when pairingMode='singles' with wrong player count", () => {
    const bad = makeNassauCfg({ playerIds: ['A', 'B', 'C'] as PlayerId[] })
    expect(() => settleNassauHole(hole, bad, makeRoundCfg(bad), initialMatches(bad))).toThrow(
      NassauConfigError,
    )
  })

  it('throws NassauBetNotFoundError when config id does not match any BetSelection.id', () => {
    const cfg = makeNassauCfg()
    const round = makeRoundCfg(cfg)
    const stray = makeNassauCfg({ id: 'not-registered' })
    expect(() => settleNassauHole(hole, stray, round, initialMatches(stray))).toThrow(
      NassauBetNotFoundError,
    )
  })

  it("throws NassauConfigError when pairingMode='allPairs' (Phase 1 supports singles only)", () => {
    const cfg = makeNassauCfg({ pairingMode: 'allPairs', playerIds: ['A', 'B', 'C'] as PlayerId[] })
    const round = makeRoundCfg(cfg)
    expect(() => settleNassauHole(hole, cfg, round, initialMatches(cfg))).toThrow(
      NassauConfigError,
    )
  })
})

// ─── Phase 2 — offerPress threshold semantics ──────────────────────────────
//
// Distinguishing-input tests per prompt 015 guidance: pick inputs where
// auto-2-down rejects but manual accepts (or vice versa). downBy=2 is the
// single point where all three press rules agree, so it's NOT a
// distinguishing test on its own.

describe('offerPress threshold semantics (auto-2-down / auto-1-down / manual)', () => {
  function matchAt(holesWonA: number, holesWonB: number): MatchState {
    return { id: 'front', startHole: 1, endHole: 9, holesWonA, holesWonB, parentId: null }
  }

  it("distinguishes auto-2-down and manual at downBy=1: auto rejects, manual accepts", () => {
    const m = matchAt(3, 2) // A up 1, B is the down player
    const autoCfg = makeNassauCfg({ pressRule: 'auto-2-down' })
    const manualCfg = makeNassauCfg({ pressRule: 'manual' })
    const autoEvents = offerPress(5, m, autoCfg, 'B')
    const manualEvents = offerPress(5, m, manualCfg, 'B')
    expect(autoEvents).toHaveLength(0)
    expect(manualEvents).toHaveLength(1)
    expect(manualEvents[0].kind).toBe('PressOffered')
    if (manualEvents[0].kind === 'PressOffered') {
      expect(manualEvents[0].downPlayer).toBe('B')
      expect(manualEvents[0].parentMatchId).toBe('front')
    }
  })

  it("distinguishes auto-1-down and manual at downBy=2: auto rejects, manual accepts", () => {
    const m = matchAt(4, 2) // A up 2, B is down
    const autoCfg = makeNassauCfg({ pressRule: 'auto-1-down' })
    const manualCfg = makeNassauCfg({ pressRule: 'manual' })
    expect(offerPress(6, m, autoCfg, 'B')).toHaveLength(0)
    expect(offerPress(6, m, manualCfg, 'B')).toHaveLength(1)
  })

  it("auto-2-down emits PressOffered exactly at downBy=2", () => {
    const m = matchAt(4, 2)
    const cfg = makeNassauCfg({ pressRule: 'auto-2-down' })
    const events = offerPress(6, m, cfg, 'B')
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('PressOffered')
  })

  it("all pressRules return [] when downBy=0 (no down player exists)", () => {
    const m = matchAt(3, 3)
    expect(offerPress(6, m, makeNassauCfg({ pressRule: 'auto-2-down' }), 'A')).toHaveLength(0)
    expect(offerPress(6, m, makeNassauCfg({ pressRule: 'auto-1-down' }), 'A')).toHaveLength(0)
    expect(offerPress(6, m, makeNassauCfg({ pressRule: 'manual' }), 'A')).toHaveLength(0)
  })

  it("returns [] when hole is outside the parent match window", () => {
    const frontMatch = matchAt(3, 1)
    // Hole 10 is outside front-9 match (endHole 9).
    expect(offerPress(10, frontMatch, makeNassauCfg({ pressRule: 'manual' }), 'B')).toHaveLength(0)
  })
})

// ─── Phase 2 — openPress scope-window + last-hole voiding ──────────────────

describe("openPress scope-window enforcement ('nine' vs 'match')", () => {
  it("distinguishes 'nine' and 'match' on overall-match press at hole 5 (endHole 9 vs 18)", () => {
    // Overall match spans 1-18. At hole 5 (front-9 territory), 'nine' runs the
    // press to hole 9; 'match' runs it to hole 18. This is the canonical
    // scope-distinguishing case.
    const cfgNine = makeNassauCfg({ pressScope: 'nine' })
    const cfgMatch = makeNassauCfg({ pressScope: 'match' })
    const roundNine = makeRoundCfg(cfgNine)
    const roundMatch = makeRoundCfg(cfgMatch)
    const baseMatches = initialMatches(cfgNine)

    const confirmation: PressConfirmation = {
      hole: 5, parentMatchId: 'overall', openingPlayer: 'B',
    }
    const outNine = openPress(confirmation, cfgNine, roundNine, baseMatches)
    const outMatch = openPress(confirmation, cfgMatch, roundMatch, baseMatches)

    const pressNine = outNine.matches.find((m) => m.id === 'press-1')
    const pressMatch = outMatch.matches.find((m) => m.id === 'press-1')
    expect(pressNine?.endHole).toBe(9)
    expect(pressMatch?.endHole).toBe(18)
    expect(pressNine?.startHole).toBe(6)
    expect(pressMatch?.startHole).toBe(6)
  })

  it("front-9 match press: 'nine' and 'match' both give endHole=9 (scopes agree)", () => {
    // Front-9 match endHole is already 9; both scopes produce the same result
    // here. Not a distinguishing test — it documents the no-disagreement case.
    const cfgNine = makeNassauCfg({ pressScope: 'nine' })
    const roundNine = makeRoundCfg(cfgNine)
    const baseMatches = initialMatches(cfgNine)
    const out = openPress(
      { hole: 3, parentMatchId: 'front', openingPlayer: 'B' },
      cfgNine, roundNine, baseMatches,
    )
    const press = out.matches.find((m) => m.id === 'press-1')
    expect(press?.endHole).toBe(9) // min(9, parent.endHole=9) = 9
    expect(press?.startHole).toBe(4)
  })

  it("back-9 match press with 'match' scope runs to hole 18", () => {
    const cfg = makeNassauCfg({ pressScope: 'match' })
    const round = makeRoundCfg(cfg)
    const out = openPress(
      { hole: 13, parentMatchId: 'back', openingPlayer: 'B' },
      cfg, round, initialMatches(cfg),
    )
    const press = out.matches.find((m) => m.id === 'press-1')
    expect(press?.endHole).toBe(18)
    expect(press?.startHole).toBe(14)
  })
})

describe('openPress last-hole voiding (§ 9 press-on-last-hole)', () => {
  it("press opened on hole 9 of front-9 with 'nine' scope → PressVoided, no MatchState added", () => {
    const cfg = makeNassauCfg({ pressScope: 'nine' })
    const round = makeRoundCfg(cfg)
    const out = openPress(
      { hole: 9, parentMatchId: 'front', openingPlayer: 'B' },
      cfg, round, initialMatches(cfg),
    )
    expect(out.events.find((e) => e.kind === 'PressOpened')).toBeDefined()
    expect(out.events.find((e) => e.kind === 'PressVoided')).toBeDefined()
    expect(out.matches.find((m) => m.id.startsWith('press-'))).toBeUndefined()
  })

  it("press opened at hole 8 of front-9 gives a 1-hole window (not voided)", () => {
    // Distinguishing vs hole-9 case above: startHole=9, endHole=9 → valid 1-hole press.
    const cfg = makeNassauCfg({ pressScope: 'nine' })
    const round = makeRoundCfg(cfg)
    const out = openPress(
      { hole: 8, parentMatchId: 'front', openingPlayer: 'B' },
      cfg, round, initialMatches(cfg),
    )
    expect(out.events.find((e) => e.kind === 'PressVoided')).toBeUndefined()
    const press = out.matches.find((m) => m.id.startsWith('press-'))
    expect(press).toBeDefined()
    expect(press?.startHole).toBe(9)
    expect(press?.endHole).toBe(9)
  })

  it('press opened on hole 18 of back-9 → PressVoided', () => {
    const cfg = makeNassauCfg({ pressScope: 'match' })
    const round = makeRoundCfg(cfg)
    const out = openPress(
      { hole: 18, parentMatchId: 'back', openingPlayer: 'A' },
      cfg, round, initialMatches(cfg),
    )
    expect(out.events.some((e) => e.kind === 'PressVoided')).toBe(true)
  })
})

describe('press composition (press-of-press)', () => {
  it('press-2 can be opened with parentMatchId = press-1 (uncapped depth)', () => {
    const cfg = makeNassauCfg({ pressScope: 'nine' })
    const round = makeRoundCfg(cfg)
    const out1 = openPress(
      { hole: 3, parentMatchId: 'front', openingPlayer: 'B' },
      cfg, round, initialMatches(cfg),
    )
    const out2 = openPress(
      { hole: 5, parentMatchId: 'press-1', openingPlayer: 'A' },
      cfg, round, out1.matches,
    )
    const press1 = out2.matches.find((m) => m.id === 'press-1')
    const press2 = out2.matches.find((m) => m.id === 'press-2')
    expect(press1).toBeDefined()
    expect(press2).toBeDefined()
    expect(press2?.parentId).toBe('press-1')
    expect(press2?.startHole).toBe(6)
  })

  it('openPress throws when parentMatchId does not exist', () => {
    const cfg = makeNassauCfg()
    const round = makeRoundCfg(cfg)
    expect(() =>
      openPress(
        { hole: 3, parentMatchId: 'no-such-match', openingPlayer: 'B' },
        cfg, round, initialMatches(cfg),
      ),
    ).toThrow(NassauConfigError)
  })
})

// ─── Phase 2 Turn 2 — § 10 full 18-hole integration (auto-2-down press) ─────
//
// Runs the complete § 10 worked example: front 9, holes 10-11, auto-2-down
// press injected after hole 11 (back A 2-0), then holes 12-18 with press-1
// active alongside the back and overall matches.

describe('§ 10 Worked Example — full 18-hole integration (auto-2-down press)', () => {
  const cfg = makeNassauCfg({ pressRule: 'auto-2-down', pressScope: 'nine', appliesHandicap: true })
  const round = makeRoundCfg(cfg)
  const strokes = { A: 0, B: 5 }

  const front9rows = [
    { hole: 1,  idx: 7,  gross: { A: 5, B: 4 } },
    { hole: 2,  idx: 3,  gross: { A: 3, B: 4 } },
    { hole: 3,  idx: 15, gross: { A: 3, B: 4 } },
    { hole: 4,  idx: 1,  gross: { A: 5, B: 5 } },
    { hole: 5,  idx: 11, gross: { A: 4, B: 5 } },
    { hole: 6,  idx: 17, gross: { A: 3, B: 4 } },
    { hole: 7,  idx: 5,  gross: { A: 5, B: 4 } },
    { hole: 8,  idx: 9,  gross: { A: 5, B: 6 } },
    { hole: 9,  idx: 13, gross: { A: 5, B: 5 } },
  ].map((r) => ({ ...r, strokes }))

  const back9rows = [
    { hole: 10, idx: 8,  gross: { A: 4, B: 5 } },
    { hole: 11, idx: 16, gross: { A: 3, B: 4 } },
    { hole: 12, idx: 2,  gross: { A: 4, B: 5 } },
    { hole: 13, idx: 6,  gross: { A: 5, B: 4 } },
    { hole: 14, idx: 12, gross: { A: 5, B: 4 } },
    { hole: 15, idx: 18, gross: { A: 4, B: 3 } },
    { hole: 16, idx: 4,  gross: { A: 3, B: 5 } },
    { hole: 17, idx: 10, gross: { A: 5, B: 6 } },
    { hole: 18, idx: 14, gross: { A: 4, B: 4 } },
  ].map((r) => ({ ...r, strokes }))

  const { events: exampleEvents, matches: exampleMatches } = (() => {
    let matches = initialMatches(cfg)
    const events: ScoringEvent[] = []

    for (const row of front9rows) {
      const h = makeHole(row.hole, row.idx, row.gross, { strokes: row.strokes })
      const out = settleNassauHole(h, cfg, round, matches)
      events.push(...out.events)
      matches = out.matches
    }
    for (const row of back9rows.slice(0, 2)) {
      const h = makeHole(row.hole, row.idx, row.gross, { strokes: row.strokes })
      const out = settleNassauHole(h, cfg, round, matches)
      events.push(...out.events)
      matches = out.matches
    }
    // After hole 11: back match A 2–0; auto-2-down threshold met; B confirms press
    const backAfter11 = matches.find((m) => m.id === 'back')!
    events.push(...offerPress(11, backAfter11, cfg, 'B'))
    const pressResult = openPress(
      { hole: 11, parentMatchId: 'back', openingPlayer: 'B' },
      cfg, round, matches,
    )
    events.push(...pressResult.events)
    matches = pressResult.matches
    for (const row of back9rows.slice(2)) {
      const h = makeHole(row.hole, row.idx, row.gross, { strokes: row.strokes })
      const out = settleNassauHole(h, cfg, round, matches)
      events.push(...out.events)
      matches = out.matches
    }

    return { events, matches }
  })()

  it('back match ends at A 4–3 per § 10 table', () => {
    const back = exampleMatches.find((m) => m.id === 'back')
    expect(back?.holesWonA).toBe(4)
    expect(back?.holesWonB).toBe(3)
  })

  it('press-1 ends at B 3–2 per § 10 table', () => {
    const press = exampleMatches.find((m) => m.id === 'press-1')
    expect(press).toBeDefined()
    expect(press?.holesWonA).toBe(2)
    expect(press?.holesWonB).toBe(3)
  })

  it('overall match ends at A 8–6 per § 10 table', () => {
    const overall = exampleMatches.find((m) => m.id === 'overall')
    expect(overall?.holesWonA).toBe(8)
    expect(overall?.holesWonB).toBe(6)
  })

  it('exactly one PressOpened event, actor B, hole 11, parentMatchId = back', () => {
    const opened = exampleEvents.filter(
      (e): e is ScoringEvent & { kind: 'PressOpened' } => e.kind === 'PressOpened',
    )
    expect(opened).toHaveLength(1)
    expect(opened[0].actor).toBe('B')
    expect(opened[0].hole).toBe(11)
    expect(opened[0].parentMatchId).toBe('back')
  })

  it('zero PressOpened events on front or overall match', () => {
    const opened = exampleEvents.filter(
      (e): e is ScoringEvent & { kind: 'PressOpened' } => e.kind === 'PressOpened',
    )
    for (const e of opened) {
      expect(e.parentMatchId).not.toBe('front')
      expect(e.parentMatchId).not.toBe('overall')
    }
  })
})

// ─── Phase 2 Turn 2 — § 12 Test 2 manual press refused ───────────────────────
//
// Same gross scores as § 10. pressRule = 'manual'; test driver never calls
// openPress — simulating the down player declining. Key invariant: no press
// MatchState is created. PressOpened event count is the binding assertion;
// PressOffered count is not asserted (manual mode may emit it for any lead).

describe('§ 12 Test 2 — manual press refused (openPress never called)', () => {
  const cfg = makeNassauCfg({ pressRule: 'manual', pressScope: 'nine', appliesHandicap: true })
  const round = makeRoundCfg(cfg)
  const strokes = { A: 0, B: 5 }

  const allRows = [
    { hole: 1,  idx: 7,  gross: { A: 5, B: 4 } },
    { hole: 2,  idx: 3,  gross: { A: 3, B: 4 } },
    { hole: 3,  idx: 15, gross: { A: 3, B: 4 } },
    { hole: 4,  idx: 1,  gross: { A: 5, B: 5 } },
    { hole: 5,  idx: 11, gross: { A: 4, B: 5 } },
    { hole: 6,  idx: 17, gross: { A: 3, B: 4 } },
    { hole: 7,  idx: 5,  gross: { A: 5, B: 4 } },
    { hole: 8,  idx: 9,  gross: { A: 5, B: 6 } },
    { hole: 9,  idx: 13, gross: { A: 5, B: 5 } },
    { hole: 10, idx: 8,  gross: { A: 4, B: 5 } },
    { hole: 11, idx: 16, gross: { A: 3, B: 4 } },
    { hole: 12, idx: 2,  gross: { A: 4, B: 5 } },
    { hole: 13, idx: 6,  gross: { A: 5, B: 4 } },
    { hole: 14, idx: 12, gross: { A: 5, B: 4 } },
    { hole: 15, idx: 18, gross: { A: 4, B: 3 } },
    { hole: 16, idx: 4,  gross: { A: 3, B: 5 } },
    { hole: 17, idx: 10, gross: { A: 5, B: 6 } },
    { hole: 18, idx: 14, gross: { A: 4, B: 4 } },
  ].map((r) => ({ ...r, strokes }))

  const { events, matches } = runHoles(allRows, cfg, round)

  it('three MatchStates only — no press MatchState created, zero PressOpened events', () => {
    expect(matches).toHaveLength(3)
    expect(matches.every((m) => !m.id.startsWith('press-'))).toBe(true)
    expect(events.filter((e) => e.kind === 'PressOpened')).toHaveLength(0)
  })

  it('back match A 4–3 — base match unaffected by absent press', () => {
    const back = matches.find((m) => m.id === 'back')
    expect(back?.holesWonA).toBe(4)
    expect(back?.holesWonB).toBe(3)
  })
})

// ─── Phase 2 Turn 2 — press scoring unit proof ───────────────────────────────
//
// Unit-level proof that settleNassauHole increments press-1 alongside its
// parent when both windows cover the same hole. Two holes (A wins, B wins)
// confirm both increment directions. Integration-level proof is Block A above.

describe('press match increments alongside parent through settleNassauHole', () => {
  const cfg = makeNassauCfg({ pressScope: 'nine' })
  const round = makeRoundCfg(cfg)

  it('press-1 and back match both increment for A-win and B-win holes in their shared window', () => {
    // press-1 opened on hole 12 (nine scope, back parent): startHole=13, endHole=18
    const { matches: withPress } = openPress(
      { hole: 12, parentMatchId: 'back', openingPlayer: 'B' },
      cfg, round, initialMatches(cfg),
    )

    // Hole 13: A wins (gross 3 vs 4, no handicap)
    const out13 = settleNassauHole(makeHole(13, 6, { A: 3, B: 4 }), cfg, round, withPress)
    // Hole 14: B wins (gross 5 vs 4, no handicap)
    const out14 = settleNassauHole(makeHole(14, 12, { A: 5, B: 4 }), cfg, round, out13.matches)

    const back = out14.matches.find((m) => m.id === 'back')
    const press = out14.matches.find((m) => m.id === 'press-1')

    expect(back?.holesWonA).toBe(1)   // A wins hole 13
    expect(back?.holesWonB).toBe(1)   // B wins hole 14
    expect(press?.holesWonA).toBe(1)  // press-1 window covers 13 and 14
    expect(press?.holesWonB).toBe(1)
  })
})
