'use client'

import { useState } from 'react'
import type { GameInstance, JunkConfig } from '@/types'
import { useRoundStore } from '@/store/roundStore'
import Pill from '@/components/ui/Pill'
import { stakeUnitLabel } from '@/lib/scoring'
import { skinsTooFewPlayers, wolfInvalidPlayerCount } from '@/lib/gameGuards'

interface GameInstanceCardProps {
  game: GameInstance
}

export default function GameInstanceCard({ game }: GameInstanceCardProps) {
  const { updateGame, updateGameStake, updateJunk, removeGame, players } = useRoundStore()
  const [junkOpen, setJunkOpen] = useState(false)
  const j = game.junk

  // Live player-count guard for Skins. Reacts whenever game.playerIds changes
  // (e.g., when the user toggles player chips or adds/removes players on the
  // Players step). The engine's assertValidSkinsCfg is the backstop; this is
  // the user-facing feedback surface.
  const playerCountError = skinsTooFewPlayers(game)
  const wolfPlayerError = wolfInvalidPlayerCount(game)

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: (playerCountError || wolfPlayerError) ? 'var(--red-card)' : 'var(--green-soft)',
        background: 'white',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{game.label}</span>
        <button
          type="button"
          onClick={() => removeGame(game.id)}
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ color: 'var(--red-card)' }}
        >
          ×
        </button>
      </div>

      <div className="px-3 pb-3 space-y-2 pt-2">
        {/* Stake */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>Stake $</label>
          <input
            type="number"
            value={game.stake / 100}
            onChange={(e) => updateGameStake(game.id, Math.round(parseFloat(e.target.value) * 100) || 0)}
            className="w-16 px-2 py-1 rounded text-sm border font-mono"
            style={{ borderColor: 'var(--line)' }}
            min="0" step="1"
          />
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{stakeUnitLabel(game.type)}</span>
        </div>

        {/* Game-specific config */}
        {(game.type === 'matchPlay' || game.type === 'nassau') && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>Press $</label>
            <input
              type="number"
              value={game.pressAmount ?? game.stake}
              onChange={(e) => updateGame(game.id, { pressAmount: parseFloat(e.target.value) || 0 })}
              className="w-16 px-2 py-1 rounded text-sm border font-mono"
              style={{ borderColor: 'var(--line)' }}
              min="0" step="1"
            />
          </div>
        )}

        {game.type === 'matchPlay' && game.playerIds.length >= 3 && (
          <div>
            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Format</label>
            <div className="flex gap-1.5 mt-1">
              <Pill label="Individual" active={game.matchFormat !== 'best-ball'} onClick={() => updateGame(game.id, { matchFormat: 'singles' })} />
              {game.playerIds.length === 4 && (
                <Pill label="Teams 2v2" active={game.matchFormat === 'best-ball'} onClick={() => updateGame(game.id, { matchFormat: 'best-ball' })} />
              )}
            </div>
          </div>
        )}

        {game.type === 'skins' && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={game.escalating ?? false} onChange={(e) => updateGame(game.id, { escalating: e.target.checked })} className="w-3.5 h-3.5" />
            <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Escalating skins</span>
          </label>
        )}

        {game.type === 'wolf' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>Solo wolf pays</label>
              <div className="flex gap-1">
                {[2, 3].map(m => (
                  <Pill key={m} label={`${m}×`} active={(game.loneWolfMultiplier ?? 2) === m} onClick={() => updateGame(game.id, { loneWolfMultiplier: m })} />
                ))}
              </div>
            </div>
            <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Wolf rotates in player order. Golfer 1 starts.</div>
          </>
        )}

        {game.type === 'vegas' && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>Max exposure/hole $</label>
            <input type="number" value={game.maxExposure ?? 50} onChange={(e) => updateGame(game.id, { maxExposure: parseFloat(e.target.value) || 50 })} className="w-16 px-2 py-1 rounded text-sm border font-mono" style={{ borderColor: 'var(--line)' }} min="0" />
          </div>
        )}

        {/* Players */}
        <div>
          <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Players</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {players.filter(p => p.betting).map(p => {
              const inGame = game.playerIds.includes(p.id)
              return (
                <Pill key={p.id} label={p.name || 'Golfer'} active={inGame} onClick={() => {
                  const ids = inGame ? game.playerIds.filter(id => id !== p.id) : [...game.playerIds, p.id]
                  updateGame(game.id, { playerIds: ids })
                }} />
              )
            })}
          </div>
        </div>

        {/* Player-count error — Skins live guard */}
        {playerCountError && (
          <p
            className="text-[11px] font-semibold"
            style={{ color: 'var(--red-card)' }}
            data-testid={`skins-player-count-error-${game.id}`}
          >
            Skins requires at least 3 players
          </p>
        )}

        {/* Player-count error — Wolf live guard */}
        {wolfPlayerError && (
          <p
            className="text-[11px] font-semibold"
            style={{ color: 'var(--red-card)' }}
            data-testid={`wolf-player-count-error-${game.id}`}
          >
            Wolf requires 4–5 players
          </p>
        )}

        {/* Junk / Side Bets — collapsible */}
        {game.type !== 'strokePlay' && (
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={() => setJunkOpen(!junkOpen)}
              className="text-[11px] font-semibold"
              style={{ color: 'var(--green-soft)' }}
            >
              {junkOpen ? '− Junk / Side Bets' : '+ Junk / Side Bets'}
            </button>

            {junkOpen && (
              <div className="mt-2 space-y-1.5">
                <JunkRow label="Garbage" sub="Greenie + Sandy + Birdie" checked={j.garbage} amount={j.garbageAmount} unitLabel="/point"
                  onToggle={(v) => updateJunk(game.id, { garbage: v })}
                  onAmount={(v) => updateJunk(game.id, { garbageAmount: v })}
                />
                {!j.garbage && (
                  <>
                    <JunkRow label="Greenie" sub="par 3s only" checked={j.greenie} amount={j.greenieAmount} unitLabel="/greenie"
                      onToggle={(v) => updateJunk(game.id, { greenie: v })} onAmount={(v) => updateJunk(game.id, { greenieAmount: v })} />
                    <JunkRow label="Sandy" checked={j.sandy} amount={j.sandyAmount} unitLabel="/sandy"
                      onToggle={(v) => updateJunk(game.id, { sandy: v })} onAmount={(v) => updateJunk(game.id, { sandyAmount: v })} />
                    <JunkRow label="Birdie" checked={j.birdie} amount={j.birdieAmount} unitLabel="/birdie"
                      onToggle={(v) => updateJunk(game.id, { birdie: v })} onAmount={(v) => updateJunk(game.id, { birdieAmount: v })} />
                  </>
                )}
                <JunkRow label="Eagle" checked={j.eagle} amount={j.eagleAmount} unitLabel="/eagle"
                  onToggle={(v) => updateJunk(game.id, { eagle: v })} onAmount={(v) => updateJunk(game.id, { eagleAmount: v })} />
                <JunkToggle label="Hammer" sub="doubles this game's stakes" checked={j.hammer}
                  onToggle={(v) => updateJunk(game.id, { hammer: v })} />
                <JunkRow label="Snake" sub="last 3-putt owes everyone" checked={j.snake} amount={j.snakeAmount} unitLabel=""
                  onToggle={(v) => updateJunk(game.id, { snake: v })} onAmount={(v) => updateJunk(game.id, { snakeAmount: v })} />
                <JunkRow label="Low Ball" sub="lowest gross for the round" checked={j.lowball} amount={j.lowballAmount} unitLabel=" pot"
                  onToggle={(v) => updateJunk(game.id, { lowball: v })} onAmount={(v) => updateJunk(game.id, { lowballAmount: v })} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function JunkRow({ label, sub, checked, amount, unitLabel, onToggle, onAmount }: {
  label: string; sub?: string; checked: boolean; amount: number; unitLabel: string
  onToggle: (v: boolean) => void; onAmount: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 flex-1">
        <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="w-3 h-3" />
        <span className="text-[11px]" style={{ color: checked ? 'var(--ink)' : 'var(--muted)' }}>
          {label}
          {sub && <span className="text-[9px] ml-1" style={{ color: 'var(--muted)' }}>({sub})</span>}
        </span>
      </label>
      {checked && (
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>$</span>
          <input type="number" value={amount} onChange={(e) => onAmount(parseFloat(e.target.value) || 0)}
            className="w-12 px-1.5 py-0.5 rounded text-[11px] border font-mono" style={{ borderColor: 'var(--line)' }} min="0" step="1" />
          <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{unitLabel}</span>
        </div>
      )}
    </div>
  )
}

function JunkToggle({ label, sub, checked, onToggle }: {
  label: string; sub?: string; checked: boolean; onToggle: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onToggle(e.target.checked)} className="w-3 h-3" />
      <span className="text-[11px]" style={{ color: checked ? 'var(--ink)' : 'var(--muted)' }}>
        {label}
        {sub && <span className="text-[9px] ml-1" style={{ color: 'var(--muted)' }}>({sub})</span>}
      </span>
    </label>
  )
}
