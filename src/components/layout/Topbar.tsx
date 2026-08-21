import { RotateCcw, Search } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle?: string
  search?: string
  onSearch?: (v: string) => void
  onReset?: () => void
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, search, onSearch, onReset, actions }: TopbarProps) {
  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-500/70 bg-ink-850/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-lg font-bold text-snow">{title}</h1>
        <p className="text-xs capitalize text-ash">{subtitle ?? today}</p>
      </div>
      <div className="flex items-center gap-2">
        {onSearch && (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
            <input
              id="topbar-search-input"
              name="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar…"
              className="h-9 w-56 rounded-lg border border-ink-500 bg-ink-800 pl-9 pr-3 text-sm text-fog placeholder:text-ash focus:border-silver focus:outline-none focus:ring-2 focus:ring-silver/30"
            />
          </div>
        )}
        {onReset && (
          <button
            onClick={onReset}
            title="Restablecer datos de ejemplo"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-500 px-3 text-xs font-medium text-silver transition-colors hover:bg-ink-700 hover:text-fog"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
        {actions}
      </div>
    </header>
  )
}
