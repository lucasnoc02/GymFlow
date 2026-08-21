import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, Dumbbell, Lock, ShieldCheck, User } from 'lucide-react'
import { useStore } from '../../store/store'
import { Button } from '../ui/primitives'
import { cn } from '../../lib/cn'

type Stage = 'role' | 'admin' | 'student'

export function LoginScreen() {
  const { settings } = useStore()
  const [stage, setStage] = useState<Stage>('role')

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-ink-900 p-6 text-fog">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-snow text-ink-900">
            <Dumbbell size={24} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-bold text-snow">{settings.gymName}</h1>
          <p className="mt-1 text-xs text-ash">Gestión y acceso de alumnos</p>
        </div>

        {stage === 'role' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleCard
              icon={<ShieldCheck size={22} />}
              title="Soy Gimnasio"
              subtitle="Administrador"
              description="Acceso total al panel: miembros, finanzas, asistencia, rutinas y configuración."
              onClick={() => setStage('admin')}
            />
            <RoleCard
              icon={<User size={22} />}
              title="Soy Alumno"
              subtitle="Acceso con código"
              description="Entrá con tu código personal para ver tu perfil, asistencia, rutina e info del gimnasio."
              onClick={() => setStage('student')}
            />
          </div>
        )}

        {stage === 'admin' && <AdminLogin onBack={() => setStage('role')} />}
        {stage === 'student' && <StudentLogin onBack={() => setStage('role')} />}
      </div>
    </div>
  )
}

function RoleCard({
  icon,
  title,
  subtitle,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-xl border border-ink-500 bg-ink-800 p-6 text-left transition-all hover:border-silver hover:bg-ink-700"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-700 text-silver transition-colors group-hover:bg-accent group-hover:text-accent-ink">
        {icon}
      </div>
      <div>
        <p className="text-base font-semibold text-fog">{title}</p>
        <p className="text-[11px] font-medium uppercase tracking-wider text-ash">{subtitle}</p>
      </div>
      <p className="text-xs leading-relaxed text-ash">{description}</p>
    </button>
  )
}

function AdminLogin({ onBack }: { onBack: () => void }) {
  const { loginAdmin } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!loginAdmin(username, password)) {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
      <BackButton onBack={onBack} />
      <div className="rounded-xl border border-ink-500 bg-ink-800 p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-fog">
          <Lock size={15} className="text-silver" />
          Acceso del gimnasio
        </p>
        <label className="block text-xs font-medium text-silver">
          Usuario / Correo
          <input
            id="admin-username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-fog placeholder:text-ash focus:border-silver focus:outline-none focus:ring-2 focus:ring-silver/30"
            placeholder="admin"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-silver">
          Contraseña
          <input
            id="admin-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink-500 bg-ink-900 px-3 py-2 text-sm text-fog placeholder:text-ash focus:border-silver focus:outline-none focus:ring-2 focus:ring-silver/30"
            placeholder="••••••••"
          />
        </label>
        {error && <p className="mt-3 text-xs text-debt">{error}</p>}
        <Button className="mt-4 w-full" disabled={!username || !password}>
          <Lock size={14} />
          Ingresar
        </Button>
        <p className="mt-3 text-center text-[11px] text-ash">
          Demo: usuario <span className="font-mono text-silver">admin</span> · contraseña{' '}
          <span className="font-mono text-silver">admin123</span> (podés cambiarlas en Configuración)
        </p>
      </div>
    </form>
  )
}

function StudentLogin({ onBack }: { onBack: () => void }) {
  const { loginStudent } = useStore()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!loginStudent(code)) {
      setError('No encontramos ningún alumno con ese código.')
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-4">
      <BackButton onBack={onBack} />
      <div className="rounded-xl border border-ink-500 bg-ink-800 p-6 text-center">
        <p className="text-sm font-semibold text-fog">Ingresá tu código personal de alumno</p>
        <p className="mt-1 text-xs text-ash">Código alfanumérico único de 6 caracteres</p>
        <input
          id="student-login-code"
          name="loginCode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          autoFocus
          placeholder="ABC123"
          className={cn(
            'mt-4 w-full rounded-lg border bg-ink-900 px-4 py-3 text-center font-mono text-xl uppercase tracking-[0.3em] text-snow placeholder:text-ash/50 focus:outline-none focus:ring-2',
            error ? 'border-debt focus:ring-debt/40' : 'border-ink-500 focus:border-silver focus:ring-silver/30',
          )}
        />
        {error && <p className="mt-3 text-xs text-debt">{error}</p>}
        <Button className="mt-4 w-full" disabled={code.length < 6}>
          <User size={14} />
          Ver mi perfil
        </Button>
        <p className="mt-3 text-[11px] text-ash">Pedile tu código al administrador del gimnasio.</p>
      </div>
    </form>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 text-xs font-medium text-silver transition-colors hover:text-fog"
    >
      <ArrowLeft size={13} />
      Volver
    </button>
  )
}