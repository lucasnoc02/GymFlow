import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { queueAttendance } from '../lib/sync'
import type {
  AttendanceRecord,
  CalendarTask,
  DB,
  GymAdminCredentials,
  GymBrandConfig,
  GymPlan,
  ImportedRow,
  InitialPaymentStatus,
  LateFeeConfig,
  Member,
  Routine,
  RoutineDay,
  RoutineTemplate,
  Settings,
} from '../types'
import { addMonths, uid } from '../lib/dates'
import { normalizeMember } from '../lib/memberStatus'
import { useToday } from '../lib/dateContext'
import { ensureUniqueCode } from '../lib/codes'
import { seedDB } from '../data/mock'
import { pullFullState, pushFullState } from '../lib/supabaseSync'
import { isSupabaseConfigured } from '../lib/supabaseClient'

const STORAGE_KEY = 'gymflow-db-v1'
const SESSION_KEY = 'gymflow-session-v1'

const DEFAULT_LATE_FEE: LateFeeConfig = { cutoffDay: 15, surchargeType: 'fixed', surchargeValue: 1500 }
const DEFAULT_BRAND: GymBrandConfig = { enableAutoTheme: false }
const DEFAULT_ADMIN: GymAdminCredentials = { username: 'admin', password: 'admin123' }
const DEFAULT_PLANS: GymPlan[] = [
  { id: 'free', name: 'Pase Libre', price: 30000 },
  { id: '3x', name: '3 veces por semana', price: 38000 },
  { id: 'plus', name: 'Musculación + Pase de Clases', price: 45000 },
]
const DEFAULT_ACTIVITIES: { id: string; name: string; schedule: string }[] = [
  { id: 'a1', name: 'Spinning', schedule: 'Lun, Mié y Vie 18:00 – 19:00' },
  { id: 'a2', name: 'Funcional', schedule: 'Mar y Jue 19:00 – 20:00' },
  { id: 'a3', name: 'Yoga', schedule: 'Sáb 10:00 – 11:00' },
]

type SessionState = 'admin' | 'student' | null

interface PersistedSession {
  role: 'admin' | 'student'
  memberId?: string
}

function cloneDays(days: RoutineDay[]): RoutineDay[] {
  return days.map((d) => ({ dayName: d.dayName, exercises: d.exercises.map((e) => ({ ...e })) }))
}

function migrateMemberCodes(members: Member[]): Member[] {
  const used = new Set(members.map((m) => m.loginCode).filter(Boolean))
  return members.map((m) => {
    if (!m.loginCode) {
      const code = ensureUniqueCode([...used])
      used.add(code)
      return { ...m, loginCode: code, planId: m.planId ?? 'free' }
    }
    return { ...m, planId: m.planId ?? 'free' }
  })
}

function migrateSettings(s: Partial<Settings> | undefined): Settings {
  return {
    gymName: s?.gymName ?? 'GymFlow',
    address: s?.address ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    openingHours: s?.openingHours ?? 'Lun a Vie 08:00 – 22:00 · Sáb 09:00 – 14:00',
    defaultMonthlyFee: s?.defaultMonthlyFee ?? 30000,
    plans: s?.plans ?? DEFAULT_PLANS,
    activities: s?.activities ?? DEFAULT_ACTIVITIES,
    holidays: s?.holidays ?? [],
    lateFee: s?.lateFee ?? DEFAULT_LATE_FEE,
    brand: s?.brand ?? DEFAULT_BRAND,
    admin: s?.admin ?? DEFAULT_ADMIN,
  }
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DB
      if (parsed && Array.isArray(parsed.members)) {
        // Migración: versiones previas sin estas colecciones / config
        if (!Array.isArray(parsed.tasks)) parsed.tasks = []
        if (!Array.isArray(parsed.attendance)) parsed.attendance = []
        if (!Array.isArray(parsed.templates)) parsed.templates = []
        parsed.settings = migrateSettings(parsed.settings)
        parsed.members = migrateMemberCodes(parsed.members)
        return parsed
      }
    }
  } catch {
    /* fall through to seed */
  }
  return seedDB()
}

function loadSession(): { role: SessionState; memberId: string | null } {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedSession
      return { role: parsed.role, memberId: parsed.memberId ?? null }
    }
  } catch {
    /* no session */
  }
  return { role: null, memberId: null }
}

function persist(db: DB) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* storage unavailable */
  }
}

function computeFinalPrice(monthlyFee: number, discount: number, discountType: Member['discountType']) {
  if (discountType === 'percent') {
    return Math.max(0, Math.round((monthlyFee * (100 - discount)) / 100))
  }
  return Math.max(0, Math.round(monthlyFee - discount))
}

