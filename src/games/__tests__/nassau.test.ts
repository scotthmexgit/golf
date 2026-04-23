import { describe, it, expect } from 'vitest'
import {
  settleNassauHole,
  finalizeNassauRound,
  initialMatches,
  offerPress,
  openPress,
  settleNassauWithdrawal,
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

  it('emits NassauHoleResolved for holes 1–8 on front + overall; hole 9 front emits MatchClosedOut instead', () => {
    const resolvedEvents = result.events.filter((e) => e.kind === 'NassauHoleResolved')
    // Holes 1–8: front + overall = 16. Hole 9: front closes out (A 4–3, holesRemaining=0) → MatchClosedOut;
    // overall continues (holesRemaining=9, no closeout) → NassauHoleResolved. Total = 17.
    expect(resolvedEvents).toHaveLength(17)
    const frontEvents = resolvedEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'front',
    )
    const overallEvents = resolvedEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
    )
    expect(frontEvents).toHaveLength(8)   // holes 1–8; hole 9 → MatchClosedOut
    expect(overallEvents).toHaveLength(9)  // all 9 holes (overall doesn't close out at hole 9)
    // No back events during front-9 since back.startHole = 10.
    const backEvents = resolvedEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'back',
    )
    expect(backEvents).toHaveLength(0)
  })

  it('produces the expected winner sequence per § 10 table (holes 1–8 via NassauHoleResolved)', () => {
    const frontEvents = result.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'front',
    )
    const winners = frontEvents.map((e) => e.winner)
    // Holes 1–8 per § 10: B, tie, A, B, A, A, B, A.
    // Hole 9 (tie) triggers closeout on front (A leads 4–3, holesRemaining=0) → emits
    // MatchClosedOut for front, not NassauHoleResolved, so it does not appear here.
    expect(winners).toEqual(['B', 'tie', 'A', 'B', 'A', 'A', 'B', 'A'])
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

})

// ─── Phase 2 — offerPress threshold semantics ──────────────────────────────
//
// Distinguishing-input tests per prompt 015 guidance: pick inputs where
// auto-2-down rejects but manual accepts (or vice versa). downBy=2 is the
// single point where all three press rules agree, so it's NOT a
// distinguishing test on its own.

