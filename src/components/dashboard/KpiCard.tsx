import { AlertTriangle, CalendarClock, CircleDollarSign, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface KpiCardProps {
  label: string
  value: string
  hint: string
  icon: ReactNode
  tone?: 'neutral' | 'ok' | 'debt' | 'warn'
  onClick?: () => void
}

const iconTones = {
  neutral: 'bg-ink-700 text-fog',
  ok: 'bg-ok-muted text-ok',
  debt: 'bg-debt-muted text-debt',
  warn: 'bg-warn-muted text-warn',
}

export function KpiCard({ label, value, hint, icon, tone = 'neutral', onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group rounded-xl border border-ink-500/70 bg-ink-800 p-5 text-left transition-all',
        onClick && 'hover:border-ink-500 hover:bg-ink-700',
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ash">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-snow">{value}</p>
          <p className="mt-1 text-xs text-silver">{hint}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', iconTones[tone])}>{icon}</div>
      </div>
    </button>
  )
}

export function DashboardKpis({
  activeCount,
  expectedIncome,
  debtorsCount,
  dueSoonCount,
  onNavigate,
}: {
  activeCount: number
  expectedIncome: number
  debtorsCount: number
  dueSoonCount: number
  onNavigate: (v: 'members' | 'import') => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Socios activos"
        value={String(activeCount)}
        hint="Miembros con membresía vigente"
        icon={<Users size={19} />}
        tone="ok"
        onClick={() => onNavigate('members')}
      />
      <KpiCard
        label="Ingresos estimados del mes"
        value={new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(expectedIncome)}
        hint="Suma de cuotas de socios activos"
        icon={<CircleDollarSign size={19} />}
        tone="neutral"
        onClick={() => onNavigate('members')}
      />
      <KpiCard
        label="Socios con deuda"
        value={String(debtorsCount)}
        hint="Pagos vencidos pendientes"
        icon={<AlertTriangle size={19} />}
        tone="debt"
        onClick={() => onNavigate('members')}
      />
      <KpiCard
        label="Vencen en 7 días"
        value={String(dueSoonCount)}
        hint="Membresías por renovar"
        icon={<CalendarClock size={19} />}
        tone="warn"
        onClick={() => onNavigate('members')}
      />
    </div>
  )
}
