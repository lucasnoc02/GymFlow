import { useMemo, useState } from 'react'
import { ClipboardList, Eye, Layers, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../../store/store'
import type { Routine, RoutineTemplate } from '../../types'
import { Badge, Button } from '../ui/primitives'
import { Card, CardBody } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Topbar } from '../layout/Topbar'
import { Tabs, EmptyState } from '../ui/Tabs'
import { resolveRoutineDays, resolveRoutineTitle, resolveTemplate, templateExerciseCount } from '../../lib/routines'
import { AssignTemplateModal } from './AssignTemplateModal'
import { TemplateFormModal } from './TemplateFormModal'
import { RoutineEditorModal } from './RoutineEditorModal'
import { RoutineViewModal } from './RoutineViewModal'

type TabKey = 'plantillas' | 'asignadas'

export function RoutinesPage() {
  const { routines, members, templates, deleteRoutine, deleteTemplate, resetData } = useStore()
  const [tab, setTab] = useState<TabKey>('plantillas')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [viewingRoutine, setViewingRoutine] = useState<Routine | null>(null)
  const [confirmRoutine, setConfirmRoutine] = useState<Routine | null>(null)

  const [editingTemplate, setEditingTemplate] = useState<RoutineTemplate | null>(null)
  const [viewingTemplate, setViewingTemplate] = useState<RoutineTemplate | null>(null)
  const [confirmTemplate, setConfirmTemplate] = useState<RoutineTemplate | null>(null)

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.fullName]))
    return (id: string) => map.get(id) ?? ''
  }, [members])

  const linkedCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of routines) {
      if (r.templateId && !r.isCustomized) map.set(r.templateId, (map.get(r.templateId) ?? 0) + 1)
    }
    return map
  }, [routines])

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase()
    return templates.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q))
  }, [templates, search])

  const filteredRoutines = useMemo(() => {
    const q = search.toLowerCase()
    return routines.filter((r) => {
      const hay = `${resolveRoutineTitle(r, templates)} ${memberName(r.memberId)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [routines, templates, search, memberName])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar
        title="Rutinas"
        subtitle="Plantillas generales y rutinas asignadas a socios"
        search={search}
        onSearch={setSearch}
        onReset={resetData}
        actions={
          tab === 'plantillas' ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus size={15} />
              Nueva plantilla
            </Button>
          ) : (
            <Button onClick={() => setAssignOpen(true)}>
              <Link2 size={15} />
              Asignar plantilla
            </Button>
          )
        }
      />

      <div className="flex items-center gap-3 px-6 pt-4">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'plantillas', label: `Plantillas (${templates.length})` },
            { id: 'asignadas', label: `Asignadas (${routines.length})` },
          ]}
        />
        <p className="text-[11px] text-ash">
          Editar una plantilla afecta a todos los vinculados · Editar en el perfil del socio la desvincula.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        {tab === 'plantillas' &&
          (filteredTemplates.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<Layers size={28} />}
                  title="No hay plantillas"
                  description="Creá una plantilla general de entrenamiento y luego asignala a uno o varios socios."
                  action={
                    <Button size="sm" onClick={() => setFormOpen(true)}>
                      <Plus size={14} />
                      Crear primera plantilla
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredTemplates.map((t) => {
                const linked = linkedCount.get(t.id) ?? 0
                return (
                  <Card key={t.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-3 border-b border-ink-500/60 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-silver">
                            <Layers size={15} />
                          </div>
                          <p className="truncate text-sm font-semibold text-fog">{t.title}</p>
                        </div>
                        {t.description && <p className="mt-1.5 line-clamp-2 text-xs text-ash">{t.description}</p>}
                      </div>
                      <Badge tone={linked > 0 ? 'ok' : 'neutral'}>{linked} vinculados</Badge>
                    </div>

                    <div className="flex-1 px-5 py-4">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ash">Contenido</p>
                      <p className="text-xs text-fog">
                        {t.days.length} días · {templateExerciseCount(t.days)} ejercicios
                      </p>
                      <ul className="mt-2 space-y-1">
                        {t.days.slice(0, 4).map((d, i) => (
                          <li key={i} className="flex items-center justify-between text-xs">
                            <span className="text-fog">{d.dayName}</span>
                            <span className="text-ash">{d.exercises.length} ejercicios</span>
                          </li>
                        ))}
                        {t.days.length > 4 && <li className="text-xs text-ash">+ {t.days.length - 4} días más</li>}
                      </ul>
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-ink-500/60 px-5 py-3">
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setViewingTemplate(t)}>
                        <Eye size={14} />
                        Ver
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditingTemplate(t)}>
                        <Pencil size={14} />
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setAssignOpen(true)}>
                        <Link2 size={14} />
                        Asignar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-debt hover:text-debt" onClick={() => setConfirmTemplate(t)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ))}

        {tab === 'asignadas' &&
          (filteredRoutines.length === 0 ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={<ClipboardList size={28} />}
                  title="No hay rutinas asignadas"
                  description="Asigná una plantilla general a uno o varios socios desde acá o desde el perfil del socio."
                  action={
                    <Button size="sm" onClick={() => setAssignOpen(true)}>
                      <Link2 size={14} />
                      Asignar plantilla
                    </Button>
                  }
                />
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredRoutines.map((r) => {
                const m = members.find((x) => x.id === r.memberId)
                const days = resolveRoutineDays(r, templates)
                const t = resolveTemplate(r, templates)
                return (
                  <Card key={r.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-3 border-b border-ink-500/60 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-700 text-silver">
                            <ClipboardList size={15} />
                          </div>
                          <p className="truncate text-sm font-semibold text-fog">{resolveRoutineTitle(r, templates)}</p>
                        </div>
                        <p className="mt-1.5 text-xs text-ash">
                          {m?.fullName ?? 'Socio eliminado'}
                          {m && <span> · {m.dni || 'sin DNI'}</span>}
                        </p>
                      </div>
                      {r.isCustomized ? (
                        <Badge tone="warn">Personalizada</Badge>
                      ) : (
                        <Badge tone="ok" icon={<Link2 size={11} />}>Vinculada</Badge>
                      )}
                    </div>

                    <div className="flex-1 px-5 py-4">
                      {t && !r.isCustomized && (
                        <p className="mb-2 rounded-md bg-ink-700/50 px-2.5 py-1.5 text-[11px] text-silver">
                          Sigue a la plantilla «{t.title}»
                        </p>
                      )}
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ash">Días</p>
                      <ul className="space-y-1.5">
                        {days.slice(0, 4).map((d, i) => (
                          <li key={i} className="flex items-center justify-between text-xs">
                            <span className="text-fog">{d.dayName}</span>
                            <span className="text-ash">{d.exercises.length} ejercicios</span>
                          </li>
                        ))}
                        {days.length > 4 && <li className="text-xs text-ash">+ {days.length - 4} días más</li>}
                      </ul>
                      {r.isCustomized && (
                        <p className="mt-3 text-[11px] text-ash">Copia independiente · no afecta a otros socios.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-ink-500/60 px-5 py-3">
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setViewingRoutine(r)}>
                        <Eye size={14} />
                        Ver
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => setEditingRoutine(r)}>
                        <Pencil size={14} />
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-debt hover:text-debt" onClick={() => setConfirmRoutine(r)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ))}
      </div>

      <TemplateFormModal open={formOpen} onClose={() => setFormOpen(false)} onCreated={(t) => setEditingTemplate(t)} />
      <AssignTemplateModal open={assignOpen} onClose={() => setAssignOpen(false)} />
      <RoutineEditorModal routine={editingRoutine} template={editingTemplate} onClose={() => { setEditingRoutine(null); setEditingTemplate(null) }} />
      <RoutineViewModal routine={viewingRoutine} template={viewingTemplate} onClose={() => { setViewingRoutine(null); setViewingTemplate(null) }} />

      <Modal
        open={!!confirmRoutine}
        onClose={() => setConfirmRoutine(null)}
        title="Eliminar rutina"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRoutine(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { if (confirmRoutine) deleteRoutine(confirmRoutine.id); setConfirmRoutine(null) }}>
              Eliminar
            </Button>
          </>
        }
      >
        {confirmRoutine && (
          <p className="text-sm text-fog">
            ¿Eliminar la rutina <strong>{resolveRoutineTitle(confirmRoutine, templates)}</strong> de{' '}
            {members.find((x) => x.id === confirmRoutine.memberId)?.fullName ?? 'este socio'}?
          </p>
        )}
      </Modal>

      <Modal
        open={!!confirmTemplate}
        onClose={() => setConfirmTemplate(null)}
        title="Eliminar plantilla"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmTemplate(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { if (confirmTemplate) deleteTemplate(confirmTemplate.id); setConfirmTemplate(null) }}>
              Eliminar
            </Button>
          </>
        }
      >
        {confirmTemplate && (
          <p className="text-sm text-fog">
            ¿Eliminar la plantilla <strong>{confirmTemplate.title}</strong>? Los{' '}
            <strong>{linkedCount.get(confirmTemplate.id) ?? 0} socio(s) vinculados</strong> conservarán una copia
            independiente de la rutina.
          </p>
        )}
      </Modal>
    </div>
  )
}