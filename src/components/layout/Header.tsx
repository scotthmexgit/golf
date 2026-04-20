'use client'

import Link from 'next/link'

interface HeaderProps {
  title?: string
  backHref?: string
  rightAction?: React.ReactNode
}

export default function Header({ title, backHref, rightAction }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
      style={{ background: 'var(--green-deep)' }}
    >
      <div className="flex items-center gap-3">
        {backHref && (
          <Link href={backHref} className="text-[var(--sand)] text-sm">
            ← Back
          </Link>
        )}
        <h1 className="font-display text-lg font-bold" style={{ color: 'var(--sand)' }}>
          {title || 'The Loop'}
        </h1>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </header>
  )
}
