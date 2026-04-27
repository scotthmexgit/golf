'use client'

import type { PlayerSetup, HoleDots as HoleDotsType } from '@/types'
import { strokesOnHole } from '@/lib/handicap'
import { vsPar, parLabel, parColor } from '@/lib/scoring'
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
}

export default function ScoreRow({ player, hole, par, holeIndex, score, dots, activeGames, showJunkDots }: ScoreRowProps) {
  const { setScore, setDot, games } = useRoundStore()
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

  const handleSandyToggle = () => {
    if (!dots.sandy && score > 0 && score > par) {
      // Reject: score must be par or better for sandy
      return
    }
    setDot(player.id, hole, 'sandy', !dots.sandy)
  }

  const sandyRejected = !dots.sandy && score > 0 && score > par

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
    </div>
  )
}
