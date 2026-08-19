import { toISO } from './dates'

export interface DayCell {
  iso: string
  day: number
  inMonth: boolean
  isToday: boolean
  date: Date
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export function buildMonthGrid(monthDate: Date, todayISOStr: string): DayCell[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // semana empieza en lunes
  const start = new Date(year, month, 1 - offset)

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = toISO(date)
    cells.push({
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: iso === todayISOStr,
      date,
    })
  }
  return cells
}

export function shiftMonth(monthDate: Date, delta: number): Date {
  return new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1)
}

export function monthLabel(monthDate: Date): string {
  return `${MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`
}
