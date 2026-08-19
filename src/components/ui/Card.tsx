import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-ink-500/70 bg-ink-800 shadow-[0_4px_24px_rgba(0,0,0,0.35)]', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-500/60 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-fog">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-ash">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}
