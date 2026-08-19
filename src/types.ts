export type MemberStatus = 'active' | 'inactive' | 'debtor'
export type PaymentStatus = 'paid' | 'pending' | 'overdue'
export type DiscountType = 'percent' | 'fixed'
export type InitialPaymentStatus = 'paid' | 'pending' | 'overdue'
export type SurchargeType = 'fixed' | 'percentage'

export interface Member {
  id: string
  fullName: string
  email: string
  phone: string
  dni: string
  loginCode: string
  planId: string
  startDate: string // ISO yyyy-mm-dd
  status: MemberStatus
  monthlyFee: number
  discount: number
  discountType: DiscountType
  finalPrice: number
  lastPaymentDate: string | null
  nextDueDate: string // ISO yyyy-mm-dd
  debtAmount: number
  surchargeAmount: number
  totalDue: number
  hasSurcharge: boolean
  paymentStatus: PaymentStatus
  notes: string
  createdAt: string
  attendanceHistory: string[] // fechas YYYY-MM-DD en las que asistió
}

export interface CalendarTask {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string
  notify: boolean
  completed: boolean
}

export interface AttendanceRecord {
  memberId: string
  date: string // YYYY-MM-DD
  timestamp: string
}

export interface Exercise {
  name: string
  sets: string
  reps: string
  weight: string
  rest: string
  notes: string
}

export interface RoutineDay {
  dayName: string
  exercises: Exercise[]
}

export type RoutineTemplateId =
  | 'hypertrophy'
  | 'strength'
  | 'fat-loss'
  | 'beginner'
  | 'custom'

// Plantilla general de entrenamiento (global, no ligada a un socio)
export interface RoutineTemplate {
  id: string
  title: string
  description: string
  days: RoutineDay[]
  createdAt: string
  updatedAt: string
}

export interface Routine {
  id: string
  memberId: string
  title: string
  daysPerWeek: number
  // Plantilla general a la que está vinculada (null si fue personalizada)
  templateId: string | null
  // true = copia independiente solo para este socio (desvinculada de la plantilla)
  isCustomized: boolean
  days: RoutineDay[]
  createdAt: string
  updatedAt: string
}

// Personalización de marca (logo + tema automático)
export interface GymBrandConfig {
  logoUrl?: string
  enableAutoTheme: boolean
  accentColor?: string
}

export interface LateFeeConfig {
  cutoffDay: number // Día de corte mensual, ej. 15
  surchargeType: SurchargeType // 'fixed' | 'percentage'
  surchargeValue: number // Monto fijo (ARS) o porcentaje
}

export interface GymPlan {
  id: string
  name: string
  price: number
}

export interface GymActivity {
  id: string
  name: string
  schedule: string
}

export interface GymAdminCredentials {
  username: string
  password: string
}

export interface Settings {
  gymName: string
  address: string
  phone: string
  email: string
  openingHours: string
  defaultMonthlyFee: number
  plans: GymPlan[]
  activities: GymActivity[]
  holidays: string[] // Fechas YYYY-MM-DD no laborables
  lateFee: LateFeeConfig
  brand: GymBrandConfig
  admin: GymAdminCredentials
}

export interface DB {
  members: Member[]
  routines: Routine[]
  templates: RoutineTemplate[]
  settings: Settings
  tasks: CalendarTask[]
  attendance: AttendanceRecord[]
}

export type ViewKey = 'dashboard' | 'members' | 'attendance' | 'calendar' | 'notifications' | 'import' | 'routines' | 'settings'

export interface ImportedRow {
  fullName: string
  email: string
  phone: string
  dni: string
  monthlyFee: number
  startDate: string
}