interface Store {
  db: DB
  members: Member[]
  routines: Routine[]
  templates: RoutineTemplate[]
  settings: Settings
  tasks: CalendarTask[]
  attendance: AttendanceRecord[]
  addMember: (data: Partial<Member> & { initialPaymentStatus?: InitialPaymentStatus }) => Member
  updateMember: (id: string, patch: Partial<Member>) => void
  deleteMember: (id: string) => void
  registerPayment: (id: string, opts?: { amount?: number; date?: string }) => void
  applyDiscount: (id: string, discount: number, discountType: Member['discountType']) => void
  updateLateFee: (config: LateFeeConfig) => void
  updateBrand: (patch: Partial<GymBrandConfig>) => void
  updateGymSettings: (patch: Partial<Settings>) => void
  session: SessionState
  sessionMemberId: string | null
  loginAdmin: (username: string, password: string) => boolean
  loginStudent: (code: string) => boolean
  logout: () => void
  regenerateLoginCode: (id: string) => void
  bulkImport: (rows: ImportedRow[]) => number
  addTask: (task: Omit<CalendarTask, 'id'>) => CalendarTask
  updateTask: (id: string, patch: Partial<CalendarTask>) => void
  deleteTask: (id: string) => void
  recordAttendance: (id: string) => boolean
  addRoutine: (routine: Routine) => void
  updateRoutine: (id: string, patch: Partial<Routine>) => void
  deleteRoutine: (id: string) => void
  saveRoutineEdits: (id: string, patch: { title: string; daysPerWeek: number; days: RoutineDay[] }) => void
  addTemplate: (data: { title: string; description: string; days: RoutineDay[] }) => RoutineTemplate
  updateTemplate: (id: string, patch: Partial<RoutineTemplate>) => void
  deleteTemplate: (id: string) => void
  assignTemplate: (templateId: string, memberIds: string[]) => number
  resetData: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { todayISO } = useToday()
  const [db, setDb] = useState<DB>(() => loadDB())
  const [session, setSession] = useState<SessionState>(() => loadSession().role)
  const [sessionMemberId, setSessionMemberId] = useState<string | null>(() => loadSession().memberId)

  // True una vez que la nube (o la falta de credenciales) fue resuelta.
  // Evita que el primer push local sobreescriba datos remotos antes de hidratar.
  const [cloudReady, setCloudReady] = useState(false)

  useEffect(() => {
    persist(db)
  }, [db])

