import { useMemo, useState } from 'react'
import { Bell, BellOff, CalendarPlus, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/store'
import { useToday } from '../../lib/dateContext'
import type { CalendarTask } from '../../types'
import { buildMonthGrid, monthLabel, shiftMonth, WEEKDAYS } from '../../lib/calendar'
import { Button } from '../ui/primitives'
import { EmptyState } from '../ui/Tabs'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Topbar } from '../layout/Topbar'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/dates'
import { TaskFormModal } from './TaskFormModal'

export function CalendarPage() {
  const { tasks, settings, deleteTask, resetData } = useStore()
  const { todayISO: today } = useToday()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creatingFor, setCreatingFor] = useState(today)
  const [editing, setEditing] = useState<CalendarTask | null>(null)

  const cells = useMemo(() => buildMonthGrid(month, today), [month, today])
  const holidaySet = useMemo(() => new Set(settings.holidays), [settings.holidays])
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>()
    for (const t of tasks) {
      const list = map.get(t.date) ?? []
      list.push(t)
      map.set(t.date, list)
    }
    return map
  }, [tasks])

  const selectedTasks = selectedDay ? (byDate.get(selectedDay) ?? []) : []
  const openCreate = (date: string) => {
    setCreatingFor(date)
    setCreateOpen(true)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar
        title="Calendario"
        subtitle="Recordatorios, quehaceres y fechas clave del gimnasio"
        onReset={resetData}
        actions={
          <Button onClick={() => openCreate(today)}>
            <CalendarPlus size={15} />
            Nuevo recordatorio
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        <Card>
          <CardHeader
            title={monthLabel(month)}
            subtitle="Hacé clic en un día para ver o agregar recordatorios"
            action={
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setMonth(shiftMonth(month, -1))}>
                  <ChevronLeft size={15} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                  Hoy
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonth(shiftMonth(month, 1))}>
                  <ChevronRight size={15} />
                </Button>
              </div>
            }
          />
          <CardBody className="px-4 pt-3">
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ash">
                  {w}
                </div>
              ))}
              {cells.map((cell) => {
                const dayTasks = byDate.get(cell.iso) ?? []
                return (
                  <button
                    key={cell.iso}
                    onClick={() => setSelectedDay(cell.iso)}
                    className={cn(
                      'flex min-h-[92px] flex-col rounded-lg border p-1.5 text-left transition-colors',
                      cell.iso === today
                        ? 'border-snow bg-ink-700'
                        : 'border-ink-500/50 bg-ink-800 hover:border-ink-500 hover:bg-ink-700/50',
                      !cell.inMonth && 'opacity-40',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                          cell.iso === today ? 'bg-accent text-accent-ink' : 'text-fog',
                        )}
                      >
                        {cell.day}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="rounded-full bg-ok-muted px-1.5 text-[10px] font-bold text-ok">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-1">
                      {holidaySet.has(cell.iso) && (
                        <div className="truncate rounded bg-warn-muted px-1.5 py-0.5 text-[10px] font-medium text-warn">
                          Feriado
                        </div>
                      )}
                      {dayTasks.slice(0, 3).map((t) => (
                        <div
                          key={t.id}
                          className={cn(
                            'truncate rounded px-1.5 py-0.5 text-[10px] font-medium',
                            t.completed
                              ? 'bg-ink-600/60 text-ash line-through'
                              : 'bg-ink-600 text-silver',
                          )}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="px-1.5 text-[10px] text-ash">+{dayTasks.length - 3} más</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <DayTasksModal
        date={selectedDay}
        tasks={selectedTasks}
        onClose={() => setSelectedDay(null)}
        onAdd={() => selectedDay && openCreate(selectedDay)}
        onEdit={(t) => setEditing(t)}
        onDelete={deleteTask}
      />

      <TaskFormModal
        open={createOpen}
        task={null}
        defaultDate={creatingFor}
        onClose={() => setCreateOpen(false)}
      />
      <TaskFormModal
        open={!!editing}
        task={editing}
        defaultDate={editing?.date ?? today}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function DayTasksModal({
  date,
  tasks,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: {
  date: string | null
  tasks: CalendarTask[]
  onClose: () => void
  onAdd: () => void
  onEdit: (t: CalendarTask) => void
  onDelete: (id: string) => void
}) {
  const { updateTask } = useStore()

  return (
    <Modal
      open={!!date}
      onClose={onClose}
      title={date ? formatDate(date) : ''}
      subtitle={`${tasks.length} recordatorio${tasks.length === 1 ? '' : 's'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onAdd}>
            <Plus size={14} />
            Agregar
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      {tasks.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus size={26} />}
          title="Sin recordatorios este día"
          description="Agregá un quehacer o recordatorio para esta fecha."
          action={
            <Button size="sm" variant="outline" onClick={onAdd}>
              <Plus size={13} />
              Agregar recordatorio
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors',
                t.completed ? 'border-ink-500/40 bg-ink-700/30 opacity-60' : 'border-ink-500/60 bg-ink-700/40',
              )}
            >
              <button
                role="checkbox"
                aria-checked={t.completed}
                onClick={() => updateTask(t.id, { completed: !t.completed })}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors',
                  t.completed ? 'border-ok bg-ok text-ok-ink' : 'border-ink-500 text-transparent hover:border-silver',
                )}
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium', t.completed ? 'text-ash line-through' : 'text-fog')}>
                  {t.title}
                </p>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-ash">
                  {t.time && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {t.time}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {t.notify ? <Bell size={11} className="text-warn" /> : <BellOff size={11} />}
                    {t.notify ? 'Con notificación' : 'Sin notificación'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onEdit(t)}
                className="rounded-lg p-1.5 text-silver transition-colors hover:bg-ink-600 hover:text-fog"
                title="Editar"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(t.id)}
                className="rounded-lg p-1.5 text-silver transition-colors hover:bg-debt-muted hover:text-debt"
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}