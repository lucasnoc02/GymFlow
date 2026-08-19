import { useState } from 'react'
import { AlertTriangle, ArrowDownAZ, Banknote, CreditCard, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '../../store/store'
import type { Member } from '../../types'
import { Button } from '../ui/primitives'
import { Card, CardBody } from '../ui/Card'
import { EmptyState } from '../ui/Tabs'
import { Modal } from '../ui/Modal'
import { Topbar } from '../layout/Topbar'
import { MemberFormModal } from './MemberFormModal'
import { MemberDetailModal } from './MemberDetailModal'
import { PaymentModal } from './PaymentModal'
import { LateFeeModal } from './LateFeeModal'
import { cn } from '../../lib/cn'
import { formatCurrency, formatDateShort, relativeDayLabel, daysUntil } from '../../lib/dates'

type Filter = 'all' | 'active' | 'debtor' | 'inactive'
type SortKey = 'az' | 'za' | 'recent' | 'debt'

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'az', label: 'Alfabético A→Z' },
  { id: 'za', label: 'Alfabético Z→A' },
  { id: 'recent', label: 'Recientemente agregado' },
  { id: 'debt', label: 'Con deuda primero' },
]

export function MemberStatusBadge({ member, compact }: { member: Member; compact?: boolean }) {
  if (member.status === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ink-500 bg-ink-600/50 px-2.5 py-0.5 text-[11px] font-semibold text-ash">
        Inactivo
      </span>
    )
  }
  if (member.paymentStatus === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-debt/25 bg-debt-muted px-2.5 py-0.5 text-[11px] font-semibold text-debt">
        {!compact && <CreditCard size={11} />}
        Deuda
      </span>
    )
  }
  if (member.paymentStatus === 'pending') {
    const d = daysUntil(member.nextDueDate)
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-warn/25 bg-warn-muted px-2.5 py-0.5 text-[11px] font-semibold text-warn">
        {!compact && <CreditCard size={11} />}
        {d === 0 ? 'Vence hoy' : 'Por vencer'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ok/25 bg-ok-muted px-2.5 py-0.5 text-[11px] font-semibold text-ok">
      {!compact && <CreditCard size={11} />}
      Al día
    </span>
  )
}

export function MembersPage({ onSelectMemberId, selectedMemberId }: { onSelectMemberId: (id: string | null) => void; selectedMemberId: string | null }) {
  const { members, deleteMember, resetData } = useStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<SortKey>('az')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [paying, setPaying] = useState<Member | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null)
  const [lateFeeOpen, setLateFeeOpen] = useState(false)

  const filtered = members
    .filter((m) => {
      if (filter === 'active' && m.status !== 'active') return false
      if (filter === 'debtor' && m.paymentStatus !== 'overdue') return false
      if (filter === 'inactive' && m.status !== 'inactive') return false
      if (search) {
        const q = search.toLowerCase()
        const hay = `${m.fullName} ${m.email} ${m.phone} ${m.dni}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sort === 'az') return a.fullName.localeCompare(b.fullName, 'es')
      if (sort === 'za') return b.fullName.localeCompare(a.fullName, 'es')
      if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt)
      // Con deuda primero
      const rank = (m: Member) => (m.paymentStatus === 'overdue' ? 0 : m.paymentStatus === 'pending' ? 1 : 2)
      const r = rank(a) - rank(b)
      if (r !== 0) return r
      return b.totalDue - a.totalDue
    })

  const counts = {
    all: members.length,
    active: members.filter((m) => m.status === 'active').length,
    debtor: members.filter((m) => m.paymentStatus === 'overdue').length,
    inactive: members.filter((m) => m.status === 'inactive').length,
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar
        title="Miembros"
        subtitle="Clientes y estado de sus membresías"
        search={search}
        onSearch={setSearch}
        onReset={resetData}
        actions={
          <>
            <Button variant="outline" onClick={() => setLateFeeOpen(true)}>
              <AlertTriangle size={15} />
              Recargos
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
              <UserPlus size={15} />
              Nuevo socio
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'active', label: 'Activos' },
              { id: 'debtor', label: 'Con deuda' },
              { id: 'inactive', label: 'Inactivos' },
            ] as { id: Filter; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                filter === f.id ? 'bg-accent text-accent-ink' : 'text-silver hover:bg-ink-700 hover:text-fog',
              )}
            >
              {f.label}
              <span className={cn('ml-1.5', filter === f.id ? 'text-ink-600' : 'text-ash')}>{counts[f.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ArrowDownAZ size={15} className="text-ash" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 cursor-pointer rounded-lg border border-ink-500 bg-ink-800 px-3 text-xs font-medium text-silver focus:border-silver focus:outline-none"
            aria-label="Ordenar miembros"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-4 scrollbar-thin">
        <Card>
          {filtered.length === 0 ? (
            <CardBody>
              <EmptyState
                icon={<UserPlus size={26} />}
                title="Sin resultados"
                description="No hay miembros que coincidan con el filtro o la búsqueda."
              />
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-500/60 text-[11px] uppercase tracking-wider text-ash">
                    <th className="px-5 py-3 font-semibold">Socio</th>
                    <th className="px-3 py-3 font-semibold">DNI</th>
                    <th className="px-3 py-3 font-semibold">Cuota</th>
                    <th className="px-3 py-3 font-semibold">Último pago</th>
                    <th className="px-3 py-3 font-semibold">Vence</th>
                    <th className="px-3 py-3 font-semibold">Deuda</th>
                    <th className="px-3 py-3 font-semibold">Estado</th>
                    <th className="px-3 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-500/40">
                  {filtered.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      onClick={() => onSelectMemberId(m.id)}
                      onEdit={() => { setEditing(m); setFormOpen(true) }}
                      onPay={() => setPaying(m)}
                      onDelete={() => setConfirmDelete(m)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <MemberFormModal
        open={formOpen}
        member={editing}
        onClose={() => setFormOpen(false)}
      />

      <MemberDetailModal
        memberId={selectedMemberId}
        onClose={() => onSelectMemberId(null)}
        onPay={(m) => setPaying(m)}
        onEdit={(m) => { setEditing(m); setFormOpen(true) }}
      />

      <PaymentModal member={paying} onClose={() => setPaying(null)} />

      <LateFeeModal open={lateFeeOpen} onClose={() => setLateFeeOpen(false)} />

      <ConfirmDeleteModal member={confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => { if (confirmDelete) deleteMember(confirmDelete.id); setConfirmDelete(null) }} />
    </div>
  )
}

function MemberRow({ member, onClick, onEdit, onPay, onDelete }: {
  member: Member
  onClick: () => void
  onEdit: () => void
  onPay: () => void
  onDelete: () => void
}) {
  const initials = member.fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const d = daysUntil(member.nextDueDate)
  const dueLabel =
    member.status === 'inactive' ? '—' : d === 0 ? 'Hoy' : d < 0 ? `Vencido ${Math.abs(d)}d` : relativeDayLabel(member.nextDueDate)

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-ink-700/40"
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-500 bg-ink-700 text-xs font-bold text-fog">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-fog">{member.fullName}</p>
            <p className="truncate text-xs text-ash">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-silver">{member.dni || '—'}</td>
      <td className="px-3 py-3">
        <p className="font-semibold text-fog">{formatCurrency(member.finalPrice)}</p>
        {member.discount > 0 && (
          <p className="text-[11px] text-ok">
            -{member.discountType === 'percent' ? `${member.discount}%` : formatCurrency(member.discount)}
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-silver">{formatDateShort(member.lastPaymentDate)}</td>
      <td className="px-3 py-3 text-xs text-silver">
        <span className={d === 0 ? 'font-semibold text-debt' : d < 0 ? 'font-medium text-debt' : ''}>
          {formatDateShort(member.nextDueDate)}
        </span>
        {dueLabel !== '—' && <span className="ml-1.5 text-ash">· {dueLabel}</span>}
      </td>
      <td className="px-3 py-3">
        {member.totalDue > 0 ? (
          <div>
            <span className="font-semibold text-debt">{formatCurrency(member.totalDue)}</span>
            {member.hasSurcharge && (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-warn">
                <AlertTriangle size={10} />
                Incluye recargo
              </p>
            )}
          </div>
        ) : (
          <span className="text-ash">—</span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <MemberStatusBadge member={member} compact />
          {member.hasSurcharge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warn/25 bg-warn-muted px-2 py-0.5 text-[10px] font-semibold text-warn">
              <AlertTriangle size={10} />
              Recargo por mora
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onPay}
            title="Registrar pago"
            className="rounded-lg p-1.5 text-silver transition-colors hover:bg-ok-muted hover:text-ok"
          >
            <Banknote size={15} />
          </button>
          <button
            onClick={onEdit}
            title="Editar"
            className="rounded-lg p-1.5 text-silver transition-colors hover:bg-ink-600 hover:text-fog"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar"
            className="rounded-lg p-1.5 text-silver transition-colors hover:bg-debt-muted hover:text-debt"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ConfirmDeleteModal({ member, onClose, onConfirm }: { member: Member | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title="Eliminar socio"
      subtitle="Esta acción también eliminará sus rutinas y no se puede deshacer."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Eliminar</Button>
        </>
      }
    >
      {member && (
        <p className="text-sm text-fog">
          ¿Confirmás la eliminación de <strong>{member.fullName}</strong>?
        </p>
      )}
    </Modal>
  )
}
