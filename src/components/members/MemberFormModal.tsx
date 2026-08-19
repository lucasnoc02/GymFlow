import { useState } from 'react'
import { useStore } from '../../store/store'
import type { DiscountType, InitialPaymentStatus, Member } from '../../types'
import { Button, Field, Input, Select } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../lib/dates'

export function MemberFormModal({ open, member, onClose }: { open: boolean; member: Member | null; onClose: () => void }) {
  if (!open) return null
  return <MemberFormContent key={member?.id ?? 'new'} member={member} onClose={onClose} />
}

function MemberFormContent({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const { settings, addMember, updateMember } = useStore()
  const [form, setForm] = useState(() => ({
    fullName: member?.fullName ?? '',
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    dni: member?.dni ?? '',
    planId: member?.planId ?? settings.plans[0]?.id ?? 'free',
    startDate: member?.startDate ?? new Date().toISOString().slice(0, 10),
    monthlyFee: member?.monthlyFee ?? settings.plans[0]?.price ?? settings.defaultMonthlyFee,
    discount: member?.discount ?? 0,
    discountType: (member?.discountType ?? 'percent') as DiscountType,
    initialPaymentStatus: (member?.paymentStatus ?? 'pending') as InitialPaymentStatus,
    notes: member?.notes ?? '',
  }))
  const [error, setError] = useState('')

  const selectPlan = (planId: string) => {
    const plan = settings.plans.find((p) => p.id === planId)
    setForm((f) => ({
      ...f,
      planId,
      monthlyFee: plan ? plan.price : f.monthlyFee,
    }))
  }

  const finalPrice =
    form.discountType === 'percent'
      ? Math.max(0, Math.round((form.monthlyFee * (100 - form.discount)) / 100))
      : Math.max(0, form.monthlyFee - form.discount)

  const submit = () => {
    if (!form.fullName.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    if (form.monthlyFee <= 0) {
      setError('La cuota base debe ser mayor a cero.')
      return
    }
    const { initialPaymentStatus, ...memberFields } = form
    if (member) {
      updateMember(member.id, { ...memberFields, finalPrice })
    } else {
      addMember({ ...memberFields, initialPaymentStatus })
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={member ? 'Editar socio' : 'Nuevo socio'}
      subtitle={member ? `Editando a ${member.fullName}` : 'Completá los datos del nuevo miembro'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>{member ? 'Guardar cambios' : 'Crear socio'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre completo *" className="sm:col-span-2" error={error}>
          <Input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Ej: Juan Pérez"
            autoFocus
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="socio@correo.com"
          />
        </Field>
        <Field label="Teléfono">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+54 9 11 5555-0101"
          />
        </Field>
        <Field label="DNI / ID">
          <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} placeholder="38.512.904" />
        </Field>
        <Field label="Fecha de ingreso">
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </Field>
        <Field label="Plan" hint="El precio del plan se aplica como cuota base">
          <Select value={form.planId} onChange={(e) => selectPlan(e.target.value)}>
            {settings.plans.length === 0 && <option value="free">Sin planes cargados</option>}
            {settings.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatCurrency(p.price)}/mes
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cuota base (ARS)">
          <Input
            type="number"
            min={0}
            value={form.monthlyFee}
            onChange={(e) => setForm({ ...form, monthlyFee: Number(e.target.value) })}
          />
        </Field>
        {!member && (
          <Field label="Estado inicial" hint="Cómo inicia su situación de pago">
            <Select
              value={form.initialPaymentStatus}
              onChange={(e) => setForm({ ...form, initialPaymentStatus: e.target.value as InitialPaymentStatus })}
            >
              <option value="paid">Al día</option>
              <option value="pending">Pendiente</option>
              <option value="overdue">Con deuda</option>
            </Select>
          </Field>
        )}
        <Field label="Tipo de descuento">
          <Select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value as DiscountType })}
          >
            <option value="percent">Porcentaje (%)</option>
            <option value="fixed">Monto fijo (ARS)</option>
          </Select>
        </Field>
        <Field label={form.discountType === 'percent' ? 'Descuento (%)' : 'Descuento (ARS)'}>
          <Input
            type="number"
            min={0}
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
          />
        </Field>
        <div className="flex items-end">
          <div className="w-full rounded-lg border border-ok/25 bg-ok-muted px-4 py-2.5">
            <p className="text-[11px] font-medium text-ok">Cuota final</p>
            <p className="text-lg font-bold text-snow">{formatCurrency(finalPrice)}</p>
          </div>
        </div>
        <Field label="Notas" className="sm:col-span-2">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones opcionales" />
        </Field>
      </div>
    </Modal>
  )
}