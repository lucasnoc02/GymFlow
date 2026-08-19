import type { GymBrandConfig } from '../types'

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// Texto legible sobre el color de acento (contraste sin romper legibilidad)
export function contrastInk(hex: string): string {
  return luminance(hex) > 0.5 ? '#0f0f11' : '#ffffff'
}

export function shade(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const t = amount < 0 ? 0 : 255
  const p = Math.abs(amount)
  return rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p)
}

// Extrae el color dominante de una imagen (logo) usando HTML5 Canvas.
export async function extractDominantColor(dataUrl: string): Promise<string | null> {
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()

    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)

    const data = ctx.getImageData(0, 0, size, size).data
    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < 110) continue // transparentes
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      // descarta blancos/near-blancos (fondos de logo)
      if (lum > 238 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18) continue
      const key = `${r >> 4},${g >> 4},${b >> 4}`
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.r += r
        bucket.g += g
        bucket.b += b
        bucket.count += 1
      } else {
        buckets.set(key, { r, g, b, count: 1 })
      }
    }

    let best: { r: number; g: number; b: number; count: number } | null = null
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket
    }
    if (!best) return null
    return rgbToHex(best.r / best.count, best.g / best.count, best.b / best.count)
  } catch {
    return null
  }
}

const ACCENT_VARS = ['--color-accent', '--color-accent-strong', '--color-accent-ink'] as const
const OK_VARS = ['--color-ok', '--color-ok-strong', '--color-ok-muted', '--color-ok-ink'] as const

// Aplica (o revierte) el tema dinámico según la configuración de marca.
export function applyBrandTheme(brand: GymBrandConfig | undefined) {
  const root = document.documentElement
  const enabled = !!brand?.enableAutoTheme && !!brand?.accentColor
  if (!enabled) {
    for (const v of ACCENT_VARS) root.style.removeProperty(v)
    for (const v of OK_VARS) root.style.removeProperty(v)
    return
  }
  const accent = brand.accentColor as string
  const { r, g, b } = hexToRgb(accent)
  const ink = contrastInk(accent)
  root.style.setProperty('--color-accent', accent)
  root.style.setProperty('--color-accent-strong', shade(accent, -0.12))
  root.style.setProperty('--color-accent-ink', ink)
  root.style.setProperty('--color-ok', accent)
  root.style.setProperty('--color-ok-strong', shade(accent, -0.12))
  root.style.setProperty('--color-ok-muted', `rgba(${r}, ${g}, ${b}, 0.14)`)
  root.style.setProperty('--color-ok-ink', ink)
}
