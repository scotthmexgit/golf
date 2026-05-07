import type { HoleData, PlayerSetup, GameInstance, PayoutMap } from '@/types'
import { strokesOnHole } from './handicap'
import { vsPar } from './scoring'
import { computeJunkPayouts, hasAnyJunk } from './junk'
import { settleStrokePlayBet } from '../bridge/stroke_play_bridge'
import { settleSkinsBet, buildSkinsCfg } from '../bridge/skins_bridge'
import { settleWolfBet, buildWolfCfg } from '../bridge/wolf_bridge'
import { settleNassauBet, buildNassauCfg } from '../bridge/nassau_bridge'
import { payoutMapFromLedger, buildMinimalRoundCfg } from '../bridge/shared'
import { aggregateRound } from '../games/aggregate'
import type { ScoringEventLog } from '../games/types'

function emptyPayouts(playerIds: string[]): PayoutMap {
  const m: PayoutMap = {}
  for (const id of playerIds) m[id] = 0
  return m
}

function getStrokes(p: PlayerSetup): number {
  return (p as PlayerSetup & { strokes?: number }).strokes || 0
}


export function computeMatchPlay(holes: HoleData[], players: PlayerSetup[], game: GameInstance): PayoutMap {
  const payouts = emptyPayouts(game.playerIds)
  const inGame = players.filter(p => game.playerIds.includes(p.id))
  if (inGame.length < 2) return payouts

  const pairings: [PlayerSetup, PlayerSetup][] = []
  for (let i = 0; i < inGame.length; i++) {
    for (let j = i + 1; j < inGame.length; j++) {
      pairings.push([inGame[i], inGame[j]])
    }
  }

  for (const [p1, p2] of pairings) {
    let standing = 0
    for (const h of holes) {
      const g1 = h.scores[p1.id] || 0
      const g2 = h.scores[p2.id] || 0
      if (g1 <= 0 || g2 <= 0) continue
      const n1 = g1 - strokesOnHole(getStrokes(p1), h.index)
      const n2 = g2 - strokesOnHole(getStrokes(p2), h.index)
      if (n1 < n2) standing++
      else if (n2 < n1) standing--
    }
    if (standing > 0) { payouts[p1.id] += game.stake; payouts[p2.id] -= game.stake }
    else if (standing < 0) { payouts[p1.id] -= game.stake; payouts[p2.id] += game.stake }
  }

  return payouts
}


export function computeNassau(holes: HoleData[], players: PlayerSetup[], game: GameInstance): PayoutMap {
  const payouts = emptyPayouts(game.playerIds)
  const inGame = players.filter(p => game.playerIds.includes(p.id))
  if (inGame.length !== 2) return payouts

  const [p1, p2] = inGame
  function legScore(nums: number[]): number {
    let s = 0
    for (const h of holes) {
      if (!nums.includes(h.number)) continue
      const g1 = h.scores[p1.id] || 0, g2 = h.scores[p2.id] || 0
      if (g1 <= 0 || g2 <= 0) continue
      const n1 = g1 - strokesOnHole(getStrokes(p1), h.index)
      const n2 = g2 - strokesOnHole(getStrokes(p2), h.index)
      if (n1 < n2) s++; else if (n2 < n1) s--
    }
    return s
  }

  const front = legScore([1,2,3,4,5,6,7,8,9])
  const back = legScore([10,11,12,13,14,15,16,17,18])
  const overall = legScore(holes.map(h => h.number))
  let total = 0
  if (front > 0) total += game.stake; else if (front < 0) total -= game.stake
  if (back > 0) total += game.stake; else if (back < 0) total -= game.stake
  if (overall > 0) total += game.stake; else if (overall < 0) total -= game.stake
  payouts[p1.id] = total; payouts[p2.id] = -total
  return payouts
}

export function computeStableford(holes: HoleData[], players: PlayerSetup[], game: GameInstance): PayoutMap {
  const payouts = emptyPayouts(game.playerIds)
  const inGame = players.filter(p => game.playerIds.includes(p.id))
  const totals: Record<string, number> = {}

  for (const p of inGame) {
    let pts = 0
    for (const h of holes) {
      const gross = h.scores[p.id] || 0
      if (gross <= 0) continue
      const net = gross - strokesOnHole(getStrokes(p), h.index)
      const diff = vsPar(net, h.par)
      if (diff <= -3) pts += 5; else if (diff === -2) pts += 4
      else if (diff === -1) pts += 3; else if (diff === 0) pts += 2
      else if (diff === 1) pts += 1
    }
    totals[p.id] = pts
  }

  const sorted = inGame.map(p => ({ id: p.id, pts: totals[p.id] })).sort((a, b) => b.pts - a.pts)
  if (sorted.length >= 2 && sorted[0].pts > sorted[1].pts) {
    payouts[sorted[0].id] = game.stake * (inGame.length - 1)
    for (const s of sorted.slice(1)) payouts[s.id] = -game.stake
  }
  return payouts
}

