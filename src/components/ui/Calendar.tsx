import { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from './icons'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Calendar({
  value,
  onChange,
  markedDates,
}: {
  value: string
  onChange: (date: string) => void
  markedDates: Set<string>
}) {
  const selected = parseISO(value)
  const [cursor, setCursor] = useState(startOfMonth(selected))

  const gridStart = startOfWeek(startOfMonth(cursor))
  const gridEnd = endOfWeek(endOfMonth(cursor))
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-headline label">{format(cursor, 'MMMM yyyy')}</span>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous month"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="flex items-center justify-center rounded-full active:opacity-60"
            style={{ width: 32, height: 32, color: 'var(--label-secondary)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="flex items-center justify-center rounded-full active:opacity-60"
            style={{ width: 32, height: 32, color: 'var(--label-secondary)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((w, i) => (
          <div key={i} className="text-caption1 label-tertiary text-center normal-case" style={{ fontWeight: 500 }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const iso = format(day, 'yyyy-MM-dd')
          const inMonth = isSameMonth(day, cursor)
          const isSelected = isSameDay(day, selected)
          const marked = markedDates.has(iso)
          const today = isToday(day)
          return (
            <button
              key={iso}
              onClick={() => onChange(iso)}
              className="flex flex-col items-center justify-center gap-0.5 active:opacity-60"
              style={{ height: 40 }}
            >
              <span
                className="flex items-center justify-center rounded-full text-subhead tabular-nums"
                style={{
                  width: 32,
                  height: 32,
                  background: isSelected ? 'var(--accent)' : 'transparent',
                  color: isSelected ? 'var(--accent-on)' : today ? 'var(--accent)' : inMonth ? 'var(--label)' : 'var(--label-tertiary)',
                  fontWeight: isSelected || today ? 600 : 400,
                }}
              >
                {format(day, 'd')}
              </span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 99,
                  background: marked && !isSelected ? 'var(--accent)' : 'transparent',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
