'use client'

import { GAME_DEFS, type GameType } from '@/types'
import { useRoundStore } from '@/store/roundStore'
import GameInstanceCard from './GameInstanceCard'
import Pill from '@/components/ui/Pill'

export default function GameList() {
  const { games, addGame, players } = useRoundStore()
  const bettingCount = players.filter(p => p.betting).length

  return (
    <div className="space-y-4">
      {games.length > 0 && (
        <div className="space-y-2">
          {games.map(g => (
            <GameInstanceCard key={g.id} game={g} />
          ))}
        </div>
      )}

      {games.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          No games added yet. Tap a button below to add one.
        </p>
      )}

      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'white' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: 'var(--green-soft)' }}>
          + Add a game
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GAME_DEFS.map(def => {
            const blocked = (def.minPlayers != null && bettingCount < def.minPlayers) ||
              (def.maxPlayers != null && bettingCount > def.maxPlayers)
            return (
              <Pill
                key={def.key}
                label={def.label}
                active={false}
                onClick={() => addGame(def.key as GameType)}
                disabled={blocked}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
