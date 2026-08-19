// Genera los íconos PNG de la PWA (192, 512, maskable y apple-touch-icon).
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'icons')

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = width * 4 + 1
  const raw = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function inRect(x, y, left, top, w, h) {
  return x >= left && x < left + w && y >= top && y < top + h
}

function inRoundRect(x, y, left, top, w, h, r) {
  const cx = left + w / 2
  const cy = top + h / 2
  const hw = w / 2
  const hh = h / 2
  const dx = Math.max(Math.abs(x - cx) - (hw - r), 0)
  const dy = Math.max(Math.abs(y - cy) - (hh - r), 0)
  return dx * dx + dy * dy <= r * r
}

const BG = [30, 30, 34] // #1E1E22
const FG = [244, 244, 245] // #F4F4F5

function renderIcon(size, rounded) {
  const rgba = Buffer.alloc(size * size * 4)
  const corner = size * 0.22
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inBg = rounded ? inRoundRect(x, y, 0, 0, size, size, corner) : true
      if (!inBg) continue
      // mancuerna blanca
      let hit = false
      const barW = size * 0.4
      const barH = size * 0.06
      hit = hit || inRect(x, y, (size - barW) / 2, (size - barH) / 2, barW, barH)
      const plateW = size * 0.14
      const plateH = size * 0.34
      const plateR = size * 0.028
      hit = hit || inRoundRect(x, y, size * 0.16, (size - plateH) / 2, plateW, plateH, plateR)
      hit = hit || inRoundRect(x, y, size * 0.7, (size - plateH) / 2, plateW, plateH, plateR)
      if (hit) {
        rgba[i] = FG[0]
        rgba[i + 1] = FG[1]
        rgba[i + 2] = FG[2]
        rgba[i + 3] = 255
      } else {
        rgba[i] = BG[0]
        rgba[i + 1] = BG[1]
        rgba[i + 2] = BG[2]
        rgba[i + 3] = 255
      }
    }
  }
  return encodePNG(size, size, rgba)
}

mkdirSync(OUT, { recursive: true })
const targets = [
  ['icon-192.png', 192, true],
  ['icon-512.png', 512, true],
  ['icon-maskable-512.png', 512, false],
  ['apple-touch-icon-180.png', 180, false],
]
for (const [file, size, rounded] of targets) {
  writeFileSync(join(OUT, file), renderIcon(size, rounded))
  console.log('generated', file)
}