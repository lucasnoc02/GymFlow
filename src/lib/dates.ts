export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso)
  d.setMonth(d.getMonth() + months)
  return toISO(d)
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(iso: string): number {
  const target = parseISO(iso).getTime()
  const now = parseISO(todayISO()).getTime()
  return Math.round((target - now) / 86400000)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return parseISO(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return parseISO(iso).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n)
}

export function relativeDayLabel(iso: string): string {
  const diff = daysUntil(iso)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1) return `En ${diff} días`
  if (diff < -1) return `Hace ${Math.abs(diff)} días`
  return ''
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
