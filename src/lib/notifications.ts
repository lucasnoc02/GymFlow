import type { CalendarTask, Member } from '../types'
import { daysUntil } from './dates'

export type NotificationKind = 'task' | 'debt' | 'due'

export interface NotificationItem {
  id: string
  kind: NotificationKind
  title: string
  detail: string
  date: string
  urgent: boolean
  taskId?: string
  memberId?: string
}

/** Única fuente de verdad para las notificaciones del sistema. */
export function computeNotifications(members: Member[], tasks: CalendarTask[], _todayISO: string): NotificationItem[] {
  const items: NotificationItem[] = []

  for (const t of tasks) {
    if (!t.notify || t.completed) continue
    const d = daysUntil(t.date)
    if (d <= 3) {
      items.push({
        id: `t-${t.id}`,
        kind: 'task',
        title: t.title,
        detail: d === 0 ? 'Recordatorio para hoy' : d < 0 ? `Vencido hace ${Math.abs(d)} días` : `Vence en ${d} día${d === 1 ? '' : 's'}`,
        date: t.date,
        urgent: d <= 0,
        taskId: t.id,
      })
    }
  }

  for (const m of members) {
    if (m.status === 'inactive') continue
    const d = daysUntil(m.nextDueDate)
    if (m.paymentStatus === 'overdue') {
      items.push({
        id: `m-${m.id}-debt`,
        kind: 'debt',
        title: `Deuda de ${m.fullName}`,
        detail: `Pago vencido hace ${Math.abs(d)} días`,
        date: m.nextDueDate,
        urgent: true,
        memberId: m.id,
      })
    } else if (d === 0) {
      items.push({
        id: `m-${m.id}-due0`,
        kind: 'due',
        title: `${m.fullName} vence hoy`,
        detail: 'Membresía por renovar',
        date: m.nextDueDate,
        urgent: true,
        memberId: m.id,
      })
    } else if (d <= 3) {
      items.push({
        id: `m-${m.id}-due`,
        kind: 'due',
        title: `${m.fullName} vence en ${d} días`,
        detail: 'Membresía por renovar',
        date: m.nextDueDate,
        urgent: false,
        memberId: m.id,
      })
    }
  }

  return items.sort((a, b) => Number(b.urgent) - Number(a.urgent))
}