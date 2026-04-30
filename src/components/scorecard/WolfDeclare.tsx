'use client'

import { useRoundStore } from '@/store/roundStore'
import { getWolfCaptain } from '@/bridge/wolf_bridge'
import type { GameInstance } from '@/types'

interface WolfDeclareProps {
  wolfGame: GameInstance
  currentHole: number
}

/**
 * WolfDeclare — per-hole captain display and declaration UI.
 *
 * Renders above the ScoreRow list when a Wolf game is active. The captain
 * (derived from getWolfCaptain rotation) picks Partner / Lone Wolf / Go Blind
 * before scores are entered. Selection persists in HoleData.wolfPick via
 * setWolfPick, which the bridge reads at settlement time.
 *
 * All declaration options are always visible; the active pick is highlighted.
 * "Save & Next Hole" is not blocked by an absent declaration — the bridge
 * treats a missing pick as WolfDecisionMissing (zero delta).
 *
 * No next/* imports (portability requirement).
 */
export default function WolfDeclare({ wolfGame, currentHole }: WolfDeclareProps) {
  const { players, holes, setWolfPick } = useRoundStore()

  const { captain } = getWolfCaptain(currentHole, wolfGame, players)
  const captainPlayer = players.find(p => p.id === captain)
  // Other players who are in the Wolf game (potential partners — captain excluded).
  const bettingOthers = players.filter(
    p => wolfGame.playerIds.includes(p.id) && p.id !== captain,
  )

  const holeData = holes.find(h => h.number === currentHole)
  const currentPick = holeData?.wolfPick

  const summaryLabel = (): string | null => {
    if (!currentPick) return null
    if (currentPick === 'solo') return `${captainPlayer?.name || 'Wolf'} — Lone Wolf`
    if (currentPick === 'blind') return `${captainPlayer?.name || 'Wolf'} — Blind Lone`
    const partner = players.find(p => p.id === currentPick)
    return `${captainPlayer?.name || 'Wolf'} + ${partner?.name || 'Partner'}`
  }

  const selected = summaryLabel()

  const activeStyle = { background: 'var(--green-deep)', color: 'var(--sand)' }
  const inactiveStyle = { background: 'var(--sky)', color: 'var(--green-deep)' }

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{ borderColor: 'var(--line)', background: 'white' }}
      data-testid="wolf-declare-panel"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {'Hole '}{currentHole}{' — Wolf: '}
        <span style={{ color: 'var(--ink)' }}>{captainPlayer?.name || 'Wolf'}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {bettingOthers.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setWolfPick(currentHole, p.id)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={currentPick === p.id ? activeStyle : inactiveStyle}
            data-testid={`wolf-partner-${p.id}`}
          >
            {p.name || 'Partner'}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setWolfPick(currentHole, 'solo')}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={currentPick === 'solo' ? activeStyle : inactiveStyle}
          data-testid="wolf-declare-lone"
        >
          Lone Wolf
        </button>
        <button
          type="button"
          onClick={() => setWolfPick(currentHole, 'blind')}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={currentPick === 'blind' ? activeStyle : inactiveStyle}
          data-testid="wolf-declare-blind"
        >
          Go Blind
        </button>
      </div>

      {selected ? (
        <div className="text-[11px] font-medium" style={{ color: 'var(--ink)' }}>
          {selected}
        </div>
      ) : (
        <div className="text-[11px]" style={{ color: '#d97706' }}>
          No declaration yet
        </div>
      )}
    </div>
  )
}
