import type { AttendanceRecord, CalendarTask, DB, Routine, RoutineTemplate, RoutineTemplateId, RoutineDay } from '../types'
import { addDays, todayISO, toISO } from '../lib/dates'

const day = (n: number) => toISO(new Date(Date.now() - n * 86400000))

function currentMonthDay(d: number): string {
  const now = new Date()
  return toISO(new Date(now.getFullYear(), now.getMonth(), d))
}

function inCurrentMonth(): string[] {
  const now = new Date()
  return [4, 6, 11, 13, 18, 20, 25, 27]
    .filter((d) => d < now.getDate())
    .map(currentMonthDay)
}

function buildSeedAttendance(): AttendanceRecord[] {
  const plan = [
    { id: 'm1', extra: 0 },
    { id: 'm2', extra: 1 },
    { id: 'm3', extra: 2 },
    { id: 'm6', extra: 0 },
  ] as const
  const recs: AttendanceRecord[] = []
  for (const p of plan) {
    for (let i = 0; i < inCurrentMonth().length; i += 2 + p.extra) {
      recs.push({ memberId: p.id, date: inCurrentMonth()[i], timestamp: new Date().toISOString() })
    }
  }
  return recs
}

function buildSeedTasks(): CalendarTask[] {
  const now = new Date()
  const inDays = (n: number) => toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n))
  return [
    { id: 't1', title: 'Pagar alquiler del local', date: inDays(5), time: '10:00', notify: true, completed: false },
    { id: 't2', title: 'Renovar seguro de máquinas', date: inDays(-2), time: '09:00', notify: true, completed: false },
    { id: 't3', title: 'Limpieza profunda del salón', date: inDays(12), time: '20:00', notify: true, completed: false },
    { id: 't4', title: 'Revisar factura de luz', date: inDays(1), time: '12:30', notify: false, completed: false },
    { id: 't5', title: 'Compra de suplementos', date: inDays(0), time: '18:00', notify: true, completed: false },
    { id: 't6', title: 'Pago a instructores', date: inDays(8), time: '11:00', notify: true, completed: true },
    { id: 't7', title: 'Clase de spinning de prueba', date: inDays(3), time: '17:00', notify: true, completed: false },
  ]
}

export function buildRoutineDays(template: RoutineTemplateId): RoutineDay[] {
  switch (template) {
    case 'hypertrophy':
      return [
        {
          dayName: 'Lunes · Pecho y Tríceps',
          exercises: [
            { name: 'Press de banca con barra', sets: '4', reps: '8-10', weight: '70 kg', rest: '90s', notes: 'Rango completo' },
            { name: 'Press inclinado con mancuernas', sets: '3', reps: '10-12', weight: '25 kg', rest: '75s', notes: '' },
            { name: 'Aperturas con mancuernas', sets: '3', reps: '12', weight: '15 kg', rest: '60s', notes: 'Concéntrica lenta' },
            { name: 'Extensión de tríceps en polea', sets: '3', reps: '12-15', weight: '35 kg', rest: '60s', notes: '' },
            { name: 'Fondos en paralelas', sets: '3', reps: 'Fall + 2', weight: 'Peso corporal', rest: '75s', notes: '' },
          ],
        },
        {
          dayName: 'Miércoles · Espalda y Bíceps',
          exercises: [
            { name: 'Dominadas (o jalón al pecho)', sets: '4', reps: '8-10', weight: 'Peso corporal', rest: '90s', notes: 'Supinadas si puedes' },
            { name: 'Remo con barra', sets: '4', reps: '8-10', weight: '60 kg', rest: '90s', notes: 'Torso a 45°' },
            { name: 'Remo en polea baja', sets: '3', reps: '12', weight: '50 kg', rest: '60s', notes: '' },
            { name: 'Curl con barra', sets: '3', reps: '10-12', weight: '30 kg', rest: '60s', notes: '' },
            { name: 'Curl martillo con mancuernas', sets: '3', reps: '12-15', weight: '12 kg', rest: '60s', notes: '' },
          ],
        },
        {
          dayName: 'Viernes · Pierna y Hombro',
          exercises: [
            { name: 'Sentadilla con barra', sets: '4', reps: '8-10', weight: '80 kg', rest: '120s', notes: 'Bajar controlado' },
            { name: 'Prensa de piernas', sets: '4', reps: '10-12', weight: '160 kg', rest: '90s', notes: '' },
            { name: 'Peso muerto rumano', sets: '3', reps: '10', weight: '60 kg', rest: '90s', notes: 'Espalda neutra' },
            { name: 'Press militar', sets: '3', reps: '8-10', weight: '40 kg', rest: '90s', notes: '' },
            { name: 'Elevaciones laterales', sets: '3', reps: '15', weight: '10 kg', rest: '45s', notes: '' },
          ],
        },
      ]
    case 'strength':
      return [
        {
          dayName: 'Día A · Fuerza básica',
          exercises: [
            { name: 'Sentadilla con barra', sets: '5', reps: '5', weight: '100 kg', rest: '180s', notes: 'Trabajo principal' },
            { name: 'Press de banca', sets: '5', reps: '5', weight: '80 kg', rest: '180s', notes: '' },
            { name: 'Remo pendlay', sets: '4', reps: '5-6', weight: '70 kg', rest: '150s', notes: '' },
            { name: 'Plancha', sets: '3', reps: '60s', weight: 'Peso corporal', rest: '90s', notes: '' },
          ],
        },
        {
          dayName: 'Día B · Fuerza complementaria',
          exercises: [
            { name: 'Peso muerto', sets: '5', reps: '3-5', weight: '120 kg', rest: '240s', notes: 'Técnica primero' },
            { name: 'Press militar', sets: '4', reps: '5', weight: '45 kg', rest: '180s', notes: '' },
            { name: 'Dominadas con lastre', sets: '4', reps: '5', weight: '5 kg', rest: '150s', notes: '' },
            { name: 'Fondos con lastre', sets: '3', reps: '6', weight: '10 kg', rest: '150s', notes: '' },
          ],
        },
      ]
    case 'fat-loss':
      return [
        {
          dayName: 'Lunes · Circuito full body',
          exercises: [
            { name: 'Jumping jacks', sets: '3', reps: '45s', weight: '—', rest: '30s', notes: 'Calentamiento' },
            { name: 'Sentadilla con salto', sets: '3', reps: '15', weight: 'Peso corporal', rest: '45s', notes: '' },
            { name: 'Mountain climbers', sets: '3', reps: '40s', weight: '—', rest: '30s', notes: '' },
            { name: 'Press de pecho en máquina', sets: '3', reps: '12', weight: '40 kg', rest: '45s', notes: '' },
            { name: 'Remo en polea', sets: '3', reps: '12', weight: '45 kg', rest: '45s', notes: '' },
            { name: 'Burpees', sets: '3', reps: '10', weight: '—', rest: '45s', notes: '' },
          ],
        },
        {
          dayName: 'Miércoles · Cardio + core',
          exercises: [
            { name: 'Cinta (trote/zancada)', sets: '1', reps: '20 min', weight: '—', rest: '—', notes: 'Zona 3' },
            { name: 'Bicicleta fija', sets: '1', reps: '15 min', weight: '—', rest: '—', notes: 'Intervalos 1:2' },
            { name: 'Plancha', sets: '4', reps: '45s', weight: 'Peso corporal', rest: '45s', notes: '' },
            { name: 'Russian twists', sets: '3', reps: '20', weight: '8 kg', rest: '45s', notes: '' },
          ],
        },
        {
          dayName: 'Viernes · Fuerza metabólica',
          exercises: [
            { name: 'Kettlebell swing', sets: '4', reps: '15', weight: '16 kg', rest: '60s', notes: '' },
            { name: 'Press Arnold', sets: '3', reps: '12', weight: '14 kg', rest: '60s', notes: '' },
            { name: 'Zancadas caminando', sets: '3', reps: '12 c/u', weight: '10 kg', rest: '60s', notes: '' },
            { name: 'Pull-over en polea', sets: '3', reps: '12', weight: '30 kg', rest: '45s', notes: '' },
            { name: 'Soga de combate', sets: '4', reps: '30s', weight: '—', rest: '45s', notes: '' },
          ],
        },
      ]
    case 'beginner':
      return [
        {
          dayName: 'Día 1 · Cuerpo completo',
          exercises: [
            { name: 'Sentadilla en máquina', sets: '3', reps: '12', weight: '40 kg', rest: '90s', notes: 'Aprende la técnica' },
            { name: 'Prensa de pecho en máquina', sets: '3', reps: '12', weight: '30 kg', rest: '90s', notes: '' },
            { name: 'Jalón al pecho', sets: '3', reps: '12', weight: '35 kg', rest: '90s', notes: '' },
            { name: 'Hip thrust en máquina', sets: '3', reps: '12', weight: '30 kg', rest: '90s', notes: '' },
            { name: 'Caminata en cinta', sets: '1', reps: '15 min', weight: '—', rest: '—', notes: 'Ritmo suave' },
          ],
        },
        {
          dayName: 'Día 2 · Cuerpo completo',
          exercises: [
            { name: 'Prensa de piernas', sets: '3', reps: '12', weight: '60 kg', rest: '90s', notes: '' },
            { name: 'Remo en polea baja', sets: '3', reps: '12', weight: '30 kg', rest: '90s', notes: '' },
            { name: 'Press de hombros en máquina', sets: '3', reps: '12', weight: '20 kg', rest: '90s', notes: '' },
            { name: 'Curl de bíceps en polea', sets: '2', reps: '12', weight: '15 kg', rest: '60s', notes: '' },
            { name: 'Extensión de tríceps', sets: '2', reps: '12', weight: '15 kg', rest: '60s', notes: '' },
          ],
        },
      ]
    default:
      return [{ dayName: 'Día 1', exercises: [{ name: '', sets: '3', reps: '12', weight: '', rest: '60s', notes: '' }] }]
  }
}

const routineTemplates: Record<RoutineTemplateId, { title: string; description: string }> = {
  hypertrophy: {
    title: 'Hipertrofia · 3 días',
    description: 'Volumen orientado a ganancia muscular con división torso/pierna.',
  },
  strength: {
    title: 'Fuerza · 4 días',
    description: 'Bloques de fuerza básica y complementaria con pesos altos.',
  },
  'fat-loss': {
    title: 'Pérdida de grasa · 3 días',
    description: 'Circuitos metabólicos y cardio para déficit calórico.',
  },
  beginner: {
    title: 'Principiante · 2 días',
    description: 'Adaptación inicial con ejercicios en máquinas y técnica.',
  },
  custom: { title: 'Rutina personalizada', description: 'Plantilla en blanco para armar desde cero.' },
}

export const presetTemplateList: RoutineTemplateId[] = ['hypertrophy', 'strength', 'fat-loss', 'beginner']

export { routineTemplates }

export function seedDB(): DB {
  const members = [
    {
      id: 'm1',
      fullName: 'Martina López',
      email: 'martina.lopez@gmail.com',
      phone: '+54 9 11 5555-0101',
      dni: '38.512.904',
      startDate: day(210),
      status: 'active' as const,
      monthlyFee: 30000,
      discount: 0,
      discountType: 'percent' as const,
      finalPrice: 30000,
      lastPaymentDate: day(14),
      nextDueDate: addDays(todayISO(), 17),
      debtAmount: 0,
      paymentStatus: 'paid' as const,
      notes: 'Plan anual. Turno tarde.',
    },
    {
      id: 'm2',
      fullName: 'Jorge Ramírez',
      email: 'jorge.r@hotmail.com',
      phone: '+54 9 11 5555-0182',
      dni: '29.118.447',
      startDate: day(40),
      status: 'active' as const,
      monthlyFee: 30000,
      discount: 10,
      discountType: 'percent' as const,
      finalPrice: 27000,
      lastPaymentDate: day(34),
      nextDueDate: addDays(todayISO(), -4),
      debtAmount: 54000,
      paymentStatus: 'overdue' as const,
      notes: 'Descuento 10% por plan trimestral.',
    },
    {
      id: 'm3',
      fullName: 'Sofía Fernández',
      email: 'sofia.fernandez@gmail.com',
      phone: '+54 9 11 5555-0117',
      dni: '41.203.556',
      startDate: day(90),
      status: 'active' as const,
      monthlyFee: 30000,
      discount: 0,
      discountType: 'percent' as const,
      finalPrice: 30000,
      lastPaymentDate: day(12),
      nextDueDate: addDays(todayISO(), 2),
      debtAmount: 0,
      paymentStatus: 'pending' as const,
      notes: '',
    },
    {
      id: 'm4',
      fullName: 'Carlos Méndez',
      email: 'carlos.mendez@yahoo.com',
      phone: '+54 9 11 5555-0134',
      dni: '33.876.112',
      startDate: day(320),
      status: 'active' as const,
      monthlyFee: 30000,
      discount: 20,
      discountType: 'percent' as const,
      finalPrice: 24000,
      lastPaymentDate: day(5),
      nextDueDate: addDays(todayISO(), 25),
      debtAmount: 0,
      paymentStatus: 'paid' as const,
      notes: 'Plan familiar con su hijo.',
    },
    {
      id: 'm5',
      fullName: 'Lucía Aguirre',
      email: 'lucia.aguirre@gmail.com',
      phone: '+54 9 11 5555-0199',
      dni: '36.990.234',
      startDate: day(60),
      status: 'debtor' as const,
      monthlyFee: 30000,
      discount: 5000,
      discountType: 'fixed' as const,
      finalPrice: 25000,
      lastPaymentDate: day(60),
      nextDueDate: addDays(todayISO(), -30),
      debtAmount: 50000,
      paymentStatus: 'overdue' as const,
      notes: 'Descuento fijo por convenio con empresa.',
    },
    {
      id: 'm6',
      fullName: 'Diego Navarro',
      email: 'diego.navarro@gmail.com',
      phone: '+54 9 11 5555-0123',
      dni: '27.445.908',
      startDate: day(700),
      status: 'active' as const,
      monthlyFee: 30000,
      discount: 0,
      discountType: 'percent' as const,
      finalPrice: 30000,
      lastPaymentDate: day(2),
      nextDueDate: addDays(todayISO(), 28),
      debtAmount: 0,
      paymentStatus: 'paid' as const,
      notes: '',
    },
    {
      id: 'm7',
      fullName: 'Valentina Ríos',
      email: 'vale.rios@gmail.com',
      phone: '+54 9 11 5555-0156',
      dni: '39.701.882',
      startDate: day(10),
      status: 'inactive' as const,
      monthlyFee: 30000,
      discount: 0,
      discountType: 'percent' as const,
      finalPrice: 30000,
      lastPaymentDate: null,
      nextDueDate: addDays(todayISO(), 20),
      debtAmount: 0,
      paymentStatus: 'pending' as const,
      notes: 'De pausa por viaje.',
    },
    {
      id: 'm8',
      fullName: 'Marcelo Ibáñez',
      email: 'marcelo.ibanez@gmail.com',
      phone: '+54 9 11 5555-0178',
      dni: '31.667.340',
      startDate: day(15),
      status: 'active' as const,
      monthlyFee: 30000,
      discount: 5,
      discountType: 'percent' as const,
      finalPrice: 28500,
      lastPaymentDate: day(1),
      nextDueDate: addDays(todayISO(), 1),
      debtAmount: 0,
      paymentStatus: 'pending' as const,
      notes: 'Vence mañana.',
    },
  ] as const

  const nowISO = new Date().toISOString()

  const seedCodes = ['MAR836', 'JOR425', 'SOF918', 'CAR204', 'LUC573', 'DIE641', 'VAL389', 'MAR726']
  const seedPlans = ['free', '3x', 'plus', 'free', 'free', 'plus', 'free', '3x']

  const memberRecords = (members as unknown as DB['members']).map((m, i) => ({
    ...m,
    loginCode: seedCodes[i] ?? ensureCodeFallback(i),
    planId: seedPlans[i] ?? 'free',
  }))

  function ensureCodeFallback(i: number): string {
    return `GF${100 + i}`
  }

  const templates: RoutineTemplate[] = presetTemplateList.map((key) => ({
    id: `tpl-${key}`,
    title: routineTemplates[key].title,
    description: routineTemplates[key].description,
    days: buildRoutineDays(key),
    createdAt: nowISO,
    updatedAt: nowISO,
  }))

  const templateId = (key: string) => `tpl-${key}`

  const routines: Routine[] = [
    {
      id: 'r1',
      memberId: 'm1',
      title: 'Hipertrofia · 3 días',
      daysPerWeek: 3,
      templateId: templateId('hypertrophy'),
      isCustomized: false,
      days: [],
      createdAt: nowISO,
      updatedAt: nowISO,
    },
    {
      id: 'r2',
      memberId: 'm4',
      title: 'Fuerza · 4 días',
      daysPerWeek: 4,
      templateId: templateId('strength'),
      isCustomized: false,
      days: [],
      createdAt: nowISO,
      updatedAt: nowISO,
    },
    {
      id: 'r3',
      memberId: 'm3',
      title: 'Pérdida de grasa · 3 días',
      daysPerWeek: 3,
      templateId: templateId('fat-loss'),
      isCustomized: false,
      days: [],
      createdAt: nowISO,
      updatedAt: nowISO,
    },
  ]

  return {
    members: memberRecords,
    routines,
    templates,
    settings: {
      gymName: 'GymFlow',
      address: 'Av. Siempre Viva 1234, Buenos Aires',
      phone: '+54 9 11 5555-0000',
      email: 'contacto@gymflow.com.ar',
      openingHours: 'Lun a Vie 08:00 – 22:00 · Sáb 09:00 – 14:00',
      defaultMonthlyFee: 30000,
      plans: [
        { id: 'free', name: 'Pase Libre', price: 30000 },
        { id: '3x', name: '3 veces por semana', price: 38000 },
        { id: 'plus', name: 'Musculación + Pase de Clases', price: 45000 },
      ],
      activities: [
        { id: 'a1', name: 'Spinning', schedule: 'Lun, Mié y Vie 18:00 – 19:00' },
        { id: 'a2', name: 'Funcional', schedule: 'Mar y Jue 19:00 – 20:00' },
        { id: 'a3', name: 'Yoga', schedule: 'Sáb 10:00 – 11:00' },
      ],
      holidays: buildSeedHolidays(),
      lateFee: { cutoffDay: 15, surchargeType: 'fixed', surchargeValue: 1500 },
      brand: { enableAutoTheme: false },
      admin: { username: 'admin', password: 'admin123' },
    },
    tasks: buildSeedTasks(),
    attendance: buildSeedAttendance(),
  }
}

function buildSeedHolidays(): string[] {
  const now = new Date()
  const dates = [1, 20]
  return dates.map((d) => toISO(new Date(now.getFullYear(), now.getMonth(), d)))
}
