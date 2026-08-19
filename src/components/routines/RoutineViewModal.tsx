import { Check, Copy, Printer } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../../store/store'
import type { Routine, RoutineDay, RoutineTemplate } from '../../types'
import { resolveRoutineDays, resolveRoutineTitle } from '../../lib/routines'
import { Button } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { formatDate, formatCurrency } from '../../lib/dates'

interface ViewProps {
  routine: Routine | null
  template: RoutineTemplate | null
  onClose: () => void
}

export function RoutineViewModal({ routine, template, onClose }: ViewProps) {
  const { members, templates } = useStore()
  const [copied, setCopied] = useState(false)

  if (!routine && !template) return null

  const title = routine
    ? resolveRoutineTitle(routine, templates)
    : template
      ? template.title
      : ''
  const days: RoutineDay[] = routine
    ? resolveRoutineDays(routine, templates)
    : template
      ? template.days
      : []
  const member = routine ? members.find((m) => m.id === routine.memberId) : undefined

  const toText = () => {
    const lines: string[] = []
    lines.push(`GymFlow · ${title.toUpperCase()}`)
    lines.push('')
    if (member) lines.push(`Socio: ${member.fullName}`)
    lines.push(`Dias por semana: ${days.length}`)
    lines.push('')
    for (const day of days) {
      lines.push(`-- ${day.dayName} --`)
      for (const ex of day.exercises) {
        const parts = [
          ex.name,
          ex.sets ? `${ex.sets} series` : '',
          ex.reps ? `${ex.reps} reps` : '',
          ex.weight ? `${ex.weight}` : '',
          ex.rest ? `desc ${ex.rest}` : '',
        ].filter(Boolean)
        lines.push(`  * ${parts.join(' | ')}`)
        if (ex.notes) lines.push(`    Nota: ${ex.notes}`)
      }
      lines.push('')
    }
    return lines.join('\n')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const body = (
    <>
      <div className="mb-4 hidden print:flex items-center justify-between border-b border-neutral-300 pb-3">
        <div>
          <p className="text-lg font-bold text-neutral-900">GymFlow · {title}</p>
          <p className="text-sm text-neutral-600">
            {member ? `Socio: ${member.fullName} · ` : ''}{days.length} días/semana
          </p>
        </div>
        <p className="text-xs text-neutral-500">{formatDate(new Date().toISOString().slice(0, 10))}</p>
      </div>

      {days.map((day, di) => (
        <div key={di} className="rounded-xl border border-ink-500/60 bg-ink-700/30 print:border-neutral-300 print:bg-white">
          <div className="border-b border-ink-500/50 px-4 py-2.5 print:border-neutral-200">
            <p className="text-sm font-bold text-snow print:text-neutral-900">
              {di + 1}. {day.dayName}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm print:min-w-0">
              <thead>
                <tr className="border-b border-ink-500/40 text-[10px] uppercase tracking-wider text-ash print:border-neutral-200 print:text-neutral-500">
                  <th className="px-4 py-2 text-left font-semibold">Ejercicio</th>
                  <th className="px-2 py-2 text-center font-semibold">Series</th>
                  <th className="px-2 py-2 text-center font-semibold">Reps</th>
                  <th className="px-2 py-2 text-center font-semibold">Peso</th>
                  <th className="px-2 py-2 text-center font-semibold">Descanso</th>
                  <th className="px-4 py-2 text-left font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-500/30 print:divide-neutral-200">
                {day.exercises.map((ex, ei) => (
                  <tr key={ei}>
                    <td className="px-4 py-2 font-medium text-fog print:text-neutral-900">{ex.name}</td>
                    <td className="px-2 py-2 text-center text-xs text-silver print:text-neutral-700">{ex.sets || '—'}</td>
                    <td className="px-2 py-2 text-center text-xs text-silver print:text-neutral-700">{ex.reps || '—'}</td>
                    <td className="px-2 py-2 text-center text-xs text-silver print:text-neutral-700">{ex.weight || '—'}</td>
                    <td className="px-2 py-2 text-center text-xs text-silver print:text-neutral-700">{ex.rest || '—'}</td>
                    <td className="px-4 py-2 text-xs text-ash print:text-neutral-600">{ex.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-[11px] text-ash print:hidden">
        {member
          ? `Cuota vigente del socio: ${formatCurrency(member.finalPrice)} · Vence: ${formatDate(member.nextDueDate)}`
          : 'Plantilla general de entrenamiento · se aplica a los socios con esta plantilla asignada.'}
      </p>
    </>
  )

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={title}
        subtitle={member ? `Asignada a ${member.fullName}` : template ? 'Plantilla general' : 'Socio no encontrado'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={copy}>
              {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
              {copied ? 'Copiado' : 'Copiar texto'}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer size={14} />
              Imprimir / PDF
            </Button>
          </>
        }
      >
        <div className="space-y-5">{body}</div>
      </Modal>

      {createPortal(<div id="print-sheet">{body}</div>, document.body)}
    </>
  )
}