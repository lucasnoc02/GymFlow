import { useMemo } from 'react'
import { CalendarCheck2, CreditCard, Dumbbell, Info, LogOut, User } from 'lucide-react'
import { useStore } from '../../store/store'
import { useToday } from '../../lib/dateContext'
import { resolveRoutineDays, resolveRoutineTitle } from '../../lib/routines'
import { MemberStatusBadge } from '../members/MembersPage'
import { MiniCalendar } from '../ui/MiniCalendar'
import { formatCurrency, formatDate } from '../../lib/dates'

export function StudentView() {
  const { members, settings, routines, templates, sessionMemberId, logout } = useStore()
  const { todayISO: today } = useToday()

  const member = useMemo(
    () => members.find((m) => m.id === sessionMemberId) ?? null,
    [members, sessionMemberId],
  )

  const memberRoutines = useMemo(
    () => routines.filter((r) => r.memberId === sessionMemberId),
    [routines, sessionMemberId],
  )

  if (!member) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-900 p-6 text-center text-fog">
        <p className="text-sm text-ash">No se encontró tu perfil de alumno.</p>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-ink-500 px-4 py-2 text-xs font-medium text-silver transition-colors hover:bg-ink-700 hover:text-fog"
        >
          <LogOut size={13} />
          Volver al inicio
        </button>
      </div>
    )
  }

  const plan = settings.plans.find((p) => p.id === member.planId)
  const monthPrefix = today.slice(0, 7)
  const attendedThisMonth = member.attendanceHistory.filter((d) => d.startsWith(monthPrefix)).length
  const holidaysThisMonth = settings.holidays.filter((h) => h.startsWith(monthPrefix)).sort()

  return (
    <div className="min-h-screen bg-ink-900 text-fog">
      <header className="sticky top-0 z-10 border-b border-ink-500/70 bg-ink-850/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-snow">{settings.gymName}</p>
            <p className="text-[11px] text-ash">Vista del alumno · {member.fullName}</p>
          </div>
          <button
            onClick={logout}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-ink-500 px-3 text-xs font-medium text-silver transition-colors hover:bg-ink-700 hover:text-fog"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-5 py-6">
        <Section icon={<User size={14} />} title="Mi perfil">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-snow">{member.fullName}</p>
              <p className="mt-0.5 text-xs text-ash">
                {member.dni || 'Sin DNI'} · {formatDate(member.startDate)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <MemberStatusBadge member={member} />
                {member.totalDue > 0 && (
                  <span className="rounded-full border border-debt/25 bg-debt-muted px-2.5 py-0.5 text-[11px] font-semibold text-debt">
                    Total pendiente: {formatCurrency(member.totalDue)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] font-medium text-ash">Plan</p>
                <p className="text-sm font-semibold text-fog">{plan?.name ?? 'Plan estándar'}</p>
                <p className="text-xs text-ash">{formatCurrency(plan?.price ?? member.monthlyFee)} / mes</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-ash">Cuota</p>
                <p className="text-sm font-semibold text-snow">{formatCurrency(member.finalPrice)}</p>
                <p className="text-xs text-ash">
                  {member.discount > 0
                    ? `-${member.discountType === 'percent' ? `${member.discount}%` : formatCurrency(member.discount)}`
                    : 'Sin descuento'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-ash">Próximo vencimiento</p>
                <p className="text-sm font-semibold text-fog">{formatDate(member.nextDueDate)}</p>
                <p className="text-xs text-ash">{member.lastPaymentDate ? `Último pago: ${formatDate(member.lastPaymentDate)}` : 'Sin pagos registrados'}</p>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={<CalendarCheck2 size={14} />} title="Mi asistencia">
          <MiniCalendar highlightedDates={member.attendanceHistory} />
          <p className="mt-3 text-[11px] text-ash">
            {member.attendanceHistory.length} asistencias en total · {attendedThisMonth} este mes. El check verde marca
            los días en que asististe.
          </p>
        </Section>

        <Section icon={<Dumbbell size={14} />} title="Mi rutina actual">
          {memberRoutines.length === 0 ? (
            <p className="text-xs text-ash">Todavía no tenés una rutina asignada. Preguntale a tu profesor.</p>
          ) : (
            <div className="space-y-4">
              {memberRoutines.map((r) => {
                const days = resolveRoutineDays(r, templates)
                return (
                  <div key={r.id} className="rounded-xl border border-ink-500/60 bg-ink-700/30">
                    <div className="border-b border-ink-500/50 px-4 py-2.5">
                      <p className="text-sm font-bold text-snow">{resolveRoutineTitle(r, templates)}</p>
                    </div>
                    <div className="space-y-3 p-4">
                      {days.map((day, di) => (
                        <div key={di}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-silver">{day.dayName}</p>
                          <ul className="space-y-1">
                            {day.exercises.map((ex, ei) => (
                              <li key={ei} className="flex items-center justify-between gap-2 rounded-lg bg-ink-800 px-3 py-2 text-xs">
                                <span className="font-medium text-fog">{ex.name}</span>
                                <span className="flex shrink-0 items-center gap-3 text-silver">
                                  {ex.sets && <span>{ex.sets} series</span>}
                                  {ex.reps && <span>{ex.reps} reps</span>}
                                  {ex.weight && <span>{ex.weight}</span>}
                                  {ex.rest && <span className="text-ash">desc {ex.rest}</span>}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section icon={<Info size={14} />} title="Info del gimnasio">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ash">Horarios</p>
              <p className="mt-1 text-sm text-fog">{settings.openingHours || '—'}</p>
              <p className="mt-2 text-[11px] text-ash">{settings.address || ''}</p>
              <p className="text-[11px] text-ash">{settings.phone || ''}</p>
              <p className="text-[11px] text-ash">{settings.email || ''}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ash">Actividades</p>
              {settings.activities.length === 0 ? (
                <p className="mt-1 text-xs text-ash">Sin actividades cargadas.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {settings.activities.map((a) => (
                    <li key={a.id} className="text-sm text-fog">
                      {a.name}
                      <span className="block text-[11px] text-ash">{a.schedule}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ash">Feriados y no laborables</p>
              {holidaysThisMonth.length === 0 ? (
                <p className="mt-1 text-xs text-ash">No hay feriados este mes.</p>
              ) : (
                <ul className="mt-1 space-y-1.5">
                  {holidaysThisMonth.map((h) => (
                    <li key={h} className="text-sm text-warn">
                      {formatDate(h)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>

        <footer className="pb-6 pt-2 text-center">
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-ash">
            <CreditCard size={12} />
            Datos sincronizados en tiempo real con el panel del gimnasio.
          </p>
        </footer>
      </main>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-500/70 bg-ink-800 p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-semibold text-fog">
        <span className="text-silver">{icon}</span>
        {title}
      </p>
      {children}
    </section>
  )
}