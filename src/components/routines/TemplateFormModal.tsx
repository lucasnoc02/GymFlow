import { useState } from 'react'
import { FilePlus2, Layers } from 'lucide-react'
import { useStore } from '../../store/store'
import type { RoutineTemplate, RoutineTemplateId } from '../../types'
import { buildRoutineDays, presetTemplateList, routineTemplates } from '../../data/mock'
import { templateExerciseCount } from '../../lib/routines'
import { Button } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { cn } from '../../lib/cn'

export function TemplateFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (template: RoutineTemplate) => void
}) {
  if (!open) return null
  return <TemplateFormContent onClose={onClose} onCreated={onCreated} />
}

function TemplateFormContent({ onClose, onCreated }: { onClose: () => void; onCreated: (template: RoutineTemplate) => void }) {
  const { addTemplate } = useStore()
  const [picked, setPicked] = useState<RoutineTemplateId | 'blank' | null>(null)

  const submit = () => {
    if (!picked) return
    const created =
      picked === 'blank'
        ? addTemplate({
            title: 'Rutina personalizada',
            description: 'Plantilla en blanco.',
            days: [],
          })
        : addTemplate({
            title: routineTemplates[picked].title,
            description: routineTemplates[picked].description,
            days: buildRoutineDays(picked),
          })
    setPicked(null)
    onClose()
    onCreated(created)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nueva plantilla"
      subtitle="Elegí un punto de partida; luego podés editar cada día y ejercicio"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!picked}>
            <Layers size={14} />
            Crear y editar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {presetTemplateList.map((key) => {
          const days = buildRoutineDays(key)
          const active = picked === key
          return (
            <button
              key={key}
              onClick={() => setPicked(key)}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors',
                active ? 'border-ok bg-ok-muted' : 'border-ink-500 bg-ink-700/40 hover:border-silver',
              )}
            >
              <p className={cn('text-sm font-semibold', active ? 'text-ok' : 'text-fog')}>{routineTemplates[key].title}</p>
              <p className="mt-1 text-xs text-ash">{routineTemplates[key].description}</p>
              <p className="mt-2 text-[11px] text-silver">
                {days.length} días · {templateExerciseCount(days)} ejercicios
              </p>
            </button>
          )
        })}

        <button
          onClick={() => setPicked('blank')}
          className={cn(
            'rounded-xl border border-dashed p-4 text-left transition-colors',
            picked === 'blank' ? 'border-ok bg-ok-muted' : 'border-ink-500 hover:border-silver',
          )}
        >
          <p className={cn('flex items-center gap-2 text-sm font-semibold', picked === 'blank' ? 'text-ok' : 'text-fog')}>
            <FilePlus2 size={15} />
            En blanco
          </p>
          <p className="mt-1 text-xs text-ash">Arrancá desde cero con una plantilla vacía.</p>
        </button>
      </div>
    </Modal>
  )
}