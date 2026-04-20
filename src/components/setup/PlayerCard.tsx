'use client'

import type { PlayerSetup, TeeName } from '@/types'
import { useRoundStore } from '@/store/roundStore'
import Pill from '@/components/ui/Pill'

const TEE_OPTIONS: TeeName[] = ['black', 'blue', 'white', 'gold', 'red']

interface PlayerCardProps {
  player: PlayerSetup
  index: number
}

export default function PlayerCard({ player, index }: PlayerCardProps) {
  const { updatePlayer, removePlayer } = useRoundStore()

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{ borderColor: 'var(--line)', background: 'white' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Golfer {index + 1}
        </span>
        <span
          className="font-mono text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--sky)', color: 'var(--green-deep)' }}
        >
          Crs {player.courseHcp}
        </span>
      </div>

      <input
        type="text"
        value={player.name}
        onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
        placeholder={`Golfer ${index + 1}`}
        className="w-full px-2 py-1.5 rounded-lg text-sm border"
        style={{ borderColor: 'var(--line)' }}
      />

      <div className="flex items-center gap-3">
        <div className="w-20">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Hcp</label>
          <input
            type="number"
            value={player.hcpIndex || 0}
            onChange={(e) => updatePlayer(player.id, { hcpIndex: parseFloat(e.target.value) || 0 })}
            className="w-full px-2 py-1 rounded-lg text-sm border font-mono"
            style={{ borderColor: 'var(--line)' }}
            step="1"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Tee</label>
          <div className="flex gap-1 mt-0.5">
            {TEE_OPTIONS.map(t => (
              <Pill
                key={t}
                label={t}
                active={player.tee === t}
                onClick={() => updatePlayer(player.id, { tee: t })}
                size="sm"
              />
            ))}
          </div>
        </div>
      </div>

      {!player.isSelf && (
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Betting</span>
            <select
              value={player.betting ? 'yes' : 'no'}
              onChange={(e) => updatePlayer(player.id, { betting: e.target.value === 'yes' })}
              className="px-2 py-0.5 rounded text-xs border"
              style={{ borderColor: 'var(--line)' }}
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => removePlayer(player.id)}
            className="text-xs px-2 py-0.5 rounded"
            style={{ color: 'var(--red-card)' }}
          >
            × remove
          </button>
        </div>
      )}
    </div>
  )
}