function computeGamePayouts(holes: HoleData[], players: PlayerSetup[], game: GameInstance): PayoutMap {
  switch (game.type) {
    case 'strokePlay': {
      const { ledger } = settleStrokePlayBet(holes, players, game)
      return payoutMapFromLedger(ledger, game.playerIds)
    }
    case 'matchPlay': return computeMatchPlay(holes, players, game)
    case 'nassau': {
      // Phase 7 sweep: orchestrate through aggregateRound (Nassau, Wolf/Skins pattern).
      // Bridge produces finalized events (finalizeNassauRound runs inside settleNassauBet);
      // log is assembled here; aggregateRound reduces to RunningLedger.
      // DIVERGENCE from Wolf/Skins: Nassau byBet uses compound keys (${game.id}::${matchId}).
      // byBet[game.id] is always undefined — use netByPlayer instead.
      // PRECONDITION: the log assembled here contains events from this single Nassau bet only.
      // netByPlayer is correct under this precondition because aggregateRound is a pure reducer.
      // Multi-bet log usage would silently sum across bets — DO NOT change the assembly to span
      // multiple bets without revisiting this extraction.
      // Ref: docs/games/game_nassau.md; docs/2026-05-08/06-nassau-explore.md (NE6, NE9)
      const nassauCfg = buildNassauCfg(game)
      // Guard: buildNassauCfg must preserve game.id so event attribution is correct.
      // (GR8 — string-equality bet-id chain). If this throws, the bridge contract broke.
      if (nassauCfg.id !== game.id) {
        throw new Error(`Nassau bridge id contract violation: nassauCfg.id="${nassauCfg.id}" !== game.id="${game.id}"`)
      }
      const { events } = settleNassauBet(holes, players, game)
      const log: ScoringEventLog = { events, supersessions: {} }
      const roundCfg = buildMinimalRoundCfg(nassauCfg, 'nassau')
      const result = aggregateRound(log, roundCfg)
      // Nassau byBet keys are compound (${game.id}::${matchId}) — byBet[game.id] is undefined.
      // netByPlayer is safe: single-bet log, no cross-bet contamination.
      return payoutMapFromLedger(result.netByPlayer, game.playerIds)
    }
    case 'stableford': return computeStableford(holes, players, game)
    case 'skins': {
      // Phase 7 sweep: orchestrate through aggregateRound (Skins, Wolf-pilot pattern).
      // Bridge produces finalized events (finalizeSkinsRound runs inside settleSkinsBet);
      // log is assembled here; aggregateRound reduces to RunningLedger;
      // Skins ledger extracted from byBet[game.id].
      // Ref: docs/games/game_skins.md; docs/2026-05-08/03-skins-plan.md
      const skinsCfg = buildSkinsCfg(game)
      // Guard: buildSkinsCfg must preserve game.id so byBet keying is correct
      // (GR8 — string-equality bet-id chain). If this throws, the bridge contract broke.
      if (skinsCfg.id !== game.id) {
        throw new Error(`Skins bridge id contract violation: skinsCfg.id="${skinsCfg.id}" !== game.id="${game.id}"`)
      }
      const { events } = settleSkinsBet(holes, players, game)
      const log: ScoringEventLog = { events, supersessions: {} }
      const roundCfg = buildMinimalRoundCfg(skinsCfg, 'skins')
      const result = aggregateRound(log, roundCfg)
      // byBet[game.id] is undefined only when no SkinWon events fired (all holes tied/forfeited).
      const skinsLedger = result.byBet[game.id] ?? {}
      return payoutMapFromLedger(skinsLedger, game.playerIds)
    }
    case 'wolf': {
      // WF7-2: orchestrate through aggregateRound (Wolf-pilot cutover).
      // Bridge produces finalized events; log is assembled here; aggregateRound
      // reduces to RunningLedger; Wolf ledger extracted from byBet[game.id].
      // Ref: docs/2026-05-07/04-wolf-plan-codex-review.md (corrected WF7-2 description).
      const wolfCfg = buildWolfCfg(game)
      // Guard: buildWolfCfg must preserve game.id so byBet keying is correct
      // (GR8 — string-equality bet-id chain). If this throws, the bridge contract broke.
      if (wolfCfg.id !== game.id) {
        throw new Error(`Wolf bridge id contract violation: wolfCfg.id="${wolfCfg.id}" !== game.id="${game.id}"`)
      }
      const { events } = settleWolfBet(holes, players, game)
      const log: ScoringEventLog = { events, supersessions: {} }
      const roundCfg = buildMinimalRoundCfg(wolfCfg, 'wolf')
      const result = aggregateRound(log, roundCfg)
      // byBet[game.id] is undefined only when no monetary events fired (all WolfDecisionMissing).
      const wolfLedger = result.byBet[game.id] ?? {}
      return payoutMapFromLedger(wolfLedger, game.playerIds)
    }
    default: return emptyPayouts(game.playerIds)
  }
}

export function computeAllPayouts(
  holes: HoleData[],
  players: PlayerSetup[],
  games: GameInstance[],
): PayoutMap {
  const combined: PayoutMap = {}
  for (const p of players) combined[p.id] = 0

  for (const game of games) {
    // Game payouts
    const gp = computeGamePayouts(holes, players, game)
    for (const [id, amt] of Object.entries(gp)) {
      combined[id] = (combined[id] || 0) + amt
    }

    // Junk payouts per game instance
    if (hasAnyJunk(game.junk)) {
      const jp = computeJunkPayouts(holes, game.id, game.junk, players, game.playerIds)
      for (const [id, amt] of Object.entries(jp)) {
        combined[id] = (combined[id] || 0) + amt
      }
    }
  }

  return combined
}
