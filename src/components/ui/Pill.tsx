'use client'

interface PillProps {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export default function Pill({ label, active, onClick, disabled, size = 'md' }: PillProps) {
  const px = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1'
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${px} rounded-full ${text} font-semibold transition-colors capitalize`}
      style={{
        background: active ? 'var(--green-deep)' : 'white',
        color: active ? 'var(--sand)' : 'var(--ink-soft)',
        border: `1px solid ${active ? 'var(--green-deep)' : 'var(--line)'}`,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  )
}
