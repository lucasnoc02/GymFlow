import { Bell, CalendarDays, Dumbbell, LayoutDashboard, LogOut, Settings, Upload, UserCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import type { ViewKey } from '../../types'
import { useStore } from '../../store/store'
import { useToday } from '../../lib/dateContext'
import { computeNotifications } from '../../lib/notifications'
import { cn } from '../../lib/cn'

const NAV: { id: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'members', label: 'Miembros', icon: Users },
  { id: 'attendance', label: 'Control de asistencia', icon: UserCheck },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
  { id: 'routines', label: 'Rutinas', icon: Dumbbell },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'import', label: 'Importar datos', icon: Upload },
]

export function Sidebar({ view, onNavigate }: { view: ViewKey; onNavigate: (v: ViewKey) => void }) {
  const { members, tasks, logout } = useStore()
  const { todayISO } = useToday()

  const urgentCount = useMemo(
    () => computeNotifications(members, tasks, todayISO).filter((i) => i.urgent).length,
    [members, tasks, todayISO],
  )

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ink-500/70 bg-ink-850">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-snow text-ink-900">
          <LayoutDashboard size={18} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-snow">GymFlow</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-ash">Gestión</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 scrollbar-thin">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = view === item.id
          const count = item.id === 'notifications' ? urgentCount : 0
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-ink shadow-[inset_2px_0_0_0_var(--color-accent-strong)]'
                  : 'text-silver hover:bg-ink-700/60 hover:text-fog',
              )}
            >
              <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1 truncate text-left">{item.label}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-debt px-1.5 text-[10px] font-bold text-ink-900">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-ink-500/60 px-3 py-4">
        <p className="px-2 text-[11px] leading-relaxed text-ash">
          Los datos se guardan localmente en tu navegador.
        </p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-silver transition-colors hover:bg-debt-muted hover:text-debt"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}