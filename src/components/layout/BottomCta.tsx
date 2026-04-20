'use client'

interface BottomCtaProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export default function BottomCta({ label, onClick, disabled, variant = 'primary' }: BottomCtaProps) {
  const isPrimary = variant === 'primary'
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 flex justify-center"
      style={{ background: 'white', borderTop: '1px solid var(--line)' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full max-w-[480px] py-3 rounded-full text-sm font-semibold transition-opacity"
        style={{
          background: isPrimary ? 'var(--green-deep)' : 'white',
          color: isPrimary ? 'var(--sand)' : 'var(--green-deep)',
          border: isPrimary ? 'none' : '2px solid var(--green-deep)',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {label}
      </button>
    </div>
  )
}
