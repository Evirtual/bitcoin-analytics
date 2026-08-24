/**
 * Renders the favicon artwork into the PNG icons the install prompt needs.
 *
 * `public/favicon.svg` is fine on its own for browser tabs, but neither iOS
 * (`apple-touch-icon`) nor a maskable manifest icon accepts SVG, so the same
 * shapes are re-drawn here as raster. Keeping it dependency-free means `npm ci`
 * does not carry an image toolchain for four files that change ~never; the cost
 * is that the artwork lives in two places. If favicon.svg changes, change the
 * SHAPES below to match and re-run `npm run icons`.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BACKGROUND = [0x0b, 0x10, 0x20] // matches <meta name="theme-color">

/** Gradient stops of favicon.svg's `#rainbow`, across x = 6 → 58. */
const GRADIENT = [
  { at: 0.0, rgb: [0xef, 0x44, 0x44] },
  { at: 0.5, rgb: [0xf5, 0x9e, 0x0b] },
  { at: 1.0, rgb: [0x22, 0xc5, 0x5e] },
]

/**
 * favicon.svg's shapes, in its 64x64 viewBox, painted in order. Each returns a
 * signed distance in viewBox units: negative inside, zero on the edge. Working
 * in distances (rather than sampling a filled shape) is what gives smooth edges
 * at 512px from a 64-unit source.
 */
const SHAPES = [
  // The gauge arc: every point 26 from (32,44), upper half only, stroked 10 wide
  // with round caps. Clamping to the endpoints below the diameter *is* the cap.
  {
    gradient: true,
    sdf: (x, y) => {
      const dx = x - 32
      const dy = y - 44
      const d =
        dy <= 0
          ? Math.abs(Math.hypot(dx, dy) - 26)
          : Math.min(Math.hypot(x - 6, dy), Math.hypot(x - 58, dy))
      return d - 5
    },
  },
  { rgb: [0xf5, 0x9e, 0x0b], sdf: (x, y) => Math.hypot(x - 19, y - 21.5) - 3.6 },
  { rgb: [0x22, 0xc5, 0x5e], sdf: (x, y) => Math.hypot(x - 45, y - 21.5) - 3.6 },
  // Knob: white disc, dark 1.2-wide outline centred on r=6.2, dark centre dot.
  { rgb: [0xff, 0xff, 0xff], sdf: (x, y) => Math.hypot(x - 32, y - 18) - 6.2 },
  { rgb: BACKGROUND, sdf: (x, y) => Math.abs(Math.hypot(x - 32, y - 18) - 6.2) - 0.6 },
  { rgb: BACKGROUND, sdf: (x, y) => Math.hypot(x - 32, y - 18) - 3.1 },
]

/** Bounding box of the painted artwork, stroke widths included. */
const ART = { x0: 1, x1: 63, y0: 11.2, y1: 49 }

function gradientAt(x) {
  const t = Math.min(1, Math.max(0, (x - 6) / 52))
  let i = 1
  while (i < GRADIENT.length - 1 && t > GRADIENT[i].at) i++
  const a = GRADIENT[i - 1]
  const b = GRADIENT[i]
  const k = (t - a.at) / (b.at - a.at)
  return a.rgb.map((c, j) => c + (b.rgb[j] - c) * k)
}

/**
 * @param size    output edge length in pixels
 * @param artWidth how much of that edge the artwork should span, 0..1
 */
function render(size, artWidth) {
  const scale = (size * artWidth) / (ART.x1 - ART.x0)
  const offsetX = size / 2 - ((ART.x0 + ART.x1) / 2) * scale
  const offsetY = size / 2 - ((ART.y0 + ART.y1) / 2) * scale

  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Sample at the pixel centre, in viewBox units.
      const x = (px + 0.5 - offsetX) / scale
      const y = (py + 0.5 - offsetY) / scale

      let [r, g, b] = BACKGROUND
      for (const shape of SHAPES) {
        // Coverage from the distance to the edge: one pixel of falloff, which
        // is the antialiasing.
        const coverage = Math.min(1, Math.max(0, 0.5 - shape.sdf(x, y) * scale))
        if (coverage <= 0) continue
        const [sr, sg, sb] = shape.gradient ? gradientAt(x) : shape.rgb
        r += (sr - r) * coverage
        g += (sg - g) * coverage
        b += (sb - b) * coverage
      }

      const i = (py * size + px) * 4
      pixels[i] = Math.round(r)
      pixels[i + 1] = Math.round(g)
      pixels[i + 2] = Math.round(b)
      pixels[i + 3] = 255
    }
  }
  return pixels
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12: deflate, adaptive filtering, no interlace — all zero.

  // One scanline per row, each prefixed with filter type 0 (none). The image is
  // smooth gradients over a flat field, so deflate does the work regardless.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// artWidth per target:
//  - 0.80 full-bleed, for manifest `purpose: any` and the browser's own use.
//  - 0.66 keeps the art inside the maskable safe zone (the middle 80% circle)
//    even once a launcher crops to a circle.
//  - 0.72 leaves room for the corner radius iOS applies to home-screen icons.
const TARGETS = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  ['icon-maskable-512.png', 512, 0.66],
  ['apple-touch-icon.png', 180, 0.72],
]

for (const [name, size, artWidth] of TARGETS) {
  const file = png(size, render(size, artWidth))
  writeFileSync(join(PUBLIC_DIR, name), file)
  console.log(`${name.padEnd(24)} ${size}x${size}  ${(file.length / 1024).toFixed(1)} KB`)
}
