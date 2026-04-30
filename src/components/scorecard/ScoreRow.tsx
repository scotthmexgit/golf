'use client'

import { useState, useEffect } from 'react'
import type { PlayerSetup, HoleDots as HoleDotsType } from '@/types'
import { strokesOnHole } from '@/lib/handicap'
import { vsPar, parLabel, parColor, formatMoneyDecimal } from '@/lib/scoring'
import Stepper from '@/components/ui/Stepper'
import DotButton from '@/components/ui/DotButton'
import { useRoundStore } from '@/store/roundStore'

interface ScoreRowProps {
  player: PlayerSetup
  hole: number
  par: number
  holeIndex: number
  score: number
  dots: HoleDotsType
  activeGames: string[]
  showJunkDots: boolean
  // Per-hole bet delta map for all active games combined.
  // Absent = no active games; present (even as {}) = show bet row.
  // Value of 0 displays as "—" via formatMoneyDecimal.
  holeTotal?: Record<string, number>
  // Per-game breakdown for the current hole: { gameId → { playerId → delta } }.
  // Used to render the accordion expansion. Absent when holeTotal is absent.
  holeBreakdown?: Record<string, Record<string, number>>
}

export default function ScoreRow({
  player, hole, par, holeIndex, score, dots,
  activeGames, showJunkDots, holeTotal, holeBreakdown,
}: ScoreRowProps) {
  const { setScore, setDot, games } = useRoundStore()
  const [isExpanded, setIsExpanded] = useState(false)

  // Reset accordion to collapsed whenever the player navigates to a new hole.
  useEffect(() => {
    setIsExpanded(false)
  }, [hole])

  const strokes = strokesOnHole((player as PlayerSetup & { strokes?: number }).strokes || 0, holeIndex)

  // Which games give strokes on this hole (games is now an array)
  const strokeGames: string[] = []
  if (strokes > 0) {
    for (const g of games) {
      if (activeGames.includes(g.id) && g.playerIds.includes(player.id)) {
        strokeGames.push(g.label)
      }
    }
  }

  const diff = score > 0 ? vsPar(score, par) : null
  const holeDelta = holeTotal !== undefined ? (holeTotal[player.id] ?? 0) : null

  const handleSandyToggle = () => {
    if (!dots.sandy && score > 0 && score > par) {
      // Reject: score must be par or better for sandy
      return
    }
    setDot(player.id, hole, 'sandy', !dots.sandy)
  }

  const sandyRejected = !dots.sandy && score > 0 && score > par

  // Games this player participates in, in display order.
  const playerGames = games.filter(g => activeGames.includes(g.id) && g.playerIds.includes(player.id))

  return (
    <div
      className="rounded-xl border p-3 space-y-1.5"
      style={{ borderColor: 'var(--line)', background: 'white' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[13px] font-medium" style={{ color: 'var(--ink)' }}>
            {player.name || 'Golfer'}
          </span>
          <span className="text-[10px] ml-2 capitalize" style={{ color: 'var(--muted)' }}>
            {player.tee} · Crs {player.courseHcp}
          </span>
        </div>
      </div>

      {strokes > 0 && strokeGames.length > 0 && (
        <div className="text-[10px] font-semibold" style={{ color: 'var(--red-card)' }}>
          +{strokes} stroke{strokes > 1 ? 's' : ''} — {strokeGames.join(', ')}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {showJunkDots && (
            <>
              <DotButton type="sandy" active={dots.sandy} onClick={handleSandyToggle} rejected={sandyRejected} />
              <DotButton type="chipIn" active={dots.chipIn} onClick={() => setDot(player.id, hole, 'chipIn', !dots.chipIn)} />
              <DotButton type="threePutt" active={dots.threePutt} onClick={() => setDot(player.id, hole, 'threePutt', !dots.threePutt)} />
              <DotButton type="onePutt" active={dots.onePutt} onClick={() => setDot(player.id, hole, 'onePutt', !dots.onePutt)} />
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Stepper
            value={score || par}
            onChange={(v) => setScore(player.id, hole, v)}
            min={1}
            max={15}
          />
          {diff !== null && (
            <span
              className="text-xs font-bold min-w-[50px] text-right"
              style={{ color: parColor(diff) }}
            >
              {parLabel(diff)}
            </span>
          )}
        </div>
      </div>

      {holeDelta !== null && (
        <>
          {/* Bet row — tap to expand/collapse per-game breakdown.
              Uses <button> (not a card-level onClick) to avoid conflicting
              with Stepper buttons that don't stopPropagation. */}
          <button
            type="button"
            onClick={() => setIsExpanded(x => !x)}
            className="w-full flex items-center justify-between border-t py-2 min-h-[40px]"
            style={{
              borderColor: 'var(--line)',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            data-testid={`hole-bet-total-${player.id}`}
          >
            <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
              Bet {isExpanded ? '▴' : '▾'}
            </span>
            <span
              className="text-[11px] font-mono font-semibold"
              style={{
                color: holeDelta > 0 ? '#22c55e' : holeDelta < 0 ? 'var(--red-card)' : 'var(--muted)',
              }}
            >
              {formatMoneyDecimal(holeDelta)}
            </span>
          </button>

          {/* Per-game breakdown rows (shown when expanded).
              All active games for this player are shown — $0 entries included
              so the user sees which games are active even when the hole is flat. */}
          {isExpanded && playerGames.map(g => {
            const gameDelta = holeBreakdown?.[g.id]?.[player.id] ?? 0
            return (
              <div
                key={g.id}
                className="flex items-center justify-between pl-3"
                data-testid={`hole-bet-breakdown-${player.id}-${g.id}`}
              >
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{g.label}</span>
                <span
                  className="text-[10px] font-mono"
                  style={{
                    color: gameDelta > 0 ? '#22c55e' : gameDelta < 0 ? 'var(--red-card)' : 'var(--muted)',
                  }}
                >
                  {formatMoneyDecimal(gameDelta)}
                </span>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