  // Hidratación inicial: la nube es la fuente de verdad. Si tiene datos, reemplaza
  // el estado local; si está vacía, empuja el estado local (seed) una sola vez.
  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (!isSupabaseConfigured) {
        setCloudReady(true)
        return
      }
      const remote = await pullFullState()
      if (cancelled) return
      if (remote) {
        const hasData =
          remote.members.length > 0 || remote.tasks.length > 0 || remote.templates.length > 0
        if (hasData) {
          const migrated: DB = {
            ...remote,
            settings: migrateSettings(remote.settings),
            members: migrateMemberCodes(remote.members),
          }
          setDb(migrated)
          setCloudReady(true)
          return
        }
      }
      await pushFullState(db)
      setCloudReady(true)
    }
    hydrate()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Replica cada cambio del store en Supabase (debounced para agrupar ráfagas).
  useEffect(() => {
    if (!cloudReady) return
    const t = setTimeout(() => {
      pushFullState(db)
    }, 500)
    return () => clearTimeout(t)
  }, [db, cloudReady])

  useEffect(() => {
    try {
      if (session === 'student') {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'student', memberId: sessionMemberId ?? undefined } satisfies PersistedSession))
      } else if (session === 'admin') {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'admin' } satisfies PersistedSession))
      } else {
        localStorage.removeItem(SESSION_KEY)
      }
    } catch {
      /* storage unavailable */
    }
  }, [session, sessionMemberId])

  const value = useMemo<Store>(() => {
    const historyMap = new Map<string, string[]>()
    for (const rec of db.attendance) {
      const list = historyMap.get(rec.memberId) ?? []
      if (!list.includes(rec.date)) list.push(rec.date)
      historyMap.set(rec.memberId, list)
    }
    const members = db.members.map((m) =>
      normalizeMember({ ...m, attendanceHistory: historyMap.get(m.id) ?? [] }, db.settings.lateFee, todayISO),
    )

    return {
      db,
      members,
      routines: db.routines,
      templates: db.templates,
      settings: db.settings,
      tasks: db.tasks,
      attendance: db.attendance,
      session,
      sessionMemberId,

      addMember(data) {
        const monthlyFee = data.monthlyFee ?? db.settings.defaultMonthlyFee
        const discount = data.discount ?? 0
        const discountType = data.discountType ?? 'percent'
        const finalPrice = computeFinalPrice(monthlyFee, discount, discountType)
        const initial = data.initialPaymentStatus ?? 'pending'
        let lastPaymentDate: string | null = null
        let nextDueDate: string
        if (initial === 'paid') {
          lastPaymentDate = todayISO
          nextDueDate = addMonths(todayISO, 1)
        } else if (initial === 'pending') {
          nextDueDate = addMonths(todayISO, 1)
          lastPaymentDate = null
        } else {
          nextDueDate = addMonths(todayISO, -1)
          lastPaymentDate = null
        }
        const member: Member = {
          id: uid(),
          fullName: data.fullName ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          dni: data.dni ?? '',
          loginCode: ensureUniqueCode(db.members.map((m) => m.loginCode)),
          planId: data.planId ?? 'free',
          startDate: data.startDate ?? todayISO,
          status: initial === 'overdue' ? 'debtor' : 'active',
          monthlyFee,
          discount,
          discountType,
          finalPrice,
          lastPaymentDate,
          nextDueDate,
          debtAmount: 0,
          surchargeAmount: 0,
          totalDue: 0,
          hasSurcharge: false,
          paymentStatus: initial,
          notes: data.notes ?? '',
          createdAt: new Date().toISOString(),
          attendanceHistory: [],
        }
        setDb((prev) => ({ ...prev, members: [...prev.members, member] }))
        return member
      },

      updateMember(id, patch) {
        setDb((prev) => ({
          ...prev,
          members: prev.members.map((m) => {
            if (m.id !== id) return m
            const merged = { ...m, ...patch }
            if (patch.monthlyFee !== undefined || patch.discount !== undefined || patch.discountType !== undefined) {
              const fee = patch.monthlyFee ?? m.monthlyFee
              const disc = patch.discount ?? m.discount
              const dType = patch.discountType ?? m.discountType
              merged.finalPrice = computeFinalPrice(fee, disc, dType)
            }
            return merged
          }),
        }))
      },

      deleteMember(id) {
        setDb((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.id !== id),
          routines: prev.routines.filter((r) => r.memberId !== id),
        }))
      },

      registerPayment(id, opts = {}) {
        setDb((prev) => ({
          ...prev,
          members: prev.members.map((m) => {
            if (m.id !== id) return m
            const date = opts.date ?? todayISO
            const nextDueDate = addMonths(date, 1)
            return {
              ...m,
              lastPaymentDate: date,
              nextDueDate,
              debtAmount: 0,
              paymentStatus: 'paid',
              status: 'active',
            }
          }),
        }))
      },

      applyDiscount(id, discount, discountType) {
        setDb((prev) => ({
          ...prev,
          members: prev.members.map((m) => {
            if (m.id !== id) return m
            const finalPrice = computeFinalPrice(m.monthlyFee, discount, discountType)
            return { ...m, discount, discountType, finalPrice }
          }),
        }))
      },

      updateLateFee(config) {
        setDb((prev) => ({ ...prev, settings: { ...prev.settings, lateFee: config } }))
      },

      updateBrand(patch) {
        setDb((prev) => ({
          ...prev,
          settings: { ...prev.settings, brand: { ...prev.settings.brand, ...patch } },
        }))
      },

      updateGymSettings(patch) {
        setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
      },

      loginAdmin(username, password) {
        if (db.settings.admin.username === username.trim() && db.settings.admin.password === password) {
          setSession('admin')
          setSessionMemberId(null)
          return true
        }
        return false
      },

      loginStudent(code) {
        const normalized = code.trim().toUpperCase()
        const member = db.members.find((m) => m.loginCode.toUpperCase() === normalized)
        if (!member) return false
        setSession('student')
        setSessionMemberId(member.id)
        return true
      },

      logout() {
        setSession(null)
        setSessionMemberId(null)
      },

      regenerateLoginCode(id) {
        setDb((prev) => {
          const used = prev.members.filter((m) => m.id !== id).map((m) => m.loginCode)
          const code = ensureUniqueCode(used)
          return {
            ...prev,
            members: prev.members.map((m) => (m.id === id ? { ...m, loginCode: code } : m)),
          }
        })
      },

      bulkImport(rows) {
        const now = todayISO
        const usedCodes = new Set(db.members.map((m) => m.loginCode))
        const newMembers: Member[] = rows.map((row) => {
          const startDate = row.startDate || now
          const code = ensureUniqueCode([...usedCodes])
          usedCodes.add(code)
          return {
            id: uid(),
            fullName: row.fullName,
            email: row.email,
            phone: row.phone,
            dni: row.dni,
            loginCode: code,
            planId: 'free',
            startDate,
            status: 'active',
            monthlyFee: row.monthlyFee,
            discount: 0,
            discountType: 'percent' as const,
            finalPrice: row.monthlyFee,
            lastPaymentDate: null,
            nextDueDate: addMonths(startDate, 1),
            debtAmount: 0,
            surchargeAmount: 0,
            totalDue: 0,
            hasSurcharge: false,
            paymentStatus: 'pending',
            notes: '',
            createdAt: new Date().toISOString(),
            attendanceHistory: [],
          }
        })
        setDb((prev) => ({ ...prev, members: [...prev.members, ...newMembers] }))
        return newMembers.length
      },

      addTask(task) {
        const created: CalendarTask = { id: uid(), ...task }
        setDb((prev) => ({ ...prev, tasks: [...prev.tasks, created] }))
        return created
      },

      updateTask(id, patch) {
        setDb((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }))
      },

      deleteTask(id) {
        setDb((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }))
      },

      recordAttendance(id) {
        const date = todayISO
        if (db.attendance.some((a) => a.memberId === id && a.date === date)) return false
        const record: AttendanceRecord = { memberId: id, date, timestamp: new Date().toISOString() }
        setDb((prev) => {
          if (prev.attendance.some((a) => a.memberId === id && a.date === date)) return prev
          return { ...prev, attendance: [...prev.attendance, record] }
        })
        // Sin conexión: la asistencia queda en la cola local y se sincroniza
        // automáticamente al recuperar la conexión (ver lib/sync.ts).
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          queueAttendance(record)
        }
        return true
      },

      addRoutine(routine) {
        setDb((prev) => ({ ...prev, routines: [...prev.routines, routine] }))
      },

      updateRoutine(id, patch) {
        setDb((prev) => ({
          ...prev,
          routines: prev.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }))
      },

      // Guarda ediciones hechas desde el perfil de un socio.
      // Si la rutina estaba vinculada a una plantilla, la desvincula
      // automáticamente conservando una copia independiente (isCustomized).
      saveRoutineEdits(id, patch) {
        const now = new Date().toISOString()
        setDb((prev) => ({
          ...prev,
          routines: prev.routines.map((r) => {
            if (r.id !== id) return r
            if (!r.isCustomized) {
              return {
                ...r,
                ...patch,
                templateId: null,
                isCustomized: true,
                updatedAt: now,
              }
            }
            return { ...r, ...patch, updatedAt: now }
          }),
        }))
      },

      deleteRoutine(id) {
        setDb((prev) => ({ ...prev, routines: prev.routines.filter((r) => r.id !== id) }))
      },

      addTemplate(data) {
        const created: RoutineTemplate = {
          id: uid(),
          title: data.title,
          description: data.description,
          days: data.days,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setDb((prev) => ({ ...prev, templates: [...prev.templates, created] }))
        return created
      },

      updateTemplate(id, patch) {
        setDb((prev) => ({
          ...prev,
          templates: prev.templates.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
          ),
        }))
      },

      deleteTemplate(id) {
        setDb((prev) => {
          const template = prev.templates.find((t) => t.id === id)
          const now = new Date().toISOString()
          // Desvincula a los socios que la usaban conservando una copia
          // completa e independiente para evitar pérdida de información.
          const routines = template
            ? prev.routines.map((r) =>
                r.templateId === id && !r.isCustomized
                  ? {
                      ...r,
                      days: cloneDays(template.days),
                      daysPerWeek: template.days.length,
                      templateId: null,
                      isCustomized: true,
                      updatedAt: now,
                    }
                  : r,
              )
            : prev.routines
          return { ...prev, routines, templates: prev.templates.filter((t) => t.id !== id) }
        })
      },

      assignTemplate(templateId, memberIds) {
        const template = db.templates.find((t) => t.id === templateId)
        if (!template) return 0
        const now = new Date().toISOString()
        const hasLinked = new Set(
          db.routines.filter((r) => !r.isCustomized).map((r) => r.memberId),
        )
        let created = 0
        const routines = [...db.routines]
        for (const memberId of memberIds) {
          const existing = routines.find((r) => r.memberId === memberId && !r.isCustomized)
          if (existing) {
            const i = routines.indexOf(existing)
            routines[i] = {
              ...existing,
              templateId: template.id,
              title: template.title,
              daysPerWeek: template.days.length,
              days: [],
              isCustomized: false,
              updatedAt: now,
            }
          } else {
            routines.push({
              id: uid(),
              memberId,
              title: template.title,
              daysPerWeek: template.days.length,
              templateId: template.id,
              isCustomized: false,
              days: [],
              createdAt: now,
              updatedAt: now,
            })
            created += 1
          }
        }
        if (created > 0 || memberIds.some((id) => hasLinked.has(id))) {
          setDb((prev) => ({ ...prev, routines }))
        }
        return created
      },

      resetData() {
        setDb(seedDB())
      },
    }
  }, [db, todayISO, session, sessionMemberId])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
