import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleAlert } from 'lucide-react'
import { useStore } from '../../store/store'
import { Badge, Button } from '../ui/primitives'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { EmptyState } from '../ui/Tabs'
import { Topbar } from '../layout/Topbar'
import { DashboardKpis } from './KpiCard'
import type { Member, ViewKey } from '../../types'
import { daysUntil, formatCurrency, formatDateShort, relativeDayLabel } from '../../lib/dates'
import { cn } from '../../lib/cn'

interface AlertItem {
  member: Member
  severity: 'overdue' | 'due-today' | 'due-soon'
  label: string
  detail: string
}

export function Dashboard({ onNavigate, onSelectMember }: { onNavigate: (v: ViewKey) => void; onSelectMember: (id: string) => void }) {
  const { members, resetData } = useStore()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar title="Dashboard" subtitle="Resumen operativo del gimnasio" onReset={resetData} />
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
        <DashboardInner onNavigate={onNavigate} onSelectMember={onSelectMember} members={members} />
      </div>
    </div>
  )
}

function DashboardInner({
  onNavigate,
  onSelectMember,
  members,
}: {
  onNavigate: (v: ViewKey) => void
  onSelectMember: (id: string) => void
  members: Member[]
}) {
  const [scope, setScope] = useState<'all' | 'overdue'>('all')

  const active = members.filter((m) => m.status !== 'inactive')
  const debtors = members.filter((m) => m.paymentStatus === 'overdue')
  const expectedIncome = active.reduce((s, m) => s + m.finalPrice, 0)
  const dueSoon = members.filter((m) => {
    const d = daysUntil(m.nextDueDate)
    return d >= 0 && d <= 7 && m.status !== 'inactive'
  })

  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = []
    for (const m of members) {
      if (m.status === 'inactive') continue
      const d = daysUntil(m.nextDueDate)
      if (m.paymentStatus === 'overdue') {
        list.push({
          member: m,
          severity: 'overdue',
          label: 'Deuda pendiente',
          detail: `${formatCurrency(m.debtAmount)} · vencido hace ${Math.abs(d)} días`,
        })
      } else if (d === 0) {
        list.push({ member: m, severity: 'due-today', label: 'Vence hoy', detail: formatCurrency(m.finalPrice) })
      } else if (d <= 3) {
        list.push({
          member: m,
          severity: 'due-soon',
          label: `Vence ${relativeDayLabel(m.nextDueDate).toLowerCase()}`,
          detail: `${formatCurrency(m.finalPrice)} · ${formatDateShort(m.nextDueDate)}`,
        })
      }
    }
    list.sort((a, b) => {
      const rank = { overdue: 0, 'due-today': 1, 'due-soon': 2 } as const
      return rank[a.severity] - rank[b.severity]
    })
    return list
  }, [members])

  const visible = scope === 'all' ? alerts : alerts.filter((a) => a.severity === 'overdue')

  const severityStyle = {
    overdue: { badge: 'debt' as const, icon: <AlertTriangle size={15} />, dot: 'bg-debt' },
    'due-today': { badge: 'debt' as const, icon: <CalendarClock size={15} />, dot: 'bg-warn' },
    'due-soon': { badge: 'warn' as const, icon: <CircleAlert size={15} />, dot: 'bg-warn' },
  }

  return (
    <div className="space-y-6">
      <DashboardKpis
        activeCount={active.length}
        expectedIncome={expectedIncome}
        debtorsCount={debtors.length}
        dueSoonCount={dueSoon.length}
        onNavigate={onNavigate}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Alertas de cobro"
            subtitle="Socios con pagos vencidos o próximos a vencer"
            action={
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScope('all')}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', scope === 'all' ? 'bg-accent text-accent-ink' : 'text-silver hover:text-fog')}
                >
                  Todos
                </button>
                <button
                  onClick={() => setScope('overdue')}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors', scope === 'overdue' ? 'bg-accent text-accent-ink' : 'text-silver hover:text-fog')}
                >
                  Solo deudas
                </button>
              </div>
            }
          />
          <CardBody className="px-0 py-0">
            {visible.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={28} />}
                title="Sin alertas pendientes"
                description="Todos los pagos de tus socios están al día."
              />
            ) : (
              <ul className="divide-y divide-ink-500/50">
                {visible.map((a) => {
                  const s = severityStyle[a.severity]
                  return (
                    <li key={a.member.id}>
                      <button
                        onClick={() => onSelectMember(a.member.id)}
                        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-ink-700/50"
                      >
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', s.dot)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-fog">{a.member.fullName}</p>
                          <p className="text-xs text-ash">{a.detail}</p>
                        </div>
                        <Badge tone={s.badge} icon={s.icon}>
                          {a.label}
                        </Badge>
                        <ArrowRight size={15} className="text-ash" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Próximos vencimientos" subtitle="Membresías de la próxima semana" />
          <CardBody className="space-y-3">
            {dueSoon.length === 0 ? (
              <p className="py-6 text-center text-xs text-ash">Ningún vencimiento en los próximos 7 días.</p>
            ) : (
              dueSoon
                .slice()
                .sort((a, b) => daysUntil(a.nextDueDate) - daysUntil(b.nextDueDate))
                .map((m) => {
                  const d = daysUntil(m.nextDueDate)
                  const isToday = d === 0
                  return (
                    <button
                      key={m.id}
                      onClick={() => onSelectMember(m.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-ink-500/60 bg-ink-700/40 px-3.5 py-2.5 transition-colors hover:bg-ink-700"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fog">{m.fullName}</p>
                        <p className="text-xs text-ash">{formatCurrency(m.finalPrice)}/mes</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          isToday ? 'bg-debt-muted text-debt' : 'bg-warn-muted text-warn',
                        )}
                      >
                        {isToday ? 'Hoy' : formatDateShort(m.nextDueDate)}
                      </span>
                    </button>
                  )
                })
            )}
            <div className="pt-1">
              <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('members')}>
                Ver todos los miembros
                <ArrowRight size={14} />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
