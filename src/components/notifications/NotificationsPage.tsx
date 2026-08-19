import { useMemo } from 'react'
import { Bell, BellRing, Check, CircleAlert, CreditCard, Trash2 } from 'lucide-react'
import { useStore } from '../../store/store'
import { useToday } from '../../lib/dateContext'
import { computeNotifications } from '../../lib/notifications'
import { Badge, Button } from '../ui/primitives'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Topbar } from '../layout/Topbar'
import { cn } from '../../lib/cn'
import { formatCurrency, formatDateShort } from '../../lib/dates'

export function NotificationsPage({ onGoToMembers }: { onGoToMembers: () => void }) {
  const { members, tasks, updateTask, deleteTask, resetData } = useStore()
  const { todayISO } = useToday()

  const items = useMemo(() => computeNotifications(members, tasks, todayISO), [members, tasks, todayISO])
  const taskItems = items.filter((i) => i.kind === 'task')
  const systemItems = items.filter((i) => i.kind !== 'task')
  const urgentCount = items.filter((i) => i.urgent).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar
        title="Notificaciones"
        subtitle="Alertas de recordatorios y de cobros del sistema"
        onReset={resetData}
        actions={
          urgentCount > 0 ? (
            <Badge tone="debt" icon={<BellRing size={12} />}>
              {urgentCount} sin atender
            </Badge>
          ) : (
            <Badge tone="ok" icon={<Bell size={12} />}>
              Todo al día
            </Badge>
          )
        }
      />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6 scrollbar-thin">
        <Card>
          <CardHeader
            title="Recordatorios del calendario"
            subtitle="Solo se muestran los que tienen la notificación activada"
            action={<Badge tone="neutral">{taskItems.length}</Badge>}
          />
          <CardBody className="px-0 py-0">
            {taskItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell size={26} className="text-ash" />
                <p className="text-sm font-semibold text-fog">Sin recordatorios activos</p>
                <p className="text-xs text-ash">
                  Los recordatorios con notificación desactivada no aparecen acá.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-500/50">
                {taskItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        item.urgent ? 'bg-warn-muted text-warn' : 'bg-ink-700 text-silver',
                      )}
                    >
                      <BellRing size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fog">{item.title}</p>
                      <p className="text-xs text-ash">
                        {item.detail} · {formatDateShort(item.date)}
                      </p>
                    </div>
                    {item.taskId && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTask(item.taskId!, { completed: true })}
                        >
                          <Check size={13} className="text-ok" />
                          Hecho
                        </Button>
                        <button
                          onClick={() => deleteTask(item.taskId!)}
                          className="rounded-lg p-1.5 text-silver transition-colors hover:bg-debt-muted hover:text-debt"
                          title="Eliminar recordatorio"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alertas del sistema"
            subtitle="Cobros vencidos, vencimientos de hoy y próximos 3 días"
            action={<Badge tone="neutral">{systemItems.length}</Badge>}
          />
          <CardBody className="px-0 py-0">
            {systemItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CreditCard size={26} className="text-ash" />
                <p className="text-sm font-semibold text-fog">Sin alertas de cobro</p>
                <p className="text-xs text-ash">Todos los pagos están al día.</p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-500/50">
                {systemItems.map((item) => {
                  const m = members.find((x) => x.id === item.memberId)
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          item.kind === 'debt' ? 'bg-debt-muted text-debt' : 'bg-warn-muted text-warn',
                        )}
                      >
                        {item.kind === 'debt' ? <CircleAlert size={15} /> : <CreditCard size={15} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fog">{item.title}</p>
                        <p className="text-xs text-ash">
                          {item.detail}
                          {m?.debtAmount ? ` · ${formatCurrency(m.debtAmount)}` : ''}
                        </p>
                      </div>
                      {item.memberId && (
                        <Button size="sm" variant="outline" onClick={onGoToMembers}>
                          Ver socio
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}