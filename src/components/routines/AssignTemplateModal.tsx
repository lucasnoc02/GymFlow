import { useMemo, useState } from 'react'
import { Link2, Search } from 'lucide-react'
import { useStore } from '../../store/store'
import { Button, Field, Select } from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { templateExerciseCount } from '../../lib/routines'

export function AssignTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <AssignTemplateContent onClose={onClose} />
}

function AssignTemplateContent({ onClose }: { onClose: () => void }) {
  const { templates, members, routines, assignTemplate } = useStore()
  const [templateId, setTemplateId] = useState(() => templates[0]?.id ?? '')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const linkedCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of routines) {
      if (r.templateId && !r.isCustomized) map.set(r.templateId, (map.get(r.templateId) ?? 0) + 1)
    }
    return map
  }, [routines])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter((m) => `${m.fullName} ${m.dni}`.toLowerCase().includes(q))
  }, [members, search])

  const template = templates.find((t) => t.id === templateId)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = () => {
    if (!templateId || selected.size === 0) return
    assignTemplate(templateId, [...selected])
    setSelected(new Set())
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Asignar plantilla"
      subtitle="Vinculá una plantilla general a uno o varios socios"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!templateId || selected.size === 0}>
            <Link2 size={14} />
            Asignar a {selected.size > 0 ? selected.size : ''} {selected.size === 1 ? 'socio' : 'socios'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Plantilla general">
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.length === 0 && <option value="">No hay plantillas creadas</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </Field>

        {template && (
          <div className="rounded-lg border border-ink-500/60 bg-ink-700/40 px-4 py-3">
            <p className="text-sm font-medium text-fog">{template.title}</p>
            <p className="mt-0.5 text-xs text-ash">
              {template.days.length} días · {templateExerciseCount(template.days)} ejercicios
              {linkedCount.get(template.id)
                ? ` · ${linkedCount.get(template.id)} socio(s) ya la usan`
                : ' · todavía sin asignar'}
            </p>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar socios..."
            className="w-full rounded-lg border border-ink-500 bg-ink-800 py-2 pl-9 pr-3 text-sm text-fog placeholder:text-ash focus:border-silver focus:outline-none focus:ring-2 focus:ring-silver/30"
          />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-ink-500/60 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-ash">No hay socios que coincidan.</p>
          ) : (
            <ul className="divide-y divide-ink-500/40">
              {filtered.map((m) => {
                const hasLinked = routines.some((r) => r.memberId === m.id && !r.isCustomized)
                return (
                  <li key={m.id}>
                    <button
                      onClick={() => toggle(m.id)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-700/40"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-colors ${
                          selected.has(m.id) ? 'border-ok bg-ok text-ok-ink' : 'border-ink-500'
                        }`}
                      >
                        {selected.has(m.id) ? '✓' : ''}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-sm font-medium text-fog">{m.fullName}</span>
                        <span className="block text-[11px] text-ash">{m.dni || 'sin DNI'}</span>
                      </span>
                      {hasLinked && (
                        <span className="text-[10px] font-medium text-ok">Ya tiene rutina vinculada</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}