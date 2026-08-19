import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Apple,
  Building2,
  CalendarX2,
  Clock,
  Download,
  Dumbbell,
  ImagePlus,
  Lock,
  Monitor,
  Palette,
  Plus,
  RefreshCw,
  Smartphone,
  Tag,
  Trash2,
} from 'lucide-react'
import { useStore } from '../../store/store'
import type { GymActivity, GymPlan } from '../../types'
import { Badge, Button, Field, Input, Switch } from '../ui/primitives'
import { Card, CardBody } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { Topbar } from '../layout/Topbar'
import { readFileAsDataURL, extractDominantColor } from '../../lib/brand'
import { formatDate, todayISO, uid } from '../../lib/dates'
import { cn } from '../../lib/cn'
import { isStandalone, useInstallPrompt } from '../../lib/pwa'

export function SettingsPage() {
  const { settings, updateBrand, updateGymSettings, resetData } = useStore()
  const brand = settings.brand
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState(() => ({
    gymName: settings.gymName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    openingHours: settings.openingHours,
    adminUsername: settings.admin.username,
    adminPassword: settings.admin.password,
  }))
  const [plans, setPlans] = useState<GymPlan[]>(() => settings.plans.map((p) => ({ ...p })))
  const [activities, setActivities] = useState<GymActivity[]>(() => settings.activities.map((a) => ({ ...a })))
  const [holidays, setHolidays] = useState<string[]>(() => [...settings.holidays])
  const [holidayDraft, setHolidayDraft] = useState('')
  const [saved, setSaved] = useState(false)

  const monthPrefix = todayISO().slice(0, 7)
  const holidaysThisMonth = holidays.filter((h) => h.startsWith(monthPrefix)).sort()

  const save = () => {
    updateGymSettings({
      gymName: draft.gymName,
      address: draft.address,
      phone: draft.phone,
      email: draft.email,
      openingHours: draft.openingHours,
      plans: plans.filter((p) => p.name.trim() || p.price > 0),
      activities: activities.filter((a) => a.name.trim()),
      holidays,
      admin: { username: draft.adminUsername, password: draft.adminPassword },
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleLogo = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    const url = await readFileAsDataURL(file)
    if (brand.enableAutoTheme) {
      const accent = await extractDominantColor(url)
      updateBrand({ logoUrl: url, accentColor: accent ?? undefined })
    } else {
      updateBrand({ logoUrl: url })
    }
    setBusy(false)
  }

  const toggleTheme = async (v: boolean) => {
    if (v) {
      let accent = brand.accentColor
      if (!accent && brand.logoUrl) {
        setBusy(true)
        accent = (await extractDominantColor(brand.logoUrl)) ?? undefined
        setBusy(false)
      }
      updateBrand({ enableAutoTheme: true, accentColor: accent })
    } else {
      updateBrand({ enableAutoTheme: false })
    }
  }

  const reanalyze = async () => {
    if (!brand.logoUrl) return
    setBusy(true)
    const accent = await extractDominantColor(brand.logoUrl)
    updateBrand({ accentColor: accent ?? undefined })
    setBusy(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar
        title="Configuración"
        subtitle="Datos del gimnasio, planes, actividades, horarios y acceso"
        onReset={resetData}
        actions={
          <Button onClick={save}>
            {saved ? 'Guardado' : 'Guardar cambios'}
          </Button>
        }
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin">
        <Card>
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fog">
              <Building2 size={15} className="text-silver" />
              Datos básicos del gimnasio
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre del gimnasio">
                <Input value={draft.gymName} onChange={(e) => setDraft({ ...draft, gymName: e.target.value })} />
              </Field>
              <Field label="Teléfono">
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label="Correo de contacto">
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Field>
              <Field label="Dirección">
                <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </Field>
              <Field label="Horarios de atención" className="sm:col-span-2" hint="Ej: Lun a Vie 08:00 – 22:00 · Sáb 09:00 – 14:00">
                <Input value={draft.openingHours} onChange={(e) => setDraft({ ...draft, openingHours: e.target.value })} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fog">
              <Tag size={15} className="text-silver" />
              Planes y cuotas
            </p>
            <div className="space-y-2">
              {plans.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={p.name}
                    onChange={(e) => setPlans(plans.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Nombre del plan"
                  />
                  <div className="relative w-32 shrink-0">
                    <Input
                      type="number"
                      min={0}
                      value={p.price}
                      onChange={(e) => setPlans(plans.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))}
                      className="pr-7 text-right"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-ash">ARS</span>
                  </div>
                  <button
                    onClick={() => setPlans(plans.filter((_, j) => j !== i))}
                    className="rounded-lg p-2 text-silver transition-colors hover:bg-debt-muted hover:text-debt"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setPlans([...plans, { id: uid(), name: '', price: 0 }])}>
              <Plus size={13} />
              Agregar plan
            </Button>
            <p className="mt-2 text-[11px] text-ash">
              Los planes alimentan el registro de miembros: al elegir un plan se aplica su precio como cuota base.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fog">
              <Dumbbell size={15} className="text-silver" />
              Actividades y horarios de clases
            </p>
            <div className="space-y-2">
              {activities.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={a.name}
                    onChange={(e) => setActivities(activities.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Nombre de la clase"
                    className="w-48 shrink-0"
                  />
                  <Input
                    value={a.schedule}
                    onChange={(e) => setActivities(activities.map((x, j) => (j === i ? { ...x, schedule: e.target.value } : x)))}
                    placeholder="Días y horario (ej: Lun y Mié 18:00 – 19:00)"
                  />
                  <button
                    onClick={() => setActivities(activities.filter((_, j) => j !== i))}
                    className="rounded-lg p-2 text-silver transition-colors hover:bg-debt-muted hover:text-debt"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setActivities([...activities, { id: uid(), name: '', schedule: '' }])}>
              <Plus size={13} />
              Agregar actividad
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fog">
              <CalendarX2 size={15} className="text-silver" />
              Feriados y días no laborables
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Agregar fecha">
                <Input type="date" value={holidayDraft} onChange={(e) => setHolidayDraft(e.target.value)} />
              </Field>
              <Button
                size="sm"
                variant="outline"
                disabled={!holidayDraft || holidays.includes(holidayDraft)}
                onClick={() => {
                  if (holidayDraft) {
                    setHolidays([...holidays, holidayDraft])
                    setHolidayDraft('')
                  }
                }}
              >
                <Plus size={13} />
                Agregar
              </Button>
            </div>

            {holidays.length === 0 ? (
              <p className="mt-3 text-xs text-ash">No hay feriados cargados.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-medium text-silver">Este mes</p>
                {holidaysThisMonth.length === 0 && <p className="text-[11px] text-ash">Sin feriados este mes.</p>}
                {holidaysThisMonth.map((h) => (
                  <Chip key={h} label={formatDate(h)} onRemove={() => setHolidays(holidays.filter((x) => x !== h))} />
                ))}
                <p className="pt-1 text-[11px] font-medium text-silver">Otros meses</p>
                {holidays.filter((h) => !h.startsWith(monthPrefix)).map((h) => (
                  <Chip key={h} label={formatDate(h)} onRemove={() => setHolidays(holidays.filter((x) => x !== h))} />
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-ash">
              Las fechas feriadas se marcan en el calendario general y se muestran en la vista del alumno.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-fog">
              <Lock size={15} className="text-silver" />
              Acceso del administrador
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Usuario">
                <Input value={draft.adminUsername} onChange={(e) => setDraft({ ...draft, adminUsername: e.target.value })} />
              </Field>
              <Field label="Contraseña">
                <Input value={draft.adminPassword} onChange={(e) => setDraft({ ...draft, adminPassword: e.target.value })} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <InstallAppCard />

        <Card>
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-fog">
                  <Palette size={15} className="text-silver" />
                  Personalización automática de colores según logotipo
                </p>
                <p className="mt-1.5 max-w-md text-xs text-ash">
                  Al activarla, se analiza el color dominante del logotipo y se aplica como acento en botones
                  principales, badges de estado, bordes activos e indicadores clave. Desactivada, la interfaz vuelve
                  al tema monocromático en escala de grises.
                </p>
              </div>
              <Switch checked={brand.enableAutoTheme} onChange={toggleTheme} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-ink-500 bg-ink-700">
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt="Logotipo" className="h-full w-full object-contain" />
                ) : (
                  <ImagePlus size={26} className="text-ash" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      handleLogo(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                    <ImagePlus size={14} />
                    {brand.logoUrl ? 'Cambiar logo' : 'Subir logo'}
                  </Button>
                  {brand.logoUrl && (
                    <Button size="sm" variant="ghost" className="text-debt hover:text-debt" onClick={() => updateBrand({ logoUrl: undefined, accentColor: undefined, enableAutoTheme: false })}>
                      <Trash2 size={14} />
                      Quitar
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-ash">Formatos: PNG, JPG, SVG. Se guarda en tu navegador.</p>
              </div>
            </div>

            {brand.enableAutoTheme && (
              <div
                className={cn(
                  'mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
                  brand.accentColor ? 'border-ink-500 bg-ink-700/40' : 'border-warn/25 bg-warn-muted',
                )}
              >
                {brand.accentColor ? (
                  <>
                    <span className="h-8 w-8 rounded-lg border border-ink-500" style={{ backgroundColor: brand.accentColor }} />
                    <div>
                      <p className="text-sm font-medium text-fog">
                        Color de acento: <span className="font-mono">{brand.accentColor}</span>
                      </p>
                      <p className="text-[11px] text-ash">Los contrastes de legibilidad se ajustan automáticamente.</p>
                    </div>
                    <Button size="sm" variant="outline" className="ml-auto" onClick={reanalyze} disabled={busy || !brand.logoUrl}>
                      <RefreshCw size={13} className={cn(busy && 'animate-spin')} />
                      Reanalizar
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-warn">
                    {brand.logoUrl
                      ? 'No se pudo extraer un color del logotipo. Probá con otro archivo.'
                      : 'Subí un logotipo para poder extraer el color de acento.'}
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn-muted px-2.5 py-0.5 text-[11px] font-medium text-warn">
      <Clock size={11} />
      {label}
      <button onClick={onRemove} className="text-warn/70 hover:text-debt" aria-label="Quitar">
        <Trash2 size={11} />
      </button>
    </span>
  )
}

function InstallAppCard() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const [showGuide, setShowGuide] = useState(false)
  const installed = isStandalone()

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-fog">
              <Download size={15} className="text-silver" />
              Aplicación de escritorio y móvil
            </p>
            <p className="mt-1.5 max-w-md text-xs text-ash">
              {installed
                ? 'La aplicación ya está instalada en este dispositivo. Funciona sin conexión y con acceso directo desde el escritorio o la pantalla de inicio.'
                : 'Instalá GymFlow para usarla sin conexión. La asistencia registrada sin internet queda en una cola local y se sincroniza automáticamente al volver la conexión.'}
            </p>
          </div>
          {installed && <Badge tone="ok">Instalada</Badge>}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {canInstall && (
            <Button onClick={promptInstall}>
              <Download size={14} />
              Descargar e instalar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowGuide(true)}>
            <Smartphone size={14} />
            Cómo instalar
          </Button>
        </div>
      </CardBody>

      <Modal
        open={showGuide}
        onClose={() => setShowGuide(false)}
        title="Cómo instalar GymFlow"
        subtitle="Instalación en distintos dispositivos"
      >
        <div className="space-y-4">
          <GuideStep
            icon={<Smartphone size={16} />}
            title="Android (Chrome)"
            steps={['Abrí GymFlow en Chrome', 'Tocá el menú ⋮ (arriba a la derecha)', 'Elegí «Instalar aplicación» o «Añadir a pantalla de inicio»', 'Confirmá la instalación']}
          />
          <GuideStep
            icon={<Apple size={16} />}
            title="iPhone / iPad (Safari)"
            steps={['Abrí GymFlow en Safari', 'Tocá el botón Compartir (cuadro con flecha arriba)', 'Elegí «Añadir a pantalla de inicio»', 'Tocá «Añadir» para confirmar']}
          />
          <GuideStep
            icon={<Monitor size={16} />}
            title="Computadora (Chrome, Edge)"
            steps={['Abrí GymFlow en el navegador', 'Buscá el icono de instalar en la barra de direcciones', 'Tocá «Instalar» y confirmá']}
          />
          <div className="rounded-lg border border-ok/25 bg-ok-muted px-3 py-2.5 text-xs text-ok">
            Una vez instalada, GymFlow abre en modo aplicación y funciona incluso sin conexión.
          </div>
        </div>
      </Modal>
    </Card>
  )
}

function GuideStep({ icon, title, steps }: { icon: ReactNode; title: string; steps: string[] }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-fog">
        <span className="text-silver">{icon}</span>
        {title}
      </p>
      <ol className="space-y-1.5 pl-6">
        {steps.map((s, i) => (
          <li key={i} className="text-xs leading-relaxed text-ash">
            <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-[10px] font-semibold text-silver">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  )
}