import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'success'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong focus-visible:ring-accent/60',
  ghost: 'bg-transparent text-silver hover:bg-ink-700 hover:text-fog',
  outline: 'border border-ink-500 bg-transparent text-fog hover:bg-ink-700',
  danger: 'bg-debt-muted text-debt hover:bg-debt/25 focus-visible:ring-debt/40',
  success: 'bg-ok-muted text-ok hover:bg-ok/20 focus-visible:ring-ok/40',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}

export type BadgeTone = 'neutral' | 'ok' | 'debt' | 'warn' | 'inactive'

interface BadgeProps {
  tone: BadgeTone
  children: ReactNode
  icon?: ReactNode
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-ink-700 text-silver border-ink-500',
  ok: 'bg-ok-muted text-ok border-ok/25',
  debt: 'bg-debt-muted text-debt border-debt/25',
  warn: 'bg-warn-muted text-warn border-warn/25',
  inactive: 'bg-ink-600/50 text-ash border-ink-500',
}

export function Badge({ tone, children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-xs font-medium text-silver">{label}</span>}
      {children}
      {error ? (
        <span className="text-[11px] text-debt">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-ash">{hint}</span>
      ) : null}
    </label>
  )
}

const controlBase =
  'w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-fog placeholder:text-ash transition-colors focus:border-silver focus:outline-none focus:ring-2 focus:ring-silver/30'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlBase, 'cursor-pointer', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'min-h-32 resize-y font-mono text-[13px]', className)} {...props} />
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={cn(
          'relative h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-ink-500',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full transition-all',
            checked ? 'left-[18px] bg-accent-ink' : 'left-0.5 bg-ink-900',
          )}
        />
      </span>
      {label && <span className="text-sm text-fog">{label}</span>}
    </button>
  )
}
