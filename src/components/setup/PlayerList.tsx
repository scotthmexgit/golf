'use client'

import { useRoundStore } from '@/store/roundStore'
import PlayerCard from './PlayerCard'

export default function PlayerList() {
  const { players, addPlayer } = useRoundStore()

  return (
    <div className="space-y-3">
      {players.map((p, i) => (
        <PlayerCard key={p.id} player={p} index={i} />
      ))}

      {players.length < 5 && (
        <button
          type="button"
          onClick={addPlayer}
          className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--line)', color: 'var(--green-soft)' }}
        >
          + Add Golfer {players.length + 1}
        </button>
      )}
    </div>
  )
}
