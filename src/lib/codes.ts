// Caracteres sin ambigüedad (sin 0/O, 1/I, ni L)
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateAccessCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return code
}

export function ensureUniqueCode(existing: string[]): string {
  const used = new Set(existing.map((c) => c.toUpperCase()).filter(Boolean))
  let code = generateAccessCode()
  let guard = 0
  while (used.has(code) && guard < 100) {
    code = generateAccessCode()
    guard += 1
  }
  return code
}