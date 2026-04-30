'use client'

import { useState, useMemo } from 'react'
import { useRoundStore } from '@/store/roundStore'
import { computePerHoleDeltas } from '@/lib/perHoleDeltas'
import { formatMoneyDecimal } from '@/lib/scoring'

interface BetDetailsSheetProps {
  open: boolean
  onClose: () => void
  /** When provided, renders an "Exit Round" button in the sheet header. */
  onExit?: () => void
}

/**
 * BetDetailsSheet — shared slide-up bottom sheet for per-round bet detail.
 *
 * Displays per-player gross scores and per-bet monetary deltas for all scored
 * holes. Generic shared primitive: accepts no game-type-specific props. Any bet
 * that populates computePerHoleDeltas (currently Skins and Wolf) surfaces here
 * automatically. Nassau and Match Play will appear when their perHoleDeltas.ts
 * cases land in their respective bridge sub-items — no changes to this component
 * will be required.
 *
 * Sheet state (open/close) is driven by the caller via props. The component is
 * always rendered so CSS transitions animate correctly.
 */
export default function BetDetailsSheet({ open, onClose, onExit }: BetDetailsSheetProps) {
  const { holes, players, games } = useRoundStore()
  // Tracks which player-hole row is expanded (one at a time).
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const { totals, byGame } = useMemo(
    () => computePerHoleDeltas(holes, players, games),
    [holes, players, games],
  )

  // Only show holes with at least one player score entered.
  const scoredHoles = holes.filter(h => players.some(p => (h.scores[p.id] || 0) > 0))

  return (
    <>
      {/* Backdrop — fades in when open; pointer-events-none when closed */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet panel — slides up from bottom */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl flex flex-col max-h-[75vh] transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ background: 'white' }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Round Summary
          </span>
          <div className="flex items-center gap-2">
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--red-card)', color: 'white' }}
                data-testid="exit-round-trigger"
                aria-label="Exit round"
              >
                Exit Round
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-lg leading-none px-2 py-1"
              style={{ color: 'var(--muted)' }}
              aria-label="Close round summary"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {scoredHoles.length === 0 ? (
            <p
              className="text-sm text-center py-8"
              style={{ color: 'var(--muted)' }}
            >
              No holes scored yet.
            </p>
          ) : (
            scoredHoles.map(hd => (
              <div key={hd.number}>
                {/* Hole label */}
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider pt-3 pb-1"
                  style={{ color: 'var(--muted)' }}
                >
                  Hole {hd.number} · Par {hd.par}
                </div>

                {/* Per-player rows */}
                <div className="space-y-1">
                  {players.map(p => {
                    const gross = hd.scores[p.id] || 0
                    // Skip players who have no score on this hole.
                    if (gross === 0) return null

                    const holeTotal = totals[hd.number]?.[p.id] ?? 0
                    const rowKey = `${hd.number}-${p.id}`
                    const isExpanded = expandedKey === rowKey
                    // Only include games this player participates in.
                    const playerGames = games.filter(g => g.playerIds.includes(p.id))

                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border overflow-hidden"
                        style={{ borderColor: 'var(--line)' }}
                      >
                        {/* Row summary — tap to expand/collapse per-game breakdown */}
                        <button
                          type="button"
                          onClick={() => setExpandedKey(isExpanded ? null : rowKey)}
                          className="w-full flex items-center justify-between px-3 min-h-[40px]"
                          style={{ background: 'white' }}
                          data-testid={`sheet-row-${hd.number}-${p.id}`}
                        >
                          <span
                            className="text-[12px] font-medium"
                            style={{ color: 'var(--ink)' }}
                          >
                            {p.name || 'Golfer'}{' '}
                            <span style={{ color: 'var(--muted)' }}>{gross}</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[11px] font-mono font-semibold"
                              style={{
                                color:
                                  holeTotal > 0
                                    ? '#22c55e'
                                    : holeTotal < 0
                                    ? 'var(--red-card)'
                                    : 'var(--muted)',
                              }}
                            >
                              {formatMoneyDecimal(holeTotal)}
                            </span>
                            <span
                              className="text-[10px]"
                              style={{ color: 'var(--muted)' }}
                            >
                              {isExpanded ? '▴' : '▾'}
                            </span>
                          </div>
                        </button>

                        {/* Per-game breakdown — shown when expanded */}
                        {isExpanded &&
                          playerGames.map(g => {
                            const gameDelta = byGame[hd.number]?.[g.id]?.[p.id] ?? 0
                            return (
                              <div
                                key={g.id}
                                className="flex items-center justify-between px-5 py-1"
                                style={{ borderTop: '1px solid var(--line)' }}
                                data-testid={`sheet-breakdown-${hd.number}-${p.id}-${g.id}`}
                              >
                                <span
                                  className="text-[10px]"
                                  style={{ color: 'var(--muted)' }}
                                >
                                  {g.label}
                                </span>
                                <span
                                  className="text-[10px] font-mono"
                                  style={{
                                    color:
                                      gameDelta > 0
                                        ? '#22c55e'
                                        : gameDelta < 0
                                        ? 'var(--red-card)'
                                        : 'var(--muted)',
                                  }}
                                >
                                  {formatMoneyDecimal(gameDelta)}
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
