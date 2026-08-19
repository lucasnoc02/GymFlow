import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: ReactNode }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border border-ink-500 bg-ink-800 p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors',
            active === tab.id ? 'bg-accent text-accent-ink' : 'text-silver hover:text-fog',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon && <div className="mb-1 text-ash">{icon}</div>}
      <p className="text-sm font-semibold text-fog">{title}</p>
      {description && <p className="max-w-sm text-xs text-ash">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