describe('offerPress threshold semantics (auto-2-down / auto-1-down / manual)', () => {
  function matchAt(holesWonA: number, holesWonB: number): MatchState {
    return { id: 'front', startHole: 1, endHole: 9, holesWonA, holesWonB, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null }
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

  it('all four matches closed out via settleNassauHole — finalizeNassauRound emits nothing', () => {
    expect(exampleMatches.every((m) => m.closed === true)).toBe(true)
    const finalEvents = finalizeNassauRound(cfg, round, exampleMatches)
    expect(finalEvents).toHaveLength(0)
  })

  it('round totals A: +2, B: −2 across MatchClosedOut events (§ 10 table)', () => {
    const closeouts = exampleEvents.filter(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } => e.kind === 'MatchClosedOut',
    )
    let totalA = 0
    let totalB = 0
    for (const e of closeouts) {
      totalA += (e.points as Record<string, number>)['A'] ?? 0
      totalB += (e.points as Record<string, number>)['B'] ?? 0
    }
    expect(totalA).toBe(2)
    expect(totalB).toBe(-2)
    expect(totalA + totalB).toBe(0)
  })

  it('every delta in § 10 MatchClosedOut events is an integer', () => {
    const closeouts = exampleEvents.filter(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } => e.kind === 'MatchClosedOut',
    )
    for (const e of closeouts) {
      for (const v of Object.values(e.points as Record<string, number>)) {
        expect(Number.isInteger(v)).toBe(true)
      }
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

// ─── Phase 3 — § 12 Test 3: match closeout on the back 9 ───────────────────
//
// A wins holes 10–14 straight; back match reaches holesUp=5, holesRemaining=4
// at hole 14 → closeout fires. Holes 15–18 are fed through settleNassauHole to
// confirm the back match state is frozen (closed=true) while overall continues.

describe('§ 12 Test 3 — match closeout on the back 9', () => {
  const cfg = makeNassauCfg({ stake: 1 })
  const round = makeRoundCfg(cfg)

  // Pre-constructed state going into hole 14.
  // front: closed (B won the front 9); back: A 4-0 (one more A-win triggers closeout);
  // overall: B leads 6-4, so when A wins h14 (overall A 5-6, holesUp=1, holesRemaining=4),
  // the overall does NOT close out while the back (holesUp=5, holesRemaining=4) does.
  const preHole14: MatchState[] = [
    { id: 'front',   startHole: 1,  endHole: 9,  holesWonA: 2, holesWonB: 4, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null, closed: true },
    { id: 'back',    startHole: 10, endHole: 18, holesWonA: 4, holesWonB: 0, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall', startHole: 1,  endHole: 18, holesWonA: 4, holesWonB: 6, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
  ]

  // Hole 14: A wins → back 5-0, holesUp=5, holesRemaining=4 → back closeout.
  //          overall: A 5-6, holesUp=1, holesRemaining=4 → no closeout.
  const h14 = settleNassauHole(makeHole(14, 14, { A: 3, B: 4 }), cfg, round, preHole14)
  // Holes 15-18: A wins each. Back is closed (frozen). Overall scores 15-17 and
  // closes out at h18 (A 9-6, holesUp=3, holesRemaining=0 → 3 > 0).
  const h15 = settleNassauHole(makeHole(15, 15, { A: 3, B: 4 }), cfg, round, h14.matches)
  const h16 = settleNassauHole(makeHole(16, 16, { A: 3, B: 4 }), cfg, round, h15.matches)
  const h17 = settleNassauHole(makeHole(17, 17, { A: 3, B: 4 }), cfg, round, h16.matches)
  const h18 = settleNassauHole(makeHole(18, 18, { A: 3, B: 4 }), cfg, round, h17.matches)

  const t3Events = [
    ...h14.events, ...h15.events, ...h16.events, ...h17.events, ...h18.events,
  ]
  const t3Matches = h18.matches

  it('emits MatchClosedOut on hole 14 specifically for the back match', () => {
    const backCloseout = t3Events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'back',
    )
    expect(backCloseout).toBeDefined()
    expect(backCloseout!.hole).toBe(14)
    expect(backCloseout!.holesUp).toBe(5)
    expect(backCloseout!.holesRemaining).toBe(4)
  })

  it('back match delta: A +1 B -1', () => {
    const backCloseout = t3Events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'back',
    )!
    expect(backCloseout.points['A']).toBe(1)
    expect(backCloseout.points['B']).toBe(-1)
    expect(Number.isInteger(backCloseout.points['A'])).toBe(true)
    expect(Number.isInteger(backCloseout.points['B'])).toBe(true)
  })

  it('back match is frozen after closeout — state unchanged through holes 15-18', () => {
    const back = t3Matches.find((m) => m.id === 'back')!
    expect(back.closed).toBe(true)
    expect(back.holesWonA).toBe(5)
    expect(back.holesWonB).toBe(0)
  })

  it('overall match is NOT closed at hole 14 (B lead keeps holesUp=1 <= holesRemaining=4)', () => {
    const overallEarlyCloseout = t3Events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'overall' && e.hole <= 14,
    )
    expect(overallEarlyCloseout).toBeUndefined()
  })

  it('overall continues scoring — NassauHoleResolved emitted for holes 15-16 (h17 triggers overall closeout)', () => {
    // After h16: overall A 7-6, holesUp=1, holesRemaining=2 — still open.
    // After h17: overall A 8-6, holesUp=2, holesRemaining=1 → 2 > 1 → closes out at h17.
    const overallResolved = t3Events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'overall' && e.hole >= 15,
    )
    expect(overallResolved).toHaveLength(2) // holes 15 and 16
  })

  it('zero-sum on the back closeout event', () => {
    const backCloseout = t3Events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'back',
    )!
    const sum = Object.values(backCloseout.points as Record<string, number>).reduce((a, b) => a + b, 0)
    expect(sum).toBe(0)
  })
})

// ─── Phase 3 — § 12 Test 4: tied overall match ─────────────────────────────
//
// Constructs end-of-round MatchState directly: front won A, back won B, overall
// tied 9–9. finalizeNassauRound must emit MatchTied on overall and MatchClosedOut
// (with delta) on front and back. Zero-sum holds across all three events.

describe('§ 12 Test 4 — tied overall match', () => {
  const cfg = makeNassauCfg({ stake: 1 })
  const round = makeRoundCfg(cfg)

  // Construct end-of-round state directly — no holes played through settleNassauHole,
  // so closed is undefined on all three matches.
  const endMatches: MatchState[] = [
    { id: 'front', startHole: 1, endHole: 9, holesWonA: 5, holesWonB: 4, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'back', startHole: 10, endHole: 18, holesWonA: 4, holesWonB: 5, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall', startHole: 1, endHole: 18, holesWonA: 9, holesWonB: 9, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
  ]

  const t4Events = finalizeNassauRound(cfg, round, endMatches)

  it('emits MatchTied on the overall match (zero delta)', () => {
    const tied = t4Events.filter(
      (e): e is ScoringEvent & { kind: 'MatchTied' } => e.kind === 'MatchTied',
    )
    expect(tied).toHaveLength(1)
    expect(tied[0].matchId).toBe('overall')
  })

  it('front match settled: A +1 B −1', () => {
    const front = t4Events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'front',
    )
    expect(front).toBeDefined()
    expect(front!.points['A']).toBe(1)
    expect(front!.points['B']).toBe(-1)
    expect(front!.holesRemaining).toBe(0)
  })

  it('back match settled: A −1 B +1', () => {
    const back = t4Events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'back',
    )
    expect(back).toBeDefined()
    expect(back!.points['A']).toBe(-1)
    expect(back!.points['B']).toBe(1)
    expect(back!.holesRemaining).toBe(0)
  })

  it('zero-sum across all three settlement events (front+1 back−1 overall=0)', () => {
    let totalA = 0
    let totalB = 0
    for (const e of t4Events) {
      if ('points' in e) {
        totalA += (e.points as Record<string, number>)['A'] ?? 0
        totalB += (e.points as Record<string, number>)['B'] ?? 0
      }
    }
    expect(totalA + totalB).toBe(0)
    expect(totalA).toBe(0)
    expect(totalB).toBe(0)
  })

  it('every numeric delta is an integer', () => {
    for (const e of t4Events) {
      if ('points' in e) {
        for (const v of Object.values(e.points as Record<string, number>)) {
          expect(Number.isInteger(v)).toBe(true)
        }
      }
    }
  })
})

