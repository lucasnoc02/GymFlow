import type { LateFeeConfig, Member } from '../types'
import { daysUntil } from './dates'

/**
 * Recomputes debt / payment status / member status from dates.
 * Aplica automáticamente el recargo por mora cuando el día del mes supera
 * el día de corte configurado y la cuota del mes no está pagada.
 */
export function normalizeMember(m: Member, lateFee: LateFeeConfig, today: string): Member {
  const base = m.lastPaymentDate ?? m.startDate

  let debt = m.debtAmount
  let paymentStatus = m.paymentStatus
  let status = m.status

  if (daysUntil(m.nextDueDate) <= 0) {
    const months = Math.max(1, monthsBetween(base, today))
    debt = months * m.finalPrice
    paymentStatus = 'overdue'
    status = 'debtor'
  } else {
    debt = 0
    paymentStatus = daysUntil(m.nextDueDate) <= 3 ? 'pending' : 'paid'
    if (status !== 'inactive') status = 'active'
  }

  // Recargo por mora / pago tardío
  const overdueMonths = Math.max(1, monthsBetween(base, today))
  const pastCutoff = Number(today.slice(8, 10)) > lateFee.cutoffDay
  const unit =
    lateFee.surchargeType === 'percentage'
      ? Math.round((m.finalPrice * lateFee.surchargeValue) / 100)
      : lateFee.surchargeValue

  const surchargeAmount = paymentStatus === 'overdue' && pastCutoff && m.status !== 'inactive' ? overdueMonths * unit : 0
  const totalDue = debt + surchargeAmount

  return {
    ...m,
    debtAmount: debt,
    surchargeAmount,
    totalDue,
    hasSurcharge: surchargeAmount > 0,
    paymentStatus,
    status,
  }
}

export function monthsBetween(fromISO: string, toISO: string): number {
  const [fy, fm] = fromISO.split('-').map(Number)
  const [ty, tm] = toISO.split('-').map(Number)
  return Math.max(0, (ty - fy) * 12 + (tm - fm))
}