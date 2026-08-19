import { useState } from 'react'
import { useStore } from '../../store/store'
import type { CalendarTask } from '../../types'
import { Button, Field, Input } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { todayISO } from '../../lib/dates'

export function TaskFormModal({
  open,
  task,
  defaultDate,
  onClose,
}: {
  open: boolean
  task: CalendarTask | null
  defaultDate: string
  onClose: () => void
}) {
  if (!open) return null
  return (
    <TaskFormContent
      key={task?.id ?? defaultDate ?? 'new'}
      task={task}
      defaultDate={defaultDate}
      onClose={onClose}
    />
  )
}

function TaskFormContent({
  task,
  defaultDate,
  onClose,
}: {
  task: CalendarTask | null
  defaultDate: string
  onClose: () => void
}) {
  const { addTask, updateTask } = useStore()
  const [form, setForm] = useState(() => ({
    title: task?.title ?? '',
    date: task?.date ?? defaultDate ?? todayISO(),
    time: task?.time ?? '',
    notify: task?.notify ?? true,
  }))
  const [error, setError] = useState('')

  const submit = () => {
    if (!form.title.trim()) {
      setError('El título es obligatorio.')
      return
    }
    if (!form.date) {
      setError('La fecha es obligatoria.')
      return
    }
    if (task) {
      updateTask(task.id, form)
    } else {
      addTask({ ...form, completed: false })
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={task ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      subtitle={task ? task.title : 'Agendá un quehacer o recordatorio'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit}>{task ? 'Guardar cambios' : 'Crear recordatorio'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Título *" error={error}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: Pagar alquiler, revisar stock…"
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha *">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Hora (opcional)">
            <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={form.notify}
          onClick={() => setForm({ ...form, notify: !form.notify })}
          className="flex w-full items-center justify-between rounded-lg border border-ink-500/60 bg-ink-700/40 px-4 py-3"
        >
          <div className="text-left">
            <p className="text-sm font-medium text-fog">Notificaciones</p>
            <p className="text-xs text-ash">
              {form.notify
                ? 'Se generará una alerta en la pestaña de Notificaciones'
                : 'Este recordatorio no generará ninguna alerta'}
            </p>
          </div>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${form.notify ? 'bg-accent' : 'bg-ink-500'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${form.notify ? 'left-[22px] bg-accent-ink' : 'left-0.5 bg-ink-900'}`}
            />
          </span>
        </button>
      </div>
    </Modal>
  )
}