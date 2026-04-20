'use client'

import { useState } from 'react'
import { COURSES, type CourseData, type HolesCount } from '@/types'
import { useRoundStore } from '@/store/roundStore'
import Pill from '@/components/ui/Pill'

export default function CourseSearch() {
  const [query, setQuery] = useState('')
  const { course, setCourse, holesCount, setHolesCount, playDate, setPlayDate } = useRoundStore()
  const filtered = query.length > 0
    ? COURSES.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.location.toLowerCase().includes(query.toLowerCase()))
    : COURSES

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Search Courses
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to filter..."
          className="mt-1 w-full px-3 py-2 rounded-lg text-sm border"
          style={{ borderColor: 'var(--line)', background: 'white' }}
        />
      </div>

      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {filtered.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => { setCourse(c); setQuery('') }}
            className="w-full text-left px-3 py-2.5 rounded-xl border transition-colors"
            style={{
              borderColor: course?.name === c.name ? 'var(--green-deep)' : 'var(--line)',
              background: course?.name === c.name ? 'var(--sky)' : 'white',
            }}
          >
            <div className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{c.name}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{c.location}</div>
          </button>
        ))}
      </div>

      {course && (
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Holes</label>
            <div className="flex gap-2 mt-1">
              {([['18', '18'], ['9front', 'Front 9'], ['9back', 'Back 9']] as [HolesCount, string][]).map(([val, label]) => (
                <Pill key={val} label={label} active={holesCount === val} onClick={() => setHolesCount(val)} />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Date</label>
            <input
              type="date"
              value={playDate}
              onChange={(e) => setPlayDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--line)', background: 'white' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
