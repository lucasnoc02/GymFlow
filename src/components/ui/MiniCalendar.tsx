import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { buildMonthGrid, monthLabel, shiftMonth, WEEKDAYS } from '../../lib/calendar'
import { useToday } from '../../lib/dateContext'
import { cn } from '../../lib/cn'

/**
 * Mini-calendario mensual reutilizable. Resalta en verde los días que
 * coinciden con `highlightedDates`.
 */
export function MiniCalendar({
  highlightedDates,
  highlightColor = 'bg-ok',
  allowNav = true,
}: {
  highlightedDates: string[]
  highlightColor?: string
  allowNav?: boolean
}) {
  const { todayISO } = useToday()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const cells = useMemo(() => buildMonthGrid(month, todayISO), [month, todayISO])
  const set = useMemo(() => new Set(highlightedDates), [highlightedDates])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold capitalize text-fog">{monthLabel(month)}</p>
        {allowNav && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="rounded p-1 text-ash transition-colors hover:bg-ink-600 hover:text-fog"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
              className="rounded px-1.5 text-[10px] font-medium text-ash transition-colors hover:bg-ink-600 hover:text-fog"
            >
              Hoy
            </button>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              className="rounded p-1 text-ash transition-colors hover:bg-ink-600 hover:text-fog"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[9px] font-semibold uppercase text-ash">
            {w[0]}
          </div>
        ))}
        {cells.map((cell) => {
          const hit = set.has(cell.iso)
          const disabled = !cell.inMonth
          return (
            <div
              key={cell.iso}
              className={cn(
                'flex aspect-square items-center justify-center rounded-md text-[11px]',
                disabled && 'opacity-25',
                cell.isToday && !hit && 'border border-ink-500 bg-ink-700 font-semibold text-snow',
              )}
            >
              {hit ? (
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-ok-ink shadow',
                    highlightColor,
                  )}
                  title={cell.iso}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              ) : (
                <span className="text-silver">{cell.day}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}