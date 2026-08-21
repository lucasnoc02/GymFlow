import type {
  AttendanceRecord,
  CalendarTask,
  DB,
  GymActivity,
  Member,
  Routine,
  RoutineTemplate,
  Settings,
} from '../types'
import { supabase, isSupabaseConfigured } from './supabaseClient'

// ============================================================================
// Capa de sincronización con Supabase.
// La app mantiene un store local (UI + offline) y esta capa lo conecta con las
// tablas de la nube: pullFullState() hidrata al arrancar y pushFullState()
// replica cada cambio. La nube es la fuente de verdad persistente.
// ============================================================================

const PLAN_ID_MAP_KEY = 'gymflow-plan-idmap-v1'

// UUIDs estables para los planes por defecto (coinciden con el script SQL seed).
const DEFAULT_PLAN_UUIDS: Record<string, string> = {
  free: '11111111-1111-4111-8111-111111111111',
  '3x': '22222222-2222-4222-8222-222222222222',
  plus: '33333333-3333-4333-8333-333333333333',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Defaults usados al reconstruir settings desde la nube.
const DEFAULT_LATE_FEE = { cutoffDay: 15, surchargeType: 'fixed' as const, surchargeValue: 1500 }
const DEFAULT_BRAND = { enableAutoTheme: false }
const DEFAULT_ADMIN = { username: 'admin', password: 'admin123' }
const DEFAULT_ACTIVITIES: GymActivity[] = [
  { id: 'a1', name: 'Spinning', schedule: 'Lun, Mié y Vie 18:00 – 19:00' },
  { id: 'a2', name: 'Funcional', schedule: 'Mar y Jue 19:00 – 20:00' },
  { id: 'a3', name: 'Yoga', schedule: 'Sáb 10:00 – 11:00' },
]

function loadPlanMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PLAN_ID_MAP_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function savePlanMap(map: Record<string, string>) {
  try {
    localStorage.setItem(PLAN_ID_MAP_KEY, JSON.stringify(map))
  } catch {
    /* storage unavailable */
  }
}

// Resuelve el UUID de Supabase de un plan de la app.
// Idempotente: para ids que ya son UUID (traídos de la nube) devuelve el mismo
// y lo registra en el mapa para conservar la relación al re-sincronizar.
function resolvePlanUuid(appPlanId: string, map: Record<string, string>): string {
  const known = map[appPlanId]
  if (known) return known
  const fixed = DEFAULT_PLAN_UUIDS[appPlanId]
  if (fixed) {
    map[appPlanId] = fixed
    return fixed
  }
  if (UUID_RE.test(appPlanId)) {
    map[appPlanId] = appPlanId
    return appPlanId
  }
  const uuid = crypto.randomUUID()
  map[appPlanId] = uuid
  return uuid
}

// ----------------------------------------------------------------------------
// Transformaciones member <-> fila
// ----------------------------------------------------------------------------

function memberToRow(m: Member, planUuid: string | null): Record<string, unknown> {
  return {
    id: m.id,
    full_name: m.fullName,
    email: m.email,
    phone: m.phone,
    dni: m.dni,
    login_code: m.loginCode,
    plan_id: planUuid,
    start_date: m.startDate,
    status: m.status,
    monthly_fee: m.monthlyFee,
    discount: m.discount,
    discount_type: m.discountType,
    final_price: m.finalPrice,
    last_payment_date: m.lastPaymentDate,
    next_due_date: m.nextDueDate,
    debt_amount: m.debtAmount,
    surcharge_amount: m.surchargeAmount,
    total_due: m.totalDue,
    has_surcharge: m.hasSurcharge,
    payment_status: m.paymentStatus,
    notes: m.notes,
    attendance_history: m.attendanceHistory,
    created_at: m.createdAt,
  }
}

function rowToMember(r: Record<string, unknown>): Member {
  return {
    id: r.id as string,
    fullName: r.full_name as string,
    email: (r.email as string | null) ?? '',
    phone: (r.phone as string | null) ?? '',
    dni: (r.dni as string | null) ?? '',
    loginCode: r.login_code as string,
    planId: (r.plan_id as string | null) ?? 'free',
    startDate: r.start_date as string,
    status: r.status as Member['status'],
    monthlyFee: Number(r.monthly_fee ?? 0),
    discount: Number(r.discount ?? 0),
    discountType: (r.discount_type as Member['discountType']) ?? 'percent',
    finalPrice: Number(r.final_price ?? 0),
    lastPaymentDate: (r.last_payment_date as string | null) ?? null,
    nextDueDate: r.next_due_date as string,
    debtAmount: Number(r.debt_amount ?? 0),
    surchargeAmount: Number(r.surcharge_amount ?? 0),
    totalDue: Number(r.total_due ?? 0),
    hasSurcharge: Boolean(r.has_surcharge),
    paymentStatus: r.payment_status as Member['paymentStatus'],
    notes: (r.notes as string | null) ?? '',
    createdAt: r.created_at as string,
    attendanceHistory: Array.isArray(r.attendance_history) ? (r.attendance_history as string[]) : [],
  }
}

function rowToTemplate(r: Record<string, unknown>): RoutineTemplate {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string | null) ?? '',
    days: (r.days as RoutineTemplate['days']) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function rowToRoutine(r: Record<string, unknown>): Routine {
  return {
    id: r.id as string,
    memberId: r.member_id as string,
    title: r.title as string,
    daysPerWeek: Number(r.days_per_week ?? 3),
    templateId: (r.template_id as string | null) ?? null,
    isCustomized: Boolean(r.is_customized),
    days: (r.days as Routine['days']) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

// ----------------------------------------------------------------------------
// Borrado espejo: elimina en la nube las filas que ya no existen localmente.
// ----------------------------------------------------------------------------

async function deleteMissing(table: string, localKeys: string[], conflict?: [string, string]) {
  if (conflict) {
    const { data } = await supabase!.from(table).select(conflict.join(','))
    const remoteKeys = ((data ?? []) as any[]).map((row) => `${row[conflict[0]]}_${row[conflict[1]]}`)
    for (const key of remoteKeys) {
      if (!localKeys.includes(key)) {
        const [a, b] = key.split('_')
        await supabase!.from(table).delete().eq(conflict[0], a).eq(conflict[1], b)
      }
    }
    return
  }
  const { data } = await supabase!.from(table).select('id')
  const remoteIds = (data ?? []).map((row: Record<string, unknown>) => row.id as string)
  const toDelete = remoteIds.filter((id) => !localKeys.includes(id))
  if (toDelete.length > 0) {
    await supabase!.from(table).delete().in('id', toDelete)
  }
}

// ----------------------------------------------------------------------------
// PUSH · replica el estado completo local en las tablas de Supabase.
// ----------------------------------------------------------------------------

export async function pushFullState(db: DB): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const planMap = loadPlanMap()

    // 1) Planes (de settings.plans) -> tabla plans
    const planRows = db.settings.plans.map((p) => {
      const id = resolvePlanUuid(p.id, planMap)
      return { id, name: p.name, price: p.price }
    })
    savePlanMap(planMap)
    if (planRows.length > 0) {
      const { error } = await supabase.from('plans').upsert(planRows, { onConflict: 'id' })
      if (error) throw error
    }

    // 2) Socios -> members
    if (db.members.length > 0) {
      const planUuidOf = (appPlanId: string) => planMap[appPlanId] ?? null
      const rows = db.members.map((m) => memberToRow(m, planUuidOf(m.planId)))
      const { error } = await supabase.from('members').upsert(rows, { onConflict: 'id' })
      if (error) throw error
    }

    // 3) Asistencias -> attendances (una por socio y día)
    if (db.attendance.length > 0) {
      const rows = db.attendance.map((a) => ({ member_id: a.memberId, date: a.date, timestamp: a.timestamp }))
      const { error } = await supabase.from('attendances').upsert(rows, { onConflict: 'member_id,date' })
      if (error) throw error
    }

    // 4) Plantillas -> routine_templates
    if (db.templates.length > 0) {
      const rows = db.templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        days: t.days,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }))
      const { error } = await supabase.from('routine_templates').upsert(rows, { onConflict: 'id' })
      if (error) throw error
    }

    // 5) Rutinas -> routines
    if (db.routines.length > 0) {
      const rows = db.routines.map((r) => ({
        id: r.id,
        member_id: r.memberId,
        title: r.title,
        days_per_week: r.daysPerWeek,
        template_id: r.templateId,
        is_customized: r.isCustomized,
        days: r.days,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
      const { error } = await supabase.from('routines').upsert(rows, { onConflict: 'id' })
      if (error) throw error
    }

    // 6) Recordatorios -> calendar_events
    if (db.tasks.length > 0) {
      const rows = db.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        time: t.time ?? null,
        notify: t.notify,
        completed: t.completed,
      }))
      const { error } = await supabase.from('calendar_events').upsert(rows, { onConflict: 'id' })
      if (error) throw error
    }

    // 7) Configuración general -> gym_settings (fila única id = 1)
    const { error: settingsError } = await supabase
      .from('gym_settings')
      .upsert(
        {
          id: 1,
          gym_name: db.settings.gymName,
          address: db.settings.address,
          phone: db.settings.phone,
          email: db.settings.email,
          opening_hours: db.settings.openingHours,
          default_monthly_fee: db.settings.defaultMonthlyFee,
          activities: db.settings.activities,
          holidays: db.settings.holidays,
          late_fee: db.settings.lateFee,
          brand: db.settings.brand,
          admin: db.settings.admin,
        },
        { onConflict: 'id' },
      )
    if (settingsError) throw settingsError

    // 8) Espejo de borrados locales en la nube
    await deleteMissing('members', db.members.map((m) => m.id))
    await deleteMissing('routine_templates', db.templates.map((t) => t.id))
    await deleteMissing('routines', db.routines.map((r) => r.id))
    await deleteMissing('calendar_events', db.tasks.map((t) => t.id))
    await deleteMissing(
      'attendances',
      db.attendance.map((a) => `${a.memberId}_${a.date}`),
      ['member_id', 'date'],
    )
    // Nota: los planes no se borran para no romper FKs de members.plan_id.

    return true
  } catch (err) {
    console.error('[GymFlow] Fallo al sincronizar con Supabase:', err)
    return false
  }
}

// ----------------------------------------------------------------------------
// PULL · lee el estado completo desde Supabase y lo reconstruye como DB local.
// ----------------------------------------------------------------------------

export async function pullFullState(): Promise<DB | null> {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const [plansRes, membersRes, attendanceRes, templatesRes, routinesRes, tasksRes, settingsRes] =
      await Promise.all([
        supabase.from('plans').select('*'),
        supabase.from('members').select('*'),
        supabase.from('attendances').select('*'),
        supabase.from('routine_templates').select('*'),
        supabase.from('routines').select('*'),
        supabase.from('calendar_events').select('*'),
        supabase.from('gym_settings').select('*').eq('id', 1).maybeSingle(),
      ])

    for (const res of [plansRes, membersRes, attendanceRes, templatesRes, routinesRes, tasksRes, settingsRes]) {
      if (res.error) throw res.error
    }

    const settings = settingsRes.data as Record<string, unknown> | null

    const settingsPlans = (plansRes.data ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      name: p.name as string,
      price: Number(p.price ?? 0),
    }))

    const rebuilt: Settings = {
      gymName: (settings?.gym_name as string | null) ?? 'GymFlow',
      address: (settings?.address as string | null) ?? '',
      phone: (settings?.phone as string | null) ?? '',
      email: (settings?.email as string | null) ?? '',
      openingHours: (settings?.opening_hours as string | null) ?? '',
      defaultMonthlyFee: Number(settings?.default_monthly_fee ?? 30000),
      plans: settingsPlans.length > 0 ? settingsPlans : [],
      activities: (settings?.activities as Settings['activities']) ?? DEFAULT_ACTIVITIES,
      holidays: (settings?.holidays as Settings['holidays']) ?? [],
      lateFee: (settings?.late_fee as Settings['lateFee']) ?? DEFAULT_LATE_FEE,
      brand: (settings?.brand as Settings['brand']) ?? DEFAULT_BRAND,
      admin: (settings?.admin as Settings['admin']) ?? DEFAULT_ADMIN,
    }

    const attendance: AttendanceRecord[] = (attendanceRes.data ?? []).map(
      (a: Record<string, unknown>) => ({
        memberId: a.member_id as string,
        date: a.date as string,
        timestamp: a.timestamp as string,
      }),
    )

    const tasks: CalendarTask[] = (tasksRes.data ?? []).map((t: Record<string, unknown>) => ({
      id: t.id as string,
      title: t.title as string,
      date: t.date as string,
      time: (t.time as string | null) ?? undefined,
      notify: Boolean(t.notify),
      completed: Boolean(t.completed),
    }))

    return {
      members: (membersRes.data ?? []).map((r: Record<string, unknown>) => rowToMember(r)),
      routines: (routinesRes.data ?? []).map((r: Record<string, unknown>) => rowToRoutine(r)),
      templates: (templatesRes.data ?? []).map((r: Record<string, unknown>) => rowToTemplate(r)),
      settings: rebuilt,
      tasks,
      attendance,
    }
  } catch (err) {
    console.error('[GymFlow] Fallo al leer de Supabase:', err)
    return null
  }
}