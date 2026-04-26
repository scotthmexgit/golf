// src/bridge/shared.ts — Generic bridge utilities used across all bet bridges.
// Bet-specific orchestration lives in <bet>_bridge.ts files.
//
// Portability: imports from src/types (shared UI types) and
// src/games/* (pure engine). No next/*, react, react-dom, fs, or path imports.

import type { HoleData, PlayerSetup, PayoutMap } from '../types'
import type {
  AnyBetCfg,
  BetSelection,
  BetType,
  HoleState,
  JunkRoundConfig,
  RoundConfig,
} from '../games/types'
import { effectiveCourseHcp } from '../games/handicap'

// ── HoleData → HoleState translator ──────────────────────────────────────────
//
// Populates the 5 fields every current bet reads (hole, holeIndex, par,
// gross[pid], strokes[pid]) and stubs all other HoleState fields with safe
// empty defaults. Bet-agnostic: Skins, Stroke Play, and Wolf all read the
// same 5-field surface. Match Play and Nassau will need an extended variant
// when they unpark (they also read pickedUp/conceded/withdrew from HoleState).
//
// HoleData.scores uses string keys; a player with no recorded score is absent
// from the map. Mapping undefined → 0 triggers the engine's missing-score
// path (FieldTooSmall or IncompleteCard, depending on the bet).

export function buildHoleState(
  holeData: HoleData,
  players: PlayerSetup[],
): HoleState {
  const gross: Record<string, number> = {}
  const strokes: Record<string, number> = {}

  for (const player of players) {
    gross[player.id] = holeData.scores[player.id] ?? 0
    // strokes[pid] stores the player's effective course handicap.
    // The engine calls strokesOnHole(strokes[pid], holeIndex) to derive
    // per-hole stroke allocation; the bridge stores the total courseHcp.
    strokes[player.id] = effectiveCourseHcp(player)
  }

  return {
    hole: holeData.number,
    par: holeData.par,
    holeIndex: holeData.index,
    timestamp: new Date().toISOString(),
    gross,
    strokes,
    // ── Stubs: none of the 5-field bets read these ──────────────────────────
    status: 'Confirmed',
    ctpWinner: null,
    longestDriveWinners: [],
    bunkerVisited: {},
    treeSolidHit: {},
    treeAnyHit: {},
    longPutt: {},
    polieInvoked: {},
    fairwayHit: {},
    gir: {},
    pickedUp: [],
    conceded: [],
    withdrew: [],
  }
}

// ── Minimal JunkRoundConfig ───────────────────────────────────────────────────
//
// Any bet whose v1 configuration has no junk items needs this as the
// RoundConfig.junk field. All five bets use junkItems: [] in v1.

export const EMPTY_JUNK: JunkRoundConfig = {
  girEnabled: false,
  longestDriveHoles: [],
  ctpEnabled: false,
  longestDriveEnabled: false,
  greenieEnabled: false,
  sandyEnabled: false,
  barkieEnabled: false,
  polieEnabled: false,
  arnieEnabled: false,
  polieMode: 'automatic',
  barkieStrict: false,
  superSandyEnabled: false,
}

// ── Minimal RoundConfig builder ───────────────────────────────────────────────
//
// Every bet engine uses roundCfg.bets only for findBetId (id + type equality
// check). All other RoundConfig fields are unused by the per-hole engine
// functions. Pass the bet-specific config and its BetType discriminator.

export function buildMinimalRoundCfg(cfg: AnyBetCfg, betType: BetType): RoundConfig {
  const bet: BetSelection = {
    id: cfg.id,
    type: betType,
    stake: cfg.stake,
    participants: cfg.playerIds,
    config: cfg,
    junkItems: cfg.junkItems,
    junkMultiplier: cfg.junkMultiplier,
  }
  return {
    roundId: '',
    courseName: '',
    players: [],
    bets: [bet],
    junk: EMPTY_JUNK,
    longestDriveHoles: [],
    locked: true,
    unitSize: 100,
  }
}

// ── PayoutMap adapter ─────────────────────────────────────────────────────────
//
// Projects any per-player ledger (net deltas from a bet's monetary events)
// to a PayoutMap, ensuring all playerIds are present (0 for any player not
// in the ledger, e.g. after a FieldTooSmall round).

export function payoutMapFromLedger(
  ledger: Record<string, number>,
  playerIds: string[],
): PayoutMap {
  const out: PayoutMap = {}
  for (const pid of playerIds) {
    out[pid] = ledger[pid] ?? 0
  }
  return out
}