// ─── Phase 4a — Round Handicap integration (caller-applies model) ───────────
//
// _ROUND_HANDICAP.md § 6: Nassau feeds roundHandicap through the hole-state
// builder, not through nassau.ts. The engine reads state.strokes directly and
// never inspects RoundConfig.players[].roundHandicap.
//
// Two-test distinguishing pair. Same gross {A:5, B:4}, holeIndex=2, same
// RoundConfig (A roundHandicap=+10, B=0). Strokes differ:
//   Test A: strokes = effectiveCourseHcp (caller-adjusted).
//   Test B: strokes = courseHcp only (unadjusted).
//
// Pre-write winner computation:
//   W_unadj: strokes {A:5, B:5}, diff=0, strokesOnHole(0,2)=0 → A net=5, B net=4 → B
//   W_adj:   strokes {A:15,B:5}, diff=10, strokesOnHole(10,2)=1 → A net=4, B net=4 → tie
//   W_double: strokes {A:25,B:5}, diff=20, strokesOnHole(20,2)=2 → A net=3, B net=4 → A
//   All three distinct (B / tie / A). Constraint satisfied.
//
// If engine applied roundHandicap internally:
//   Test A: double-applied → diff=20 → 2 strokes → A wins; expects tie → FAILS.
//   Test B: engine applies once → diff=10 → tie; expects B wins → FAILS.

describe('Round Handicap integration — caller-applies model (_ROUND_HANDICAP.md § 6)', () => {
  const cfg = makeNassauCfg({ appliesHandicap: true })

  // Local RoundConfig: A roundHandicap=+10, B=0. makeRoundCfg is not used here
  // because roundHandicap:0 across the shared fixture is load-bearing for existing tests.
  const rhBet: BetSelection = {
    id: cfg.id, type: 'nassau', stake: cfg.stake,
    participants: cfg.playerIds, config: cfg,
    junkItems: cfg.junkItems, junkMultiplier: cfg.junkMultiplier,
  }
  const rhRound: RoundConfig = {
    roundId: 'rh-1', courseName: 'Test Course',
    players: [
      { id: 'A', name: 'A', hcpIndex: 5, tee: 'white', isCourseHcp: true,
        courseHcp: 5, betting: true, isSelf: false, roundHandicap: 10 },
      { id: 'B', name: 'B', hcpIndex: 5, tee: 'white', isCourseHcp: true,
        courseHcp: 5, betting: true, isSelf: false, roundHandicap: 0 },
    ],
    bets: [rhBet], junk: defaultJunkCfg, longestDriveHoles: [],
    locked: true, unitSize: 100,
  }

  it('Test A — caller-adjusted strokes: winner is tie', () => {
    // strokes = effectiveCourseHcp: A = 5+10 = 15, B = 5+0 = 5.
    // diff=10, strokesOnHole(10,2)=1, A net=5-1=4 = B net=4 → tie.
    const hole = makeHole(1, 2, { A: 5, B: 4 }, { strokes: { A: 15, B: 5 } })
    const out = settleNassauHole(hole, cfg, rhRound, initialMatches(cfg))
    const overall = out.events.find(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
    )
    expect(overall?.winner).toBe('tie')
  })

  it('Test B — unadjusted strokes, same gross: winner is B', () => {
    // strokes = courseHcp only: A=5, B=5. diff=0, no strokes, pure gross.
    // A gross 5 > B gross 4 → B wins.
    // If engine applied roundHandicap from RoundConfig (A +10): diff→10,
    // strokesOnHole(10,2)=1 → tie ≠ B wins → test would FAIL (predicted gap).
    const hole = makeHole(1, 2, { A: 5, B: 4 }, { strokes: { A: 5, B: 5 } })
    const out = settleNassauHole(hole, cfg, rhRound, initialMatches(cfg))
    const overall = out.events.find(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' && e.matchId === 'overall',
    )
    expect(overall?.winner).toBe('B')
  })
})

// ─── Phase 4b — § 9 missing-score forfeit ────────────────────────────────────
//
// A has no gross on hole 1 → B wins the forfeit. Front and overall increment
// for B (hole 1 is in both windows). Back is untouched (window starts at 10).
// Two NassauHoleForfeited events emitted — one per active match (front, overall);
// back is out-of-window on h1. Zero NassauHoleResolved.
// Both-missing case throws NassauConfigError (ambiguous per § 9).

describe('§ 9 — missing-score forfeit (NassauHoleForfeited)', () => {
  const cfg = makeNassauCfg()
  const round = makeRoundCfg(cfg)

  const partialHole = makeHole(1, 1, { B: 4 } as Record<PlayerId, number>)
  const forfeitOut = settleNassauHole(partialHole, cfg, round, initialMatches(cfg))

  it('emits NassauHoleForfeited per active match: two events (front + overall), forfeiter=A', () => {
    const forfeited = forfeitOut.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleForfeited' } => e.kind === 'NassauHoleForfeited',
    )
    expect(forfeited).toHaveLength(2)
    expect(forfeited.find((e) => e.matchId === 'front')?.forfeiter).toBe('A')
    expect(forfeited.find((e) => e.matchId === 'overall')?.forfeiter).toBe('A')
  })

  it('B wins front and overall; back (h10-18) untouched since hole 1 is out of window', () => {
    const front = forfeitOut.matches.find((m) => m.id === 'front')
    const back = forfeitOut.matches.find((m) => m.id === 'back')
    const overall = forfeitOut.matches.find((m) => m.id === 'overall')
    expect(front?.holesWonA).toBe(0)
    expect(front?.holesWonB).toBe(1)
    expect(overall?.holesWonA).toBe(0)
    expect(overall?.holesWonB).toBe(1)
    expect(back?.holesWonA).toBe(0)
    expect(back?.holesWonB).toBe(0)
  })

  it('emits zero NassauHoleResolved events on a forfeited hole', () => {
    const resolved = forfeitOut.events.filter((e) => e.kind === 'NassauHoleResolved')
    expect(resolved).toHaveLength(0)
  })

  it('throws NassauConfigError when both players have missing gross scores', () => {
    const bothMissing = makeHole(1, 1, {} as Record<PlayerId, number>)
    expect(() => settleNassauHole(bothMissing, cfg, round, initialMatches(cfg))).toThrow(NassauConfigError)
  })
})

// ─── Phase 4b — § 12 Test 6 withdrawal mid-round ─────────────────────────────
//
// State at hole 13 before withdrawal:
//   front:   closed — A won 4-3 (already settled A+1/B-1 earlier)
//   back:    A 3-0, open — A won holes 10, 11, 12
//   overall: A 7-3, open — front 4-3 plus back 3-0
//
// B withdraws at hole 13; opposing = A.
// Settled open matches: back (not tied → A+1/B-1) + overall (not tied → A+1/B-1).
// Combined points: {A:+2, B:-2}, Σ=0. Front contributes nothing (already closed).

describe('§ 12 Test 6 — withdrawal mid-round (NassauWithdrawalSettled)', () => {
  const cfg = makeNassauCfg({ stake: 1 })
  const round = makeRoundCfg(cfg)

  const preWithdrawal: MatchState[] = [
    { id: 'front',   startHole: 1,  endHole: 9,  holesWonA: 4, holesWonB: 3, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null, closed: true },
    { id: 'back',    startHole: 10, endHole: 18, holesWonA: 3, holesWonB: 0, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall', startHole: 1,  endHole: 18, holesWonA: 7, holesWonB: 3, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
  ]

  const { events: wEvents, matches: wMatches } = settleNassauWithdrawal(
    13, 'B', cfg, round, preWithdrawal,
  )

  // Σ delta pre-write: back A 3-0 (not tied) → {A:+1,B:-1}; overall A 7-3 (not tied) → {A:+1,B:-1}.
  // Two per-match events. Per-event Σ=0. Cross-event Σ: A=+2, B=-2, total=0.
  it('emits two NassauWithdrawalSettled events, one per open non-tied match (back and overall)', () => {
    const wsEvents = wEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauWithdrawalSettled' } =>
        e.kind === 'NassauWithdrawalSettled',
    )
    expect(wsEvents).toHaveLength(2)
    const backEvt = wsEvents.find((e) => e.matchId === 'back')
    const overallEvt = wsEvents.find((e) => e.matchId === 'overall')
    expect(backEvt).toBeDefined()
    expect(backEvt!.withdrawer).toBe('B')
    expect((backEvt!.points as Record<string, number>)['A']).toBe(1)
    expect((backEvt!.points as Record<string, number>)['B']).toBe(-1)
    expect(overallEvt).toBeDefined()
    expect(overallEvt!.withdrawer).toBe('B')
    expect((overallEvt!.points as Record<string, number>)['A']).toBe(1)
    expect((overallEvt!.points as Record<string, number>)['B']).toBe(-1)
  })

  it('each event is individually zero-sum; Σ(A)=+2 and Σ(B)=−2 across both events', () => {
    const wsEvents = wEvents.filter(
      (e): e is ScoringEvent & { kind: 'NassauWithdrawalSettled' } =>
        e.kind === 'NassauWithdrawalSettled',
    )
    for (const e of wsEvents) {
      const perEvtSum = Object.values(e.points as Record<string, number>).reduce((a, b) => a + b, 0)
      expect(perEvtSum).toBe(0)
    }
    const totalA = wsEvents.reduce((s, e) => s + ((e.points as Record<string, number>)['A'] ?? 0), 0)
    const totalB = wsEvents.reduce((s, e) => s + ((e.points as Record<string, number>)['B'] ?? 0), 0)
    expect(totalA).toBe(2)
    expect(totalB).toBe(-2)
    expect(totalA + totalB).toBe(0)
  })

  it('all previously open matches closed after withdrawal; front remains closed', () => {
    expect(wMatches.every((m) => m.closed === true)).toBe(true)
  })

  it('settleNassauHole emits no events for holes after withdrawal (all matches closed)', () => {
    const h14 = settleNassauHole(makeHole(14, 14, { A: 3, B: 4 }), cfg, round, wMatches)
    expect(h14.events).toHaveLength(0)
  })

})

// ─── Phase 4b — § 9 missing-score forfeit (B-missing, symmetric) ─────────────
//
// Symmetric of the A-missing block: B has no gross on hole 1, A present.
// Tests the grossB === undefined branch of forfeitWinner computation, which
// A-missing tests leave unexercised.
// Two NassauHoleForfeited events: one per active match (front + overall on h1).

describe('§ 9 — missing-score forfeit (B-missing, symmetric)', () => {
  const cfg = makeNassauCfg()
  const round = makeRoundCfg(cfg)

  const partialHole = makeHole(1, 1, { A: 4 } as Record<PlayerId, number>)
  const forfeitOut = settleNassauHole(partialHole, cfg, round, initialMatches(cfg))

  it('emits NassauHoleForfeited per active match: two events (front + overall), forfeiter=B', () => {
    const forfeited = forfeitOut.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleForfeited' } => e.kind === 'NassauHoleForfeited',
    )
    expect(forfeited).toHaveLength(2)
    expect(forfeited.find((e) => e.matchId === 'front')?.forfeiter).toBe('B')
    expect(forfeited.find((e) => e.matchId === 'overall')?.forfeiter).toBe('B')
  })

  it('A wins front and overall; back (h10-18) untouched since hole 1 is out of window', () => {
    const front = forfeitOut.matches.find((m) => m.id === 'front')
    const back = forfeitOut.matches.find((m) => m.id === 'back')
    const overall = forfeitOut.matches.find((m) => m.id === 'overall')
    expect(front?.holesWonA).toBe(1)
    expect(front?.holesWonB).toBe(0)
    expect(overall?.holesWonA).toBe(1)
    expect(overall?.holesWonB).toBe(0)
    expect(back?.holesWonA).toBe(0)
    expect(back?.holesWonB).toBe(0)
  })

  it('emits zero NassauHoleResolved events on a forfeited hole', () => {
    const resolved = forfeitOut.events.filter((e) => e.kind === 'NassauHoleResolved')
    expect(resolved).toHaveLength(0)
  })
})

// ─── Phase 4b — § 9 forfeit on a match's final hole ──────────────────────────
//
// Front tied 4-4 entering hole 9 (final hole of front match). A has no gross.
// B wins the forfeit → front becomes B 5-4 (holesUp=1, holesRemaining=0) →
// MatchClosedOut fires in the same call. Both events must emit; zero-sum must hold.
// NassauHoleForfeited precedes the loop so it emits unconditionally; MatchClosedOut
// emits inside the loop using forfeitWinner as the winner. No NassauHoleResolved.

describe('§ 9 — forfeit on a match final hole (NassauHoleForfeited + MatchClosedOut co-emit)', () => {
  const cfg = makeNassauCfg({ stake: 1 })
  const round = makeRoundCfg(cfg)

  const preFinalHole: MatchState[] = [
    { id: 'front',   startHole: 1,  endHole: 9,  holesWonA: 4, holesWonB: 4, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'back',    startHole: 10, endHole: 18, holesWonA: 0, holesWonB: 0, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall', startHole: 1,  endHole: 18, holesWonA: 4, holesWonB: 4, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
  ]
  const missingAOnH9 = makeHole(9, 9, { B: 4 } as Record<PlayerId, number>)
  const out = settleNassauHole(missingAOnH9, cfg, round, preFinalHole)

  it('emits NassauHoleForfeited and MatchClosedOut for front in the same call', () => {
    expect(out.events.some((e) => e.kind === 'NassauHoleForfeited')).toBe(true)
    const closeout = out.events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'front',
    )
    expect(closeout).toBeDefined()
    expect(closeout!.hole).toBe(9)
    expect(closeout!.holesUp).toBe(1)
    expect(closeout!.holesRemaining).toBe(0)
  })

  it('MatchClosedOut delta is zero-sum: B wins (A forfeited), B+1 A-1', () => {
    const closeout = out.events.find(
      (e): e is ScoringEvent & { kind: 'MatchClosedOut' } =>
        e.kind === 'MatchClosedOut' && e.matchId === 'front',
    )!
    expect((closeout.points as Record<string, number>)['B']).toBe(1)
    expect((closeout.points as Record<string, number>)['A']).toBe(-1)
    const sum = Object.values(closeout.points as Record<string, number>).reduce((a, b) => a + b, 0)
    expect(sum).toBe(0)
  })

  it('emits no NassauHoleResolved events (forfeit suppresses them)', () => {
    expect(out.events.filter((e) => e.kind === 'NassauHoleResolved')).toHaveLength(0)
  })
})

// ─── Phase 4c Gate 2 — allPairs missing-score forfeit ────────────────────────
//
// 3 players A/B/C, allPairs mode. A has no gross on hole 1.
// On hole 1: front (h1-9) and overall (h1-18) are active; back (h10-18) is not.
// Pairs containing A: (A,B) and (A,C). Pair (B,C) plays normally — B and C both
// have scores so no forfeit in that pair (per game_nassau.md § 9 line 147:
// "Missing scores propagate per-pair").
// Expected: 4 NassauHoleForfeited events (front-A-B, overall-A-B, front-A-C, overall-A-C),
// each with forfeiter=A and the correct matchId. Zero NassauHoleForfeited for B-C matches.
// Pair (B,C) advances normally: NassauHoleResolved emitted for front-B-C and overall-B-C.

describe('§ 9 allPairs — missing-score forfeit propagates per-pair only', () => {
  const cfg = makeNassauCfg({
    pairingMode: 'allPairs',
    playerIds: ['A', 'B', 'C'],
    appliesHandicap: false,
  })
  const round = makeRoundCfg(cfg)

  // A missing; B=4, C=3 present. On hole 1, front and overall are active for all pairs.
  const holeAMissing = makeHole(1, 1, { B: 4, C: 3 } as Record<PlayerId, number>)
  const out = settleNassauHole(holeAMissing, cfg, round, initialMatches(cfg))

  it('emits 4 NassauHoleForfeited events — one per active match in affected pairs', () => {
    const forfeited = out.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleForfeited' } => e.kind === 'NassauHoleForfeited',
    )
    expect(forfeited).toHaveLength(4)
    const matchIds = forfeited.map((e) => e.matchId).sort()
    expect(matchIds).toEqual(['front-A-B', 'front-A-C', 'overall-A-B', 'overall-A-C'])
    for (const e of forfeited) {
      expect(e.forfeiter).toBe('A')
    }
  })

  it('emits zero NassauHoleForfeited for B-C pair (both B and C have scores)', () => {
    const bcForfeited = out.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleForfeited' } =>
        e.kind === 'NassauHoleForfeited' &&
        (e.matchId === 'front-B-C' || e.matchId === 'overall-B-C'),
    )
    expect(bcForfeited).toHaveLength(0)
  })

  it('B-C pair plays normally: NassauHoleResolved emitted for front-B-C and overall-B-C', () => {
    const bcResolved = out.events.filter(
      (e): e is ScoringEvent & { kind: 'NassauHoleResolved' } =>
        e.kind === 'NassauHoleResolved' &&
        (e.matchId === 'front-B-C' || e.matchId === 'overall-B-C'),
    )
    // C=3 < B=4 → C wins both front-B-C and overall-B-C
    expect(bcResolved).toHaveLength(2)
    for (const e of bcResolved) {
      expect(e.winner).toBe('B')   // pair[1] is C (lower gross) but holeResult returns 'B' = pair[1]
    }
  })

  it('affected pair-matches advance for A opponent: holesWonB +1 in front-A-B, overall-A-B, front-A-C, overall-A-C', () => {
    const frontAB = out.matches.find((m) => m.id === 'front-A-B')
    const overallAB = out.matches.find((m) => m.id === 'overall-A-B')
    const frontAC = out.matches.find((m) => m.id === 'front-A-C')
    const overallAC = out.matches.find((m) => m.id === 'overall-A-C')
    expect(frontAB?.holesWonB).toBe(1)   // B won (A forfeited)
    expect(overallAB?.holesWonB).toBe(1)
    expect(frontAC?.holesWonB).toBe(1)   // C won (A forfeited)
    expect(overallAC?.holesWonB).toBe(1)
  })
})

// ─── Phase 4c Gate 2 — § 12 Test 5: allPairs mode with 3 players ─────────────
//
// 3 players A/B/C, pairingMode='allPairs', stake=100, no handicap, no press.
// Holes 1-9:  A=4, B=5, C=3 — C beats A and B; A beats B on front.
// Holes 10-18: A=3, B=4, C=5 — A beats B and C; B beats C on back.
// Arithmetic (stake=100):
//   Pair (A,B): A wins front+back+overall → A+300, B-300, sum=0.
//   Pair (A,C): C wins front, A wins back, overall tied → A=0, C=0, sum=0.
//   Pair (B,C): C wins front, B wins back, overall tied → B=0, C=0, sum=0.
//   Global: A+300 + B-300 + C0 = 0.

describe('§12 Test 5 — allPairs mode with 3 players', () => {
  const cfg = makeNassauCfg({
    stake: 100,
    pairingMode: 'allPairs',
    playerIds: ['A', 'B', 'C'],
    appliesHandicap: false,
  })
  const round = makeRoundCfg(cfg)

  it('initialMatches creates 9 MatchStates — 3 pairs × front/back/overall', () => {
    const ms = initialMatches(cfg)
    expect(ms).toHaveLength(9)
    for (const pair of ['A-B', 'A-C', 'B-C']) {
      expect(ms.filter((m) => m.pair.join('-') === pair)).toHaveLength(3)
    }
  })

  // Drive all 18 holes and finalize at describe scope (pattern from prior tests).
  const frontGross = { A: 4, B: 5, C: 3 } as Record<PlayerId, number>
  const backGross  = { A: 3, B: 4, C: 5 } as Record<PlayerId, number>
  const rows = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((h) => ({ hole: h, idx: h, gross: frontGross })),
    ...[10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => ({ hole: h, idx: h, gross: backGross })),
  ]
  const { events: holeEvents, matches: postHoleMatches } = runHoles(rows, cfg, round)
  const finalizeEvts = finalizeNassauRound(cfg, round, postHoleMatches)
  const allEvents = [...holeEvents, ...finalizeEvts]

  function totalFor(player: string): number {
    return allEvents.reduce((sum, e) => {
      if (e.kind === 'MatchClosedOut' || e.kind === 'NassauWithdrawalSettled') {
        return sum + (e.points[player] ?? 0)
      }
      return sum
    }, 0)
  }

  function pairTotal(player: string, matchIds: string[]): number {
    return allEvents.reduce((sum, e) => {
      if (e.kind === 'MatchClosedOut' && matchIds.includes(e.matchId)) {
        return sum + (e.points[player] ?? 0)
      }
      return sum
    }, 0)
  }

  it('Σ delta across A+B+C = 0 (global zero-sum)', () => {
    expect(totalFor('A') + totalFor('B') + totalFor('C')).toBe(0)
  })

  it('pair (A,B) settles zero-sum: A+300, B-300', () => {
    const ids = ['front-A-B', 'back-A-B', 'overall-A-B']
    expect(pairTotal('A', ids)).toBe(300)
    expect(pairTotal('B', ids)).toBe(-300)
    expect(pairTotal('A', ids) + pairTotal('B', ids)).toBe(0)
  })

  it('pair (A,C) settles zero-sum: front −100, back +100, overall tied', () => {
    const ids = ['front-A-C', 'back-A-C', 'overall-A-C']
    expect(pairTotal('A', ids)).toBe(0)
    expect(pairTotal('C', ids)).toBe(0)
    expect(pairTotal('A', ids) + pairTotal('C', ids)).toBe(0)
  })

  it('pair (B,C) settles zero-sum: front −100, back +100, overall tied', () => {
    const ids = ['front-B-C', 'back-B-C', 'overall-B-C']
    expect(pairTotal('B', ids)).toBe(0)
    expect(pairTotal('C', ids)).toBe(0)
    expect(pairTotal('B', ids) + pairTotal('C', ids)).toBe(0)
  })

  it('every delta in point-bearing events is an integer', () => {
    for (const e of allEvents) {
      if (e.kind === 'MatchClosedOut' || e.kind === 'NassauWithdrawalSettled') {
        for (const v of Object.values(e.points)) {
          expect(Number.isInteger(v)).toBe(true)
        }
      }
    }
  })
})

// ─── Phase 4d — allPairs withdrawal ──────────────────────────────────────────
//
// 3 players A/B/C, pairingMode='allPairs', stake=100. B withdraws after hole 5.
// Pre-withdrawal state (arithmetic computed before assertions):
//   front-A-B:   holesWonA=3, holesWonB=1 — A 2 up (open)
//   back-A-B:    holesWonA=0, holesWonB=0 — tied   (open, no holes played)
//   overall-A-B: holesWonA=3, holesWonB=1 — A 2 up (open)
//   front-A-C:   holesWonA=2, holesWonB=2 — tied   (open)
//   back-A-C:    holesWonA=0, holesWonB=0 — tied   (open)
//   overall-A-C: holesWonA=2, holesWonB=2 — tied   (open)
//   front-B-C:   holesWonA=1, holesWonB=3 — C 2 up (open)  pair[0]=B, pair[1]=C
//   back-B-C:    holesWonA=0, holesWonB=0 — tied   (open)
//   overall-B-C: holesWonA=1, holesWonB=3 — C 2 up (open)  pair[0]=B, pair[1]=C
//
// B withdraws → participant matches: (A,B)×3 and (B,C)×3. Non-participant: (A,C)×3.
// Settlement (stake=100):
//   front-A-B:   holesWon 3≠1 → {A:+100, B:−100}; closed
//   back-A-B:    holesWon 0=0 → tied, no event;    closed
//   overall-A-B: holesWon 3≠1 → {A:+100, B:−100}; closed
//   front-A-C:   B not in pair → pass through open
//   back-A-C:    B not in pair → pass through open
//   overall-A-C: B not in pair → pass through open
//   front-B-C:   holesWon 1≠3 → {C:+100, B:−100}; closed  (opposing=pair[1]=C)
//   back-B-C:    holesWon 0=0 → tied, no event;    closed
//   overall-B-C: holesWon 1≠3 → {C:+100, B:−100}; closed
// Events: 4 NassauWithdrawalSettled.
// Σ: A=+200, B=−400, C=+200 → 200−400+200=0.

describe('§ 9 allPairs — withdrawal settles participant matches, leaves non-participant open', () => {
  const cfg = makeNassauCfg({
    stake: 100,
    pairingMode: 'allPairs',
    playerIds: ['A', 'B', 'C'],
    appliesHandicap: false,
  })
  const round = makeRoundCfg(cfg)

  const preWithdrawal: MatchState[] = [
    { id: 'front-A-B',   startHole: 1,  endHole: 9,  holesWonA: 3, holesWonB: 1, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'back-A-B',    startHole: 10, endHole: 18, holesWonA: 0, holesWonB: 0, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall-A-B', startHole: 1,  endHole: 18, holesWonA: 3, holesWonB: 1, pair: ['A', 'B'] as [PlayerId, PlayerId], parentId: null },
    { id: 'front-A-C',   startHole: 1,  endHole: 9,  holesWonA: 2, holesWonB: 2, pair: ['A', 'C'] as [PlayerId, PlayerId], parentId: null },
    { id: 'back-A-C',    startHole: 10, endHole: 18, holesWonA: 0, holesWonB: 0, pair: ['A', 'C'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall-A-C', startHole: 1,  endHole: 18, holesWonA: 2, holesWonB: 2, pair: ['A', 'C'] as [PlayerId, PlayerId], parentId: null },
    { id: 'front-B-C',   startHole: 1,  endHole: 9,  holesWonA: 1, holesWonB: 3, pair: ['B', 'C'] as [PlayerId, PlayerId], parentId: null },
    { id: 'back-B-C',    startHole: 10, endHole: 18, holesWonA: 0, holesWonB: 0, pair: ['B', 'C'] as [PlayerId, PlayerId], parentId: null },
    { id: 'overall-B-C', startHole: 1,  endHole: 18, holesWonA: 1, holesWonB: 3, pair: ['B', 'C'] as [PlayerId, PlayerId], parentId: null },
  ]

  const { events: wEvents, matches: wMatches } = settleNassauWithdrawal(6, 'B', cfg, round, preWithdrawal)

  const wsEvents = wEvents.filter(
    (e): e is ScoringEvent & { kind: 'NassauWithdrawalSettled' } =>
      e.kind === 'NassauWithdrawalSettled',
  )

  it('emits 4 NassauWithdrawalSettled events — 2 for (A,B), 2 for (B,C)', () => {
    expect(wsEvents).toHaveLength(4)
    const ids = wsEvents.map((e) => e.matchId).sort()
    expect(ids).toEqual(['front-A-B', 'front-B-C', 'overall-A-B', 'overall-B-C'])
  })

  it('zero NassauWithdrawalSettled events for A-C pair (B not a participant)', () => {
    const acEvents = wsEvents.filter(
      (e) => e.matchId === 'front-A-C' || e.matchId === 'back-A-C' || e.matchId === 'overall-A-C',
    )
    expect(acEvents).toHaveLength(0)
  })

  it('Σ delta: A+200, B−400, C+200 = 0', () => {
    const total = (p: string) =>
      wsEvents.reduce((s, e) => s + (e.points[p] ?? 0), 0)
    expect(total('A')).toBe(200)
    expect(total('B')).toBe(-400)
    expect(total('C')).toBe(200)
    expect(total('A') + total('B') + total('C')).toBe(0)
  })

  it('(A,B) and (B,C) matches all closed after withdrawal', () => {
    const abbc = wMatches.filter(
      (m) => m.pair.join('-') === 'A-B' || m.pair.join('-') === 'B-C',
    )
    expect(abbc).toHaveLength(6)
    expect(abbc.every((m) => m.closed === true)).toBe(true)
  })

  it('(A,C) matches remain open after withdrawal (non-participant)', () => {
    const ac = wMatches.filter((m) => m.pair.join('-') === 'A-C')
    expect(ac).toHaveLength(3)
    expect(ac.every((m) => !m.closed)).toBe(true)
  })

  it('tied participant matches (back-A-B, back-B-C) close without emitting events', () => {
    const tied = wMatches.filter(
      (m) => m.id === 'back-A-B' || m.id === 'back-B-C',
    )
    expect(tied).toHaveLength(2)
    expect(tied.every((m) => m.closed === true)).toBe(true)
    const tiedEvents = wsEvents.filter(
      (e) => e.matchId === 'back-A-B' || e.matchId === 'back-B-C',
    )
    expect(tiedEvents).toHaveLength(0)
  })
})

// ─── Phase 4d — allPairs withdrawal: non-participant withdrawer ───────────────
//
// § 9 is silent on a withdrawer who is not in config.playerIds. Treated as
// caller contract violation: throw NassauConfigError.

describe('§ 9 allPairs — non-participant withdrawer throws NassauConfigError', () => {
  it('throws NassauConfigError when withdrawer is not in playerIds', () => {
    const cfg = makeNassauCfg({
      pairingMode: 'allPairs',
      playerIds: ['A', 'B', 'C'],
    })
    const round = makeRoundCfg(cfg)
    expect(() =>
      settleNassauWithdrawal(6, 'D' as PlayerId, cfg, round, initialMatches(cfg)),
    ).toThrow(NassauConfigError)
  })
})
