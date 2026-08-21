import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Clock, LogIn, Search, UserRoundCheck } from 'lucide-react'
import { useStore } from '../../store/store'
import { useToday } from '../../lib/dateContext'
import { Badge, Button } from '../ui/primitives'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Topbar } from '../layout/Topbar'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/dates'
import { MemberStatusBadge } from '../members/MembersPage'

export function AttendancePage() {
  const { members, recordAttendance, resetData } = useStore()
  const { todayISO } = useToday()
  const [query, setQuery] = useState('')
  const [feedback, setFeedback] = useState<{ memberId: string; name: string; already: boolean } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members.slice(0, 6)
    return members
      .filter((m) => `${m.fullName} ${m.dni}`.toLowerCase().includes(q))
      .slice(0, 6)
  }, [members, query])

  const checkIn = (id: string) => {
    const m = members.find((x) => x.id === id)
    if (!m) return
    const created = recordAttendance(id)
    setFeedback({ memberId: id, name: m.fullName, already: !created })
    setSelectedId(id)
    setQuery('')
    setTimeout(() => setFeedback(null), 4000)
  }

  const attendedToday = (id: string) => members.find((m) => m.id === id)?.attendanceHistory.includes(todayISO) ?? false

  const todayEntries = members
    .filter((m) => m.attendanceHistory.includes(todayISO))
    .map((m) => {
      const rec = m.attendanceHistory.find((d) => d === todayISO)
      return { member: m, rec }
    })
    .sort((a, b) => (a.member.fullName < b.member.fullName ? -1 : 1))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar title="Control de asistencia" subtitle="Modo kiosco · registrá el ingreso de cada alumno" onReset={resetData} />

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card className={cn('transition-colors', feedback && 'border-ok/40 bg-ok-muted/20')}>
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-fog">
                  <LogIn size={16} className="text-silver" />
                  Registro de ingreso
                </div>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
                  <input
                    id="attendance-search-query"
                    name="searchQuery"
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && results.length > 0) checkIn(results[0].id)
                    }}
                    placeholder="Escribí el nombre o DNI del alumno…"
                    className="h-12 w-full rounded-xl border border-ink-500 bg-ink-800 pl-10 pr-4 text-sm text-fog placeholder:text-ash focus:border-snow focus:outline-none focus:ring-2 focus:ring-snow/20"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  {results.length === 0 ? (
                    <p className="py-4 text-center text-xs text-ash">
                      No se encontraron alumnos con «{query}». Verificá el nombre o agregá el socio en Miembros.
                    </p>
                  ) : (
                    results.map((m) => {
                      const done = attendedToday(m.id)
                      const active = selectedId === m.id
                      return (
                        <button
                          key={m.id}
                          onClick={() => checkIn(m.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                            done
                              ? 'border-ok/25 bg-ok-muted/15'
                              : 'border-ink-500/60 bg-ink-800 hover:border-silver hover:bg-ink-700',
                            active && feedback && 'ring-1 ring-ok/50',
                          )}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-500 bg-ink-700 text-xs font-bold text-fog">
                            {m.fullName
                              .split(' ')
                              .map((p) => p[0])
                              .filter(Boolean)
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-fog">{m.fullName}</p>
                            <p className="text-xs text-ash">
                              {m.dni || 'Sin DNI'} · {formatCurrency(m.finalPrice)}/mes
                            </p>
                          </div>
                          <MemberStatusBadge member={m} compact />
                          {done ? (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ok">
                              <CheckCircle2 size={15} />
                              Ingresó hoy
                            </span>
                          ) : (
                            <Button size="sm" variant="outline" className="shrink-0">
                              <LogIn size={13} />
                              Registrar
                            </Button>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>

                {feedback && (
                  <div className="flex items-center gap-3 rounded-xl border border-ok/40 bg-ok-muted px-4 py-3 animate-[modalIn_.2s_ease-out]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ok text-ok-ink">
                      <UserRoundCheck size={17} />
                    </div>
                    <p className="text-sm text-fog">
                      {feedback.already ? (
                        <>
                          <strong className="text-snow">{feedback.name}</strong> ya tenía su ingreso registrado hoy.
                        </>
                      ) : (
                        <>
                          ¡Ingreso registrado para <strong className="text-snow">{feedback.name}</strong>!
                        </>
                      )}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader
              title="Ingresos de hoy"
              subtitle={`${todayEntries.length} alumno${todayEntries.length === 1 ? '' : 's'} presente${todayEntries.length === 1 ? '' : 's'}`}
            />
            <CardBody>
              {todayEntries.length === 0 ? (
                <p className="py-6 text-center text-xs text-ash">Todavía no se registraron ingresos hoy.</p>
              ) : (
                <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                  {todayEntries.map(({ member }) => (
                    <li key={member.id} className="flex items-center gap-3 rounded-lg border border-ink-500/50 bg-ink-700/40 px-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ok-muted text-ok">
                        <CheckCircle2 size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fog">{member.fullName}</p>
                        <p className="text-[11px] text-ash">{member.dni || 'Sin DNI'}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-silver">
                        <Clock size={11} />
                        Hoy
                      </span>
                      <Badge tone="ok">Presente</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}