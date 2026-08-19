import { useState } from 'react'
import { Info, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/store'
import type { Exercise, Routine, RoutineDay, RoutineTemplate } from '../../types'
import { resolveRoutineDays } from '../../lib/routines'
import { Button, Field, Input } from '../ui/primitives'
import { Modal } from '../ui/Modal'

const emptyExercise = (): Exercise => ({ name: '', sets: '3', reps: '12', weight: '', rest: '60s', notes: '' })

interface EditorProps {
  routine: Routine | null
  template: RoutineTemplate | null
  onClose: () => void
}

export function RoutineEditorModal({ routine, template, onClose }: EditorProps) {
  const key = template ? `tpl-${template.id}` : routine ? routine.id : null
  if (!key) return null
  return <RoutineEditorContent key={key} routine={routine} template={template} onClose={onClose} />
}

function RoutineEditorContent({ routine, template, onClose }: EditorProps) {
  const { templates, updateTemplate, saveRoutineEdits } = useStore()
  const initialDays = routine
    ? resolveRoutineDays(routine, templates)
    : template
      ? template.days
      : []
  const isTemplate = !!template
  const linked = !!routine && !routine.isCustomized
  const initialTitle = routine
    ? linked
      ? resolveTemplateTitle(routine, templates)
      : routine.title
    : template
      ? template.title
      : ''

  const [title, setTitle] = useState(initialTitle)
  const [days, setDays] = useState<RoutineDay[]>(() =>
    initialDays.map((d) => ({ dayName: d.dayName, exercises: d.exercises.map((e) => ({ ...e })) })),
  )

  const updateDay = (di: number, patch: Partial<RoutineDay>) => {
    setDays(days.map((d, i) => (i === di ? { ...d, ...patch } : d)))
  }

  const updateExercise = (di: number, ei: number, patch: Partial<Exercise>) => {
    setDays(
      days.map((d, i) =>
        i === di
          ? { ...d, exercises: d.exercises.map((e, j) => (j === ei ? { ...e, ...patch } : e)) }
          : d,
      ),
    )
  }

  const save = () => {
    const nonEmpty = days.filter((d) => d.dayName.trim() || d.exercises.some((e) => e.name.trim()))
    const exercises = nonEmpty.map((d) => ({
      dayName: d.dayName.trim() || 'Día de entrenamiento',
      exercises: d.exercises.filter((e) => e.name.trim()),
    }))
    if (template) {
      updateTemplate(template.id, {
        title: title.trim() || template.title,
        days: exercises,
      })
    } else if (routine) {
      saveRoutineEdits(routine.id, {
        title: title.trim() || routine.title,
        daysPerWeek: exercises.length,
        days: exercises,
      })
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isTemplate ? 'Editar plantilla' : linked ? 'Editar rutina del socio' : 'Editar rutina'}
      subtitle={initialTitle}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save}>{isTemplate ? 'Guardar plantilla' : 'Guardar rutina'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {isTemplate && (
          <div className="flex items-start gap-2.5 rounded-lg border border-ok/25 bg-ok-muted px-4 py-3">
            <Info size={15} className="mt-0.5 shrink-0 text-ok" />
            <p className="text-xs text-fog">
              Esta es una <strong>plantilla general</strong>. Los cambios se reflejarán automáticamente en las rutinas
              de todos los socios que tengan esta plantilla asignada.
            </p>
          </div>
        )}
        {linked && (
          <div className="flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn-muted px-4 py-3">
            <Info size={15} className="mt-0.5 shrink-0 text-warn" />
            <p className="text-xs text-fog">
              Esta rutina está vinculada a la plantilla general. Al guardar se <strong>desvinculará</strong> y creará
              una <strong>copia independiente</strong> solo para este socio. Los demás socios con la misma plantilla
              no se verán afectados.
            </p>
          </div>
        )}

        <Field label="Título de la rutina">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        {days.map((day, di) => (
          <div key={di} className="rounded-xl border border-ink-500/60 bg-ink-700/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Field label={`Día ${di + 1}`} className="flex-1">
                <Input value={day.dayName} onChange={(e) => updateDay(di, { dayName: e.target.value })} placeholder="Ej: Lunes · Pecho y Tríceps" />
              </Field>
              <button
                onClick={() => setDays(days.filter((_, i) => i !== di))}
                className="mt-5 rounded-lg p-2 text-silver transition-colors hover:bg-debt-muted hover:text-debt"
                title="Eliminar día"
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-ink-500/50">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-ink-500/50 bg-ink-800 text-[10px] uppercase tracking-wider text-ash">
                    <th className="px-3 py-2 font-semibold">Ejercicio</th>
                    <th className="w-16 px-2 py-2 font-semibold">Series</th>
                    <th className="w-20 px-2 py-2 font-semibold">Reps</th>
                    <th className="w-20 px-2 py-2 font-semibold">Peso</th>
                    <th className="w-20 px-2 py-2 font-semibold">Descanso</th>
                    <th className="px-2 py-2 font-semibold">Notas</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-500/40">
                  {day.exercises.map((ex, ei) => (
                    <tr key={ei}>
                      <td className="px-3 py-1.5">
                        <Input
                          value={ex.name}
                          onChange={(e) => updateExercise(di, ei, { name: e.target.value })}
                          placeholder="Nombre del ejercicio"
                          className="border-0 bg-transparent px-0 focus:ring-0"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={ex.sets} onChange={(e) => updateExercise(di, ei, { sets: e.target.value })} className="border-0 bg-transparent px-0 text-center focus:ring-0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={ex.reps} onChange={(e) => updateExercise(di, ei, { reps: e.target.value })} className="border-0 bg-transparent px-0 text-center focus:ring-0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={ex.weight} onChange={(e) => updateExercise(di, ei, { weight: e.target.value })} className="border-0 bg-transparent px-0 text-center focus:ring-0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={ex.rest} onChange={(e) => updateExercise(di, ei, { rest: e.target.value })} className="border-0 bg-transparent px-0 text-center focus:ring-0" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input value={ex.notes} onChange={(e) => updateExercise(di, ei, { notes: e.target.value })} className="border-0 bg-transparent px-0 focus:ring-0" />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => updateDay(di, { exercises: day.exercises.filter((_, j) => j !== ei) })}
                          className="rounded p-1 text-silver hover:bg-debt-muted hover:text-debt"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => updateDay(di, { exercises: [...day.exercises, emptyExercise()] })}
            >
              <Plus size={13} />
              Agregar ejercicio
            </Button>
          </div>
        ))}

        <Button
          size="sm"
          variant="outline"
          onClick={() => setDays([...days, { dayName: `Día ${days.length + 1}`, exercises: [emptyExercise()] }])}
        >
          <Plus size={14} />
          Agregar día
        </Button>
      </div>
    </Modal>
  )
}

function resolveTemplateTitle(routine: Routine, templates: RoutineTemplate[]): string {
  const t = templates.find((x) => x.id === routine.templateId)
  return t ? t.title : routine.title
}
