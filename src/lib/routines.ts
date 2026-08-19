import type { Routine, RoutineDay, RoutineTemplate } from '../types'

export function resolveTemplate(
  routine: Pick<Routine, 'templateId'> | null,
  templates: RoutineTemplate[],
): RoutineTemplate | null {
  if (!routine || !routine.templateId) return null
  return templates.find((t) => t.id === routine.templateId) ?? null
}

export function resolveRoutineDays(routine: Routine, templates: RoutineTemplate[]): RoutineDay[] {
  if (routine.isCustomized) return routine.days
  const t = resolveTemplate(routine, templates)
  return t ? t.days : routine.days
}

export function resolveRoutineTitle(routine: Routine, templates: RoutineTemplate[]): string {
  if (!routine.isCustomized) {
    const t = resolveTemplate(routine, templates)
    if (t) return t.title
  }
  return routine.title
}

export function templateExerciseCount(days: RoutineDay[]): number {
  return days.reduce((s, d) => s + d.exercises.length, 0)
}
