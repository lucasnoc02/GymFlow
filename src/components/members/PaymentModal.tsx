import { useState } from 'react'
import { CheckCircle2, Wallet } from 'lucide-react'
import { useStore } from '../../store/store'
import type { Member } from '../../types'
import { Button, Field, Input } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { addMonths, formatCurrency, formatDate, todayISO } from '../../lib/dates'

export function PaymentModal({ member, onClose }: { member: Member | null; onClose: () => void }) {
  if (!member) return null
  return <PaymentContent key={member.id} member={member} onClose={onClose} />
}

function PaymentContent({ member, onClose }: { member: Member; onClose: () => void }) {
  const { registerPayment } = useStore()
  const [date, setDate] = useState(todayISO())
  const [done, setDone] = useState(false)

  const nextDue = addMonths(date, 1)

  const submit = () => {
    registerPayment(member.id, { date })
    setDone(true)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar pago"
      subtitle={member.fullName}
      footer={
        done ? (
          <Button onClick={onClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="success" onClick={submit}>
              <Wallet size={14} />
              Confirmar pago
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-muted text-ok">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm font-semibold text-fog">Pago registrado</p>
          <p className="text-xs text-ash">
            La membresía se renovó hasta el <strong className="text-snow">{formatDate(nextDue)}</strong> y la deuda quedó en cero.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-ink-500/70 bg-ink-700/40 px-4 py-3">
            <div>
              <p className="text-[11px] text-ash">Cuota a cobrar</p>
              <p className="text-lg font-bold text-snow">{formatCurrency(member.finalPrice)}</p>
            </div>
            {member.totalDue > 0 && (
              <div className="text-right">
                <p className="text-[11px] text-debt">Incluye deuda previa</p>
                <p className="text-sm font-semibold text-debt">{formatCurrency(member.totalDue)}</p>
                {member.hasSurcharge && (
                  <p className="text-[10px] text-warn">+ {formatCurrency(member.surchargeAmount)} recargo</p>
                )}
              </div>
            )}
          </div>

          <Field label="Fecha del pago">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <div className="rounded-lg border border-ok/25 bg-ok-muted px-4 py-3 text-xs text-fog">
            Al confirmar, el vencimiento se extenderá al <strong className="text-snow">{formatDate(nextDue)}</strong> (próximo mes) y se liquidará toda la deuda.
          </div>
        </div>
      )}
    </Modal>
  )
}