import * as XLSX from 'xlsx'
import { unzipSync } from 'fflate'
import type { ImportedRow } from '../types'

export interface ParsedTable {
  headers: string[]
  rows: string[][]
  hasHeader: boolean
  source: 'file' | 'paste'
}

function splitLine(line: string): string[] {
  const first = line.charAt(0)
  if (first === '"') {
    // simple quoted-csv handling
    const re = /"([^"]*)"|([^\t;]+)/g
    const cells: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(line)) !== null) {
      cells.push((m[1] ?? m[2] ?? '').trim())
    }
    return cells
  }
  return line.split('\t').length > 1 ? line.split('\t') : line.split(';')
}

const HEADER_RE = /(nombre|name|email|correo|tel|telefono|phone|dni|id|cuota|monto|precio|fee|fecha|ingreso|inicio)/i

/** Convierte texto plano (cada línea = un registro) en una tabla parseada. */
export function textToParsedTable(raw: string, source: ParsedTable['source']): ParsedTable {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { headers: [], rows: [], hasHeader: false, source }

  const splitLines = lines.map(splitLine)
  const first = splitLines[0]
  const looksLikeHeader = first.length > 0 && first.some((h) => HEADER_RE.test(h))

  if (looksLikeHeader) {
    return { headers: first, rows: splitLines.slice(1), hasHeader: true, source }
  }
  return {
    headers: first.map((_, i) => `Columna ${i + 1}`),
    rows: splitLines,
    hasHeader: false,
    source,
  }
}

export function parsePastedText(raw: string): ParsedTable {
  return textToParsedTable(raw, 'paste')
}

/** Extrae el texto plano (párrafos) de un .docx usando fflate + DOMParser. */
function parseDocx(buf: ArrayBuffer): string {
  const zip = unzipSync(new Uint8Array(buf))
  const xmlBytes = zip['word/document.xml']
  if (!xmlBytes) return ''
  const xml = new TextDecoder().decode(xmlBytes)
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const paragraphs = Array.from(doc.getElementsByTagName('w:p'))
  return paragraphs
    .map((p) => Array.from(p.getElementsByTagName('w:t')).map((t) => t.textContent ?? '').join(''))
    .filter((l) => l.trim())
    .join('\n')
}

export async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.txt')) {
    const text = await file.text()
    return textToParsedTable(text, 'file')
  }

  if (name.endsWith('.docx')) {
    const text = parseDocx(await file.arrayBuffer())
    if (!text) return { headers: [], rows: [], hasHeader: false, source: 'file' }
    return textToParsedTable(text, 'file')
  }

  // .xlsx / .xls / .csv (SheetJS lee también CSV)
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '' }) as string[][]

  const cleaned = matrix
    .filter((row) => row.some((c) => String(c).trim() !== ''))
    .map((row) => row.map((c) => String(c).trim()))

  if (cleaned.length === 0) return { headers: [], rows: [], hasHeader: false, source: 'file' }

  const first = cleaned[0]
  const looksLikeHeader = first.some((h) => HEADER_RE.test(h))

  if (looksLikeHeader) {
    return { headers: first, rows: cleaned.slice(1), hasHeader: true, source: 'file' }
  }
  return {
    headers: first.map((_, i) => `Columna ${i + 1}`),
    rows: cleaned,
    hasHeader: false,
    source: 'file',
  }
}

export type FieldKey = 'fullName' | 'email' | 'phone' | 'dni' | 'monthlyFee' | 'startDate'

export const FIELD_LABELS: Record<FieldKey, string> = {
  fullName: 'Nombre completo *',
  email: 'Email',
  phone: 'Teléfono',
  dni: 'DNI / ID',
  monthlyFee: 'Cuota mensual',
  startDate: 'Fecha de ingreso',
}

export const FIELD_HINTS: Record<FieldKey, string> = {
  fullName: 'nombre, name, socio, cliente…',
  email: 'email, correo, mail…',
  phone: 'tel, telefono, cel, phone…',
  dni: 'dni, id, documento, doc…',
  monthlyFee: 'cuota, monto, precio, fee, ars…',
  startDate: 'fecha, ingreso, inicio, alta…',
}

const AUTO_MAP: Record<FieldKey, RegExp[]> = {
  fullName: [/nombre/i, /name/i, /socio/i, /cliente/i, /apellido/i, /alumno/i],
  email: [/email/i, /correo/i, /mail/i],
  phone: [/tel/i, /cel/i, /movil/i, /telefono/i, /phone/i],
  dni: [/dni/i, /^id$/i, /documento/i, /^doc/i],
  monthlyFee: [/cuota/i, /monto/i, /precio/i, /fee/i, /ars/i, /pago/i, /mensual/i],
  startDate: [/fecha/i, /ingreso/i, /inicio/i, /alta/i, /registro/i, /date/i],
}

export function autoMap(headers: string[]): Record<FieldKey, number | -1> {
  const result = {
    fullName: -1,
    email: -1,
    phone: -1,
    dni: -1,
    monthlyFee: -1,
    startDate: -1,
  }
  const used = new Set<number>()
  for (const key of Object.keys(AUTO_MAP) as FieldKey[]) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue
      if (AUTO_MAP[key].some((re) => re.test(headers[i]))) {
        result[key] = i
        used.add(i)
        break
      }
    }
  }
  // Fallback heuristics
  if (result.monthlyFee === -1) {
    for (let i = 0; i < headers.length; i++) {
      if (used.has(i)) continue
      if (/[0-9]/.test(headers[i])) {
        result.monthlyFee = i
        used.add(i)
        break
      }
    }
  }
  return result
}

function parseNumber(v: string): number {
  const cleaned = v.replace(/[^0-9.,-]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseDate(v: string): string {
  if (!v) return ''
  // yyyy-mm-dd or dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  let m = v.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  m = v.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const d = new Date(v)
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${dd}`
  }
  return ''
}

export interface ValidationRow {
  row: ImportedRow
  errors: string[]
}

export function buildRows(_headers: string[], rows: string[][], mapping: Record<FieldKey, number | -1>): ValidationRow[] {
  return rows.map((cells) => {
    const get = (idx: number) => (idx >= 0 && idx < cells.length ? cells[idx].trim() : '')
    const row: ImportedRow = {
      fullName: get(mapping.fullName),
      email: get(mapping.email),
      phone: get(mapping.phone),
      dni: get(mapping.dni),
      monthlyFee: parseNumber(get(mapping.monthlyFee)),
      startDate: parseDate(get(mapping.startDate)),
    }
    const errors: string[] = []
    if (!row.fullName) errors.push('Falta el nombre')
    if (row.monthlyFee <= 0) errors.push('Cuota inválida')
    if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) errors.push('Email inválido')
    if (row.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(row.startDate)) errors.push('Fecha inválida')
    return { row, errors }
  })
}