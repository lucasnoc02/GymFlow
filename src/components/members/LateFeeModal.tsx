import { useState } from 'react'
import { AlertTriangle, Check, Save } from 'lucide-react'
import { useStore } from '../../store/store'
import { useToday } from '../../lib/dateContext'
import type { SurchargeType } from '../../types'
import { Button, Field, Input, Select } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { formatCurrency } from '../../lib/dates'

export function LateFeeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <LateFeeContent onClose={onClose} />
}

function LateFeeContent({ onClose }: { onClose: () => void }) {
  const { settings, members, updateLateFee } = useStore()
  const { today } = useToday()
  const [form, setForm] = useState(() => ({
    cutoffDay: settings.lateFee.cutoffDay,
    surchargeType: settings.lateFee.surchargeType as SurchargeType,
    surchargeValue: settings.lateFee.surchargeValue,
  }))
  const [saved, setSaved] = useState(false)

  const pastCutoff = today.getDate() > form.cutoffDay
  const overdueMembers = members.filter((m) => m.paymentStatus === 'overdue' && m.status !== 'inactive')
  const affected = pastCutoff ? overdueMembers.filter((m) => m.hasSurcharge) : []

  const unit =
    form.surchargeType === 'percentage'
      ? `el ${form.surchargeValue}% de la cuota`
      : `un recargo fijo de ${formatCurrency(form.surchargeValue)}`

  const save = () => {
    const cutoffDay = Math.min(28, Math.max(1, form.cutoffDay))
    const surchargeValue = Math.max(0, form.surchargeValue)
    updateLateFee({ cutoffDay, surchargeType: form.surchargeType, surchargeValue })
    setSaved(true)
    setTimeout(onClose, 800)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Recargos por mora / pago tardío"
      subtitle="Regla automática vinculada al motor de fechas del sistema"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>
            {saved ? <Check size={14} className="text-ink-900" /> : <Save size={14} />}
            Guardar regla
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Día de corte mensual" hint="Ej. 15 = corte el día 15 de cada mes">
            <Input
              type="number"
              min={1}
              max={28}
              value={form.cutoffDay}
              onChange={(e) => setForm({ ...form, cutoffDay: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tipo de recargo">
            <Select
              value={form.surchargeType}
              onChange={(e) => setForm({ ...form, surchargeType: e.target.value as SurchargeType })}
            >
              <option value="fixed">Monto fijo ($)</option>
              <option value="percentage">Porcentaje (%)</option>
            </Select>
          </Field>
          <Field label={form.surchargeType === 'fixed' ? 'Monto de recargo ($)' : 'Porcentaje de recargo (%)'}>
            <Input
              type="number"
              min={0}
              value={form.surchargeValue}
              onChange={(e) => setForm({ ...form, surchargeValue: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            pastCutoff ? 'border-warn/30 bg-warn-muted text-fog' : 'border-ink-500/60 bg-ink-700/40 text-ash'
          }`}
        >
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle size={15} className={pastCutoff ? 'text-warn' : 'text-silver'} />
            Estado actual: hoy es día {today.getDate()} de {today.getMonth() + 1}
          </p>
          <p className="mt-1 text-xs">
            {pastCutoff
              ? `Se superó el día de corte. A cada socio con cuota impaga se le sumará automáticamente ${unit}.`
              : `Todavía no se superó el día de corte (día ${form.cutoffDay}). El recargo comenzará a aplicarse después de esa fecha.`}
          </p>
        </div>

        <div className="rounded-lg border border-ink-500/60 bg-ink-700/40 px-4 py-3">
          <p className="text-xs text-ash">Socios afectados en este momento:</p>
          {affected.length === 0 ? (
            <p className="mt-1 text-sm font-semibold text-ok">
              <Check size={13} className="mr-1 inline" />
              Ninguno ({overdueMembers.length} con deuda pendiente)
            </p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
              {affected.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span className="text-fog">{m.fullName}</span>
                  <span className="text-warn">+{formatCurrency(m.surchargeAmount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}