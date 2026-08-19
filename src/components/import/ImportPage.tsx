import { useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardPaste,
  FileSpreadsheet,
  FileUp,
  Info,
  UploadCloud,
  X,
} from 'lucide-react'
import { useStore } from '../../store/store'
import {
  autoMap,
  buildRows,
  FIELD_HINTS,
  FIELD_LABELS,
  parseFile,
  parsePastedText,
  type FieldKey,
  type ParsedTable,
  type ValidationRow,
} from '../../lib/import'
import { Button, Field, Select } from '../ui/primitives'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Topbar } from '../layout/Topbar'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/dates'

type Step = 'source' | 'map' | 'preview' | 'done'
type SourceMode = 'file' | 'paste'

const FIELDS: FieldKey[] = ['fullName', 'email', 'phone', 'dni', 'monthlyFee', 'startDate']

export function ImportPage() {
  const { bulkImport, resetData } = useStore()
  const [step, setStep] = useState<Step>('source')
  const [mode, setMode] = useState<SourceMode>('file')
  const [table, setTable] = useState<ParsedTable | null>(null)
  const [mapping, setMapping] = useState<Record<FieldKey, number | -1>>(autoMap([]))
  const [validated, setValidated] = useState<ValidationRow[]>([])
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState('')
  const [imported, setImported] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const start = async (file: File) => {
    setError('')
    try {
      const t = await parseFile(file)
      if (t.rows.length === 0) {
        setError('El archivo no contiene filas de datos.')
        return
      }
      setTable(t)
      setFileName(file.name)
      setMapping(autoMap(t.headers))
      setStep('map')
    } catch {
      setError('No se pudo leer el archivo. Verificá que sea .xlsx, .xls o .csv válido.')
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) start(file)
  }

  const processPaste = () => {
    setError('')
    const t = parsePastedText(pasteText)
    if (t.rows.length === 0) {
      setError('Pegá al menos una fila de datos (copiadas desde Excel o Google Sheets).')
      return
    }
    setTable(t)
    setMapping(autoMap(t.headers))
    setStep('map')
  }

  const goPreview = () => {
    if (!table) return
    setValidated(buildRows(table.headers, table.rows, mapping))
    setStep('preview')
  }

  const confirmImport = () => {
    const valid = validated.filter((v) => v.errors.length === 0).map((v) => v.row)
    const count = bulkImport(valid)
    setImported(count)
    setStep('done')
  }

  const reset = () => {
    setStep('source')
    setTable(null)
    setPasteText('')
    setFileName('')
    setError('')
  }

  const validCount = validated.filter((v) => v.errors.length === 0).length
  const withErrors = validated.length - validCount

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Topbar title="Importar datos" subtitle="Carga masiva de socios desde Excel, CSV o copiar y pegar" onReset={resetData} />

      <div className="min-h-0 flex-1 overflow-y-auto p-6 scrollbar-thin">
        {step === 'source' && (
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SourceCard
                active={mode === 'file'}
                onClick={() => setMode('file')}
                icon={<FileSpreadsheet size={20} />}
                title="Subir archivo"
                description="Archivos .xlsx, .xls, .csv, .docx o .txt. Arrastrá el archivo o hacé clic para elegirlo."
              />
              <SourceCard
                active={mode === 'paste'}
                onClick={() => setMode('paste')}
                icon={<ClipboardPaste size={20} />}
                title="Copiar y pegar"
                description="Pegá filas directamente desde Excel o Google Sheets. Se detectan columnas automáticamente."
              />
            </div>

            {mode === 'file' ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInput.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors',
                  dragOver ? 'border-snow bg-ink-700/50' : 'border-ink-500 bg-ink-800/60 hover:border-silver hover:bg-ink-800',
                )}
              >
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', dragOver ? 'bg-accent text-accent-ink' : 'bg-ink-700 text-silver')}>
                  <UploadCloud size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fog">Arrastrá tu archivo aquí</p>
                  <p className="mt-1 text-xs text-ash">o hacé clic para explorar · .xlsx, .xls, .csv, .docx, .txt</p>
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx,.xls,.csv,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) start(f)
                    e.target.value = ''
                  }}
                />
              </div>
            ) : (
              <Card>
                <CardBody className="space-y-3">
                  <Field
                    label="Pegá las filas copiadas (Ctrl+V)"
                    hint="Las celdas se separan con tabulaciones o punto y coma. La primera fila puede ser el encabezado."
                  >
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder={'Nombre\tEmail\tTeléfono\tCuota\nJuan Pérez\tjuan@mail.com\t+54 9 11 5555-0000\t30000'}
                      className="min-h-44 w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 font-mono text-[13px] text-fog placeholder:text-ash focus:border-silver focus:outline-none"
                    />
                  </Field>
                  <div className="flex justify-end">
                    <Button onClick={processPaste}>
                      Analizar datos pegados
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {error && <p className="text-sm text-debt">{error}</p>}

            <div className="flex items-start gap-2 rounded-lg border border-ink-500/60 bg-ink-800/60 px-4 py-3 text-xs text-ash">
              <Info size={14} className="mt-0.5 shrink-0 text-silver" />
              <p>
                Los socios se crean con la cuota base indicada y vencimiento al mes siguiente de la fecha de ingreso.
                Podés corregir los datos en la pantalla de confirmación antes de guardar.
              </p>
            </div>
          </div>
        )}

        {step === 'map' && table && (
          <div className="mx-auto max-w-5xl space-y-4">
            <button onClick={reset} className="flex items-center gap-1.5 text-xs font-medium text-silver hover:text-fog">
              <ArrowLeft size={13} />
              Volver
            </button>

            <Card>
              <CardHeader
                title="Mapeo de columnas"
                subtitle={
                  fileName
                    ? `${fileName} · ${table.rows.length} filas detectadas${table.hasHeader ? ' · primera fila usada como encabezado' : ' · sin encabezado detectado'}`
                    : `${table.rows.length} filas detectadas${table.hasHeader ? ' · encabezado detectado' : ' · sin encabezado'}`
                }
              />
              <CardBody>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {FIELDS.map((field) => (
                    <Field key={field} label={`${FIELD_LABELS[field]} →`} hint={FIELD_HINTS[field]}>
                      <Select
                        value={mapping[field]}
                        onChange={(e) => setMapping({ ...mapping, [field]: Number(e.target.value) })}
                      >
                        <option value={-1}>— No importar —</option>
                        {table.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h || `Columna ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-500/60 bg-ink-700/40 px-4 py-3">
                  <p className="text-xs text-ash">
                    Vista previa de la primera fila mapeada
                    {mapping.fullName >= 0 && (
                      <span className="ml-2 font-semibold text-fog">{table.rows[0]?.[mapping.fullName] || '—'}</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={reset}>Cancelar</Button>
                    <Button onClick={goPreview} disabled={mapping.fullName < 0}>
                      Continuar a validación
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {step === 'preview' && (
          <div className="mx-auto max-w-6xl space-y-4">
            <button onClick={() => setStep('map')} className="flex items-center gap-1.5 text-xs font-medium text-silver hover:text-fog">
              <ArrowLeft size={13} />
              Ajustar mapeo
            </button>

            <Card>
              <CardHeader
                title="Confirmación de importación"
                subtitle="Revisá los registros antes de guardarlos en la base de datos"
                action={
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-ok-muted px-2.5 py-1 font-semibold text-ok">{validCount} válidos</span>
                    {withErrors > 0 && (
                      <span className="rounded-full bg-debt-muted px-2.5 py-1 font-semibold text-debt">{withErrors} con errores</span>
                    )}
                  </div>
                }
              />
              <div className="max-h-[55vh] overflow-auto scrollbar-thin">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-ink-800">
                    <tr className="border-b border-ink-500/60 text-[11px] uppercase tracking-wider text-ash">
                      <th className="px-5 py-3 font-semibold">Nombre</th>
                      <th className="px-3 py-3 font-semibold">Email</th>
                      <th className="px-3 py-3 font-semibold">Teléfono</th>
                      <th className="px-3 py-3 font-semibold">DNI</th>
                      <th className="px-3 py-3 font-semibold">Cuota</th>
                      <th className="px-3 py-3 font-semibold">Ingreso</th>
                      <th className="px-3 py-3 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-500/40">
                    {validated.map((v, i) => (
                      <tr key={i} className={cn(v.errors.length > 0 && 'bg-debt-muted/30')}>
                        <td className="px-5 py-2.5 font-medium text-fog">{v.row.fullName || <span className="text-debt">—</span>}</td>
                        <td className="px-3 py-2.5 text-xs text-silver">{v.row.email || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-silver">{v.row.phone || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-silver">{v.row.dni || '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-silver">{v.row.monthlyFee > 0 ? formatCurrency(v.row.monthlyFee) : '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-silver">{v.row.startDate || 'Hoy'}</td>
                        <td className="px-3 py-2.5">
                          {v.errors.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ok">
                              <CheckCircle2 size={13} />
                              Listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-debt">
                              <X size={13} />
                              {v.errors.join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-500/60 px-5 py-4">
                <p className="text-xs text-ash">
                  {withErrors > 0
                    ? `Se importarán ${validCount} registros válidos. Los ${withErrors} con errores se omitirán.`
                    : `Se importarán ${validCount} registros.`}
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={reset}>Cancelar</Button>
                  <Button onClick={confirmImport} disabled={validCount === 0}>
                    <FileUp size={14} />
                    Importar {validCount} socios
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {step === 'done' && (
          <div className="mx-auto max-w-md">
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok-muted text-ok">
                  <CheckCircle2 size={28} />
                </div>
                <p className="text-base font-bold text-snow">Importación completada</p>
                <p className="text-sm text-ash">
                  Se agregaron <strong className="text-fog">{imported}</strong> socios a la base de datos.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" onClick={reset}>
                    <FileUp size={14} />
                    Importar otro archivo
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-4 rounded-xl border p-5 text-left transition-all',
        active
          ? 'border-silver bg-ink-700 shadow-[0_0_0_1px_var(--color-silver)]'
          : 'border-ink-500 bg-ink-800 hover:border-ink-500 hover:bg-ink-700/50',
      )}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', active ? 'bg-accent text-accent-ink' : 'bg-ink-700 text-silver')}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-snow">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ash">{description}</p>
      </div>
    </button>
  )
}