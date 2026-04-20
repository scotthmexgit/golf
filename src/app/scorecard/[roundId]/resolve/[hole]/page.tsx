'use client'

import { useRouter, useParams } from 'next/navigation'
import { useRoundStore } from '@/store/roundStore'
import Header from '@/components/layout/Header'
import BottomCta from '@/components/layout/BottomCta'
import Pill from '@/components/ui/Pill'
import { vsPar } from '@/lib/scoring'
import { hasGreenieJunk } from '@/lib/junk'

export default function ResolvePage() {
  const router = useRouter()
  const params = useParams()
  const holeNum = parseInt(params.hole as string)
  const store = useRoundStore()
  const { players, holes, games, roundId, setGreenieWinner, setBangoWinner } = store

  const holeData = holes.find(h => h.number === holeNum)
  const holeRange = store.holeRange()
  const currentIdx = holeRange.indexOf(holeNum)
  const isLastHole = currentIdx === holeRange.length - 1

  if (!holeData) return <div className="p-4">Hole not found</div>

  // Games with greenie junk enabled
  const greenieGames = games.filter(g => hasGreenieJunk(g.junk))
  const bbbGames = games.filter(g => g.type === 'bingoBangoBongo')

  const handleSave = () => {
    if (isLastHole) {
      router.push(`/results/${roundId}`)
    } else {
      store.setCurrentHole(holeRange[currentIdx + 1])
      router.push(`/scorecard/${roundId}`)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <Header
        title={`Hole ${holeNum} · Resolution`}
        rightAction={
          <button type="button" onClick={handleSave} className="text-[11px] font-semibold" style={{ color: 'var(--sand)' }}>
            Skip all →
          </button>
        }
      />

      <div className="flex-1 max-w-[480px] mx-auto w-full px-4 py-4 space-y-4">
        {/* One greenie card per game instance */}
        {holeData.par === 3 && greenieGames.map(game => {
          const gamePlayers = players.filter(p => game.playerIds.includes(p.id))
          const eligible = gamePlayers.filter(p => {
            const score = holeData.scores[p.id] || 0
            return score > 0 && vsPar(score, holeData.par) <= 0
          })
          const ineligible = gamePlayers.filter(p => {
            const score = holeData.scores[p.id] || 0
            return score > 0 && vsPar(score, holeData.par) > 0
          })
          const amount = game.junk.garbage ? game.junk.garbageAmount : game.junk.greenieAmount

          return (
            <div key={game.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'white' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--green-deep)' }}>
                  Greenie · {game.label}
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>${amount}</span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--muted)' }}>Who was closest to the pin?</p>
              <div className="flex flex-wrap gap-1.5">
                {eligible.map(p => (
                  <Pill key={p.id} label={p.name || 'Golfer'}
                    active={holeData.greenieWinners?.[game.id] === p.id}
                    onClick={() => setGreenieWinner(holeNum, game.id, p.id)}
                  />
                ))}
                <Pill label="Nobody"
                  active={holeData.greenieWinners?.[game.id] === null}
                  onClick={() => setGreenieWinner(holeNum, game.id, null)}
                />
              </div>
              {ineligible.length > 0 && (
                <div className="mt-2 text-[10px]" style={{ color: 'var(--muted)' }}>
                  {ineligible.map(p => p.name || 'Golfer').join(', ')} — bogey or worse
                </div>
              )}
            </div>
          )
        })}

        {/* BBB bango card per instance */}
        {bbbGames.map(game => {
          const gamePlayers = players.filter(p => game.playerIds.includes(p.id))
          return (
            <div key={game.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: 'white' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--green-deep)' }}>Bango · {game.label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>${game.stake}/pt</span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--muted)' }}>Who was closest when all players were on the green?</p>
              <div className="flex flex-wrap gap-1.5">
                {gamePlayers.map(p => (
                  <Pill key={p.id} label={p.name || 'Golfer'}
                    active={holeData.bangoWinner === p.id}
                    onClick={() => setBangoWinner(holeNum, p.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <BottomCta label="Save & Next Hole →" onClick={handleSave} />
    </div>
  )
}
