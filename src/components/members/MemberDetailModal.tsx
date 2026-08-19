import { useMemo, useState } from 'react'
import { AlertTriangle, Banknote, CalendarCheck2, Check, Copy, Dumbbell, Eye, KeyRound, Link2, Pencil, Percent, RefreshCw, Tag } from 'lucide-react'
import { useStore } from '../../store/store'
import type { Member, Routine } from '../../types'
import { Badge, Button, Select } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { MiniCalendar } from '../ui/MiniCalendar'
import { MemberStatusBadge } from './MembersPage'
import { RoutineEditorModal } from '../routines/RoutineEditorModal'
import { RoutineViewModal } from '../routines/RoutineViewModal'
import { resolveRoutineDays, resolveRoutineTitle, resolveTemplate } from '../../lib/routines'
import { formatCurrency, formatDate, relativeDayLabel, daysUntil, todayISO } from '../../lib/dates'

export function MemberDetailModal({
  memberId,
  onClose,
  onPay,
  onEdit,
}: {
  memberId: string | null
  onClose: () => void
  onPay: (m: Member) => void
  onEdit: (m: Member) => void
}) {
  const { members, routines, templates, settings, applyDiscount, assignTemplate, regenerateLoginCode } = useStore()
  const [discountDraft, setDiscountDraft] = useState<{ value: number; type: 'percent' | 'fixed' }>({ value: 0, type: 'percent' })
  const [assignTemplateId, setAssignTemplateId] = useState(() => templates[0]?.id ?? '')
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [viewingRoutine, setViewingRoutine] = useState<Routine | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const member = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId])
  const memberRoutines = useMemo(() => routines.filter((r) => r.memberId === memberId), [routines, memberId])

  const copyCode = async () => {
    if (!member) return
    try {
      await navigator.clipboard.writeText(member.loginCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  if (!member) return null

  const d = daysUntil(member.nextDueDate)
  const dueText =
    member.status === 'inactive'
      ? 'Socio inactivo'
      : member.paymentStatus === 'overdue'
        ? `Vencido hace ${Math.abs(d)} días`
        : d === 0
          ? 'Vence hoy'
          : `Vence ${relativeDayLabel(member.nextDueDate).toLowerCase()}`

  const preview =
    discountDraft.type === 'percent'
      ? Math.max(0, Math.round((member.monthlyFee * (100 - discountDraft.value)) / 100))
      : Math.max(0, member.monthlyFee - discountDraft.value)

  const currentMonthPrefix = todayISO().slice(0, 7)
  const attendedThisMonth = member.attendanceHistory.filter((d) => d.startsWith(currentMonthPrefix)).length

  const apply = () => {
    applyDiscount(member.id, discountDraft.value, discountDraft.type)
    setDiscountDraft({ value: 0, type: 'percent' })
  }

  const info = [
    { label: 'Plan', value: settings.plans.find((p) => p.id === member.planId)?.name ?? 'Plan estándar' },
    { label: 'DNI / ID', value: member.dni || '—' },
    { label: 'Email', value: member.email || '—' },
    { label: 'Teléfono', value: member.phone || '—' },
    { label: 'Ingreso', value: formatDate(member.startDate) },
    { label: 'Último pago', value: formatDate(member.lastPaymentDate) },
    { label: 'Próximo vencimiento', value: formatDate(member.nextDueDate) },
  ]

  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title={member.fullName}
      subtitle={`${member.dni || 'Sin DNI'} · Socio desde ${formatDate(member.startDate)}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onEdit(member)}>
            <Pencil size={14} />
            Editar
          </Button>
          <Button variant="success" onClick={() => onPay(member)}>
            <Banknote size={14} />
            Registrar pago
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <MemberStatusBadge member={member} />
          {member.debtAmount > 0 && (
            <Badge tone="debt">Deuda: {formatCurrency(member.debtAmount)}</Badge>
          )}
          {member.hasSurcharge && (
            <Badge tone="warn" icon={<AlertTriangle size={12} />}>
              Recargo por mora +{formatCurrency(member.surchargeAmount)}
            </Badge>
          )}
          {member.totalDue > 0 && member.hasSurcharge && (
            <Badge tone="debt">Total pendiente: {formatCurrency(member.totalDue)}</Badge>
          )}
          {member.paymentStatus === 'pending' && <Badge tone="warn">{dueText}</Badge>}
          {member.paymentStatus === 'paid' && <Badge tone="ok">Al día</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {info.map((i) => (
            <div key={i.label}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ash">{i.label}</p>
              <p className="mt-0.5 text-sm text-fog">{i.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-ink-500/70 bg-ink-700/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold text-fog">
                <KeyRound size={14} className="text-silver" />
                Código de acceso del alumno
              </p>
              <p className="mt-0.5 text-[11px] text-ash">
                El alumno lo usa en la pantalla de inicio («Soy Alumno») para ver su perfil.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-snow">
                {member.loginCode}
              </span>
              <Button size="sm" variant="outline" onClick={copyCode}>
                {copiedCode ? <Check size={13} className="text-ok" /> : <Copy size={13} />}
                {copiedCode ? 'Copiado' : 'Copiar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="Regenerar código"
                onClick={() => regenerateLoginCode(member.id)}
              >
                <RefreshCw size={13} />
                Regenerar
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ink-500/70 bg-ink-700/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-semibold text-fog">
              <CalendarCheck2 size={14} className="text-silver" />
              Asistencia
            </p>
            <span className="rounded-full bg-ok-muted px-2.5 py-0.5 text-[11px] font-semibold text-ok">
              {attendedThisMonth} asist. este mes
            </span>
          </div>
          <MiniCalendar highlightedDates={member.attendanceHistory} />
          <p className="mt-3 text-[11px] text-ash">
            {member.attendanceHistory.length} asistencias registradas en total · El check verde marca los días de
            entrenamiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-ink-500/70 bg-ink-700/40 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium text-ash">Cuota base</p>
            <p className="text-lg font-bold text-snow">{formatCurrency(member.monthlyFee)}</p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-ok">
            <Tag size={14} />
            {member.discount > 0
              ? `-${member.discountType === 'percent' ? `${member.discount}%` : formatCurrency(member.discount)}`
              : 'Sin descuento'}
          </div>
          <div className="ml-auto text-right">
            <p className="text-[11px] font-medium text-ok">Cuota final</p>
            <p className="text-lg font-bold text-snow">{formatCurrency(member.finalPrice)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-ink-500/70 bg-ink-700/40 p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fog">
            <Percent size={14} className="text-silver" />
            Calculadora de descuento
          </p>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
            <label className="text-xs text-silver">
              Tipo
              <select
                value={discountDraft.type}
                onChange={(e) => setDiscountDraft({ ...discountDraft, type: e.target.value as 'percent' | 'fixed' })}
                className="mt-1 w-full cursor-pointer rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-fog focus:border-silver focus:outline-none"
              >
                <option value="percent">Porcentaje</option>
                <option value="fixed">Monto fijo</option>
              </select>
            </label>
            <label className="text-xs text-silver sm:col-span-2">
              {discountDraft.type === 'percent' ? 'Descuento (%)' : 'Descuento (ARS)'}
              <input
                type="number"
                min={0}
                value={discountDraft.value}
                onChange={(e) => setDiscountDraft({ ...discountDraft, value: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-fog focus:border-silver focus:outline-none"
              />
            </label>
            <div className="flex items-end gap-2">
              <div className="flex-1 rounded-lg bg-ink-800 px-3 py-2 text-center">
                <p className="text-[10px] text-ash">Nueva cuota</p>
                <p className="text-sm font-bold text-ok">{formatCurrency(preview)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={apply}>Aplicar</Button>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-fog">
            <Dumbbell size={14} className="text-silver" />
            Rutina actual
          </p>
          {templates.length > 0 && (
            <div className="mb-3 flex items-end gap-2">
              <div className="flex-1">
                <Select value={assignTemplateId} onChange={(e) => setAssignTemplateId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={() => assignTemplate(assignTemplateId, [member.id])}>
                <Link2 size={13} />
                Asignar
              </Button>
            </div>
          )}

          {memberRoutines.length === 0 ? (
            <p className="text-xs text-ash">Este socio todavía no tiene rutinas asignadas.</p>
          ) : (
            <ul className="space-y-2">
              {memberRoutines.map((r) => {
                const t = resolveTemplate(r, templates)
                const days = resolveRoutineDays(r, templates)
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-500/60 bg-ink-800 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-fog">
                        {resolveRoutineTitle(r, templates)}
                        {r.isCustomized ? (
                          <Badge tone="warn">Personalizada</Badge>
                        ) : (
                          <Badge tone="ok" icon={<Link2 size={10} />}>Vinculada</Badge>
                        )}
                      </p>
                      <p className="text-xs text-ash">
                        {days.length} días por semana · {days.length} días
                        {t && !r.isCustomized && ` · sigue a «${t.title}»`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewingRoutine(r)}>
                        <Eye size={13} />
                        Ver
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingRoutine(r)}>
                        <Pencil size={13} />
                        Editar
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <RoutineEditorModal routine={editingRoutine} template={null} onClose={() => setEditingRoutine(null)} />
        <RoutineViewModal routine={viewingRoutine} template={null} onClose={() => setViewingRoutine(null)} />

        {member.notes && (
          <div className="rounded-lg border border-warn/25 bg-warn-muted px-4 py-3">
            <p className="text-[11px] font-semibold text-warn">Notas</p>
            <p className="mt-0.5 text-sm text-fog">{member.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
