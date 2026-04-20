'use client'

import { useState } from 'react'

interface DotButtonProps {
  type: 'sandy' | 'chipIn' | 'threePutt' | 'onePutt'
  active: boolean
  onClick: () => void
  rejected?: boolean
}

const DOT_CONFIG = {
  sandy: { icon: '⛱', label: 'Sandy', activeColor: '#f59e0b' },
  chipIn: { icon: '⛳', label: 'Chip In', activeColor: '#22c55e' },
  threePutt: { icon: '⊘', label: '3-Putt', activeColor: 'var(--red-card)' },
  onePutt: { icon: '◉', label: '1-Putt', activeColor: '#3b82f6' },
}

export default function DotButton({ type, active, onClick, rejected }: DotButtonProps) {
  const [flash, setFlash] = useState(false)
  const cfg = DOT_CONFIG[type]

  const handleClick = () => {
    if (rejected) {
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
      return
    }
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-[22px] h-[22px] rounded-[6px] flex items-center justify-center text-[11px] transition-all"
      style={{
        background: active ? cfg.activeColor : '#e5e5e0',
        color: active ? 'white' : 'var(--muted)',
        outline: flash ? '2px solid var(--red-card)' : 'none',
      }}
      title={cfg.label}
    >
      {cfg.icon}
    </button>
  )
}
