import type { HoleData, PlayerSetup, GameInstance, PayoutMap } from '@/types'
import { strokesOnHole } from './handicap'
import { vsPar } from './scoring'
import { computeJunkPayouts, hasAnyJunk } from './junk'
import { settleStrokePlayBet } from '../bridge/stroke_play_bridge'
import { payoutMapFromLedger } from '../bridge/shared'

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

export function computeSkins(holes: HoleData[], players: PlayerSetup[], game: GameInstance): PayoutMap {
  const payouts = emptyPayouts(game.playerIds)
  const inGame = players.filter(p => game.playerIds.includes(p.id))
  let carry = 0

  for (const h of holes) {
    const scores = inGame.map(p => {
      const gross = h.scores[p.id] || 0
      return { id: p.id, net: gross <= 0 ? 99 : gross - strokesOnHole(getStrokes(p), h.index) }
    })
    const best = Math.min(...scores.map(s => s.net))
    const winners = scores.filter(s => s.net === best)

    if (winners.length === 1) {
      const pot = game.stake + (game.escalating ? carry : 0)
      for (const p of inGame) {
        payouts[p.id] += p.id === winners[0].id ? pot * (inGame.length - 1) : -pot
      }
      carry = 0
    } else {
      carry += game.stake
    }
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
    case 'nassau': return computeNassau(holes, players, game)
    case 'stableford': return computeStableford(holes, players, game)
    case 'skins': return computeSkins(holes, players, game)
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
