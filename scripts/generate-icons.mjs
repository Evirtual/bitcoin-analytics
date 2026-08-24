/**
 * Rasterises public/favicon.svg into the PNG app icons.
 *
 * Neither iOS (`apple-touch-icon`) nor a maskable manifest entry accepts SVG,
 * so the mark has to exist as PNG too. Reading the SVG rather than restating its
 * artwork means there is one copy of the branding: change favicon.svg and re-run
 * `npm run icons`.
 *
 * The renderer below only covers what favicon.svg actually uses — circles, and
 * paths of straight lines and cubic curves. It is not a general SVG engine; a
 * file with arcs, transforms, gradients or strokes will not come out right.
 */
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

/** Behind the mark on every icon. Matches <meta name="theme-color">. */
const BACKGROUND = [0x0b, 0x10, 0x20]

/**
 * Samples per pixel per axis before downsampling. The artwork is a 32-unit
 * viewBox blown up to 512px, so edges are what the eye lands on; 4x4 box
 * sampling is enough to keep them smooth without an analytic coverage pass.
 */
const SS = 4

/** Straight-line segments per cubic. At these sizes the seams are invisible. */
const CURVE_STEPS = 24

// ---------------------------------------------------------------- SVG parsing

function parseColor(value) {
  const hex = value.trim().replace('#', '')
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
}

/** Splits a path's numbers, coping with "1.5-2.5" and ".3.4" running together. */
function numbers(chunk) {
  return (chunk.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
}

function flattenCubic(points, from, c1, c2, to) {
  for (let i = 1; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS
    const u = 1 - t
    points.push([
      u * u * u * from[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * to[0],
      u * u * u * from[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * to[1],
    ])
  }
}

/**
 * Turns a path's `d` into closed polygons. Only the commands favicon.svg uses
 * are handled; anything else would silently distort the mark, so it throws.
 */
function pathToPolygons(d) {
  const polygons = []
  let points = []
  let cursor = [0, 0]
  let start = [0, 0]
  // Where the previous cubic's second control point was, mirrored for `s`.
  let lastControl = null

  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? []

  for (const command of commands) {
    const code = command[0]
    const relative = code === code.toLowerCase()
    const args = numbers(command.slice(1))

    const close = () => {
      if (points.length > 2) polygons.push(points)
      points = []
    }

    switch (code.toUpperCase()) {
      case 'M': {
        close()
        for (let i = 0; i < args.length; i += 2) {
          const point = relative
            ? [cursor[0] + args[i], cursor[1] + args[i + 1]]
            : [args[i], args[i + 1]]
          // Only the first pair is a move; the rest are an implicit lineto.
          if (i === 0) {
            start = point
            points = [point]
          } else {
            points.push(point)
          }
          cursor = point
        }
        lastControl = null
        break
      }
      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          cursor = relative
            ? [cursor[0] + args[i], cursor[1] + args[i + 1]]
            : [args[i], args[i + 1]]
          points.push(cursor)
        }
        lastControl = null
        break
      }
      case 'H': {
        for (const value of args) {
          cursor = [relative ? cursor[0] + value : value, cursor[1]]
          points.push(cursor)
        }
        lastControl = null
        break
      }
      case 'V': {
        for (const value of args) {
          cursor = [cursor[0], relative ? cursor[1] + value : value]
          points.push(cursor)
        }
        lastControl = null
        break
      }
      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          const base = relative ? cursor : [0, 0]
          const c1 = [base[0] + args[i], base[1] + args[i + 1]]
          const c2 = [base[0] + args[i + 2], base[1] + args[i + 3]]
          const to = [base[0] + args[i + 4], base[1] + args[i + 5]]
          flattenCubic(points, cursor, c1, c2, to)
          lastControl = c2
          cursor = to
        }
        break
      }
      case 'S': {
        for (let i = 0; i < args.length; i += 4) {
          const base = relative ? cursor : [0, 0]
          // The first control point mirrors the previous curve's second one,
          // which is what makes the join smooth.
          const c1 = lastControl
            ? [2 * cursor[0] - lastControl[0], 2 * cursor[1] - lastControl[1]]
            : cursor
          const c2 = [base[0] + args[i], base[1] + args[i + 1]]
          const to = [base[0] + args[i + 2], base[1] + args[i + 3]]
          flattenCubic(points, cursor, c1, c2, to)
          lastControl = c2
          cursor = to
        }
        break
      }
      case 'Z': {
        close()
        cursor = start
        lastControl = null
        break
      }
      default:
        throw new Error(`generate-icons: unsupported path command "${code}" in favicon.svg`)
    }
  }

  if (points.length > 2) polygons.push(points)
  return polygons
}

function circleToPolygon(cx, cy, r, segments = 256) {
  return [
    Array.from({ length: segments }, (_, i) => {
      const angle = (i / segments) * Math.PI * 2
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]
    }),
  ]
}

/** Pulls the circles and paths out of favicon.svg, in document order. */
function readArtwork() {
  const svg = readFileSync(join(PUBLIC_DIR, 'favicon.svg'), 'utf8')

  const viewBox = svg.match(/viewBox="([^"]+)"/)
  if (!viewBox) throw new Error('generate-icons: favicon.svg has no viewBox')
  const [, , vbWidth, vbHeight] = numbers(viewBox[1])

  const shapes = []
  for (const [tag] of svg.matchAll(/<(?:circle|path)\b[^>]*>/g)) {
    const fill = tag.match(/fill="([^"]+)"/)
    if (!fill || fill[1] === 'none') continue
    const color = parseColor(fill[1])

    if (tag.startsWith('<circle')) {
      const cx = Number(tag.match(/cx="([^"]+)"/)?.[1] ?? 0)
      const cy = Number(tag.match(/cy="([^"]+)"/)?.[1] ?? 0)
      const r = Number(tag.match(/r="([^"]+)"/)?.[1] ?? 0)
      shapes.push({ color, polygons: circleToPolygon(cx, cy, r) })
    } else {
      const d = tag.match(/\sd="([^"]+)"/)
      if (d) shapes.push({ color, polygons: pathToPolygons(d[1]) })
    }
  }

  if (shapes.length === 0) throw new Error('generate-icons: no filled shapes in favicon.svg')
  return { shapes, vbWidth, vbHeight }
}

// ------------------------------------------------------------------ rendering

/**
 * Scanline fill with the nonzero winding rule, which is what the mark's `d`
 * declares — the counters inside the B are carved out by winding direction, so
 * an even-odd fill would leave them solid.
 *
 * Returns per-pixel coverage in 0..1 at the final resolution.
 */
function rasterize(polygons, size, scale, offsetX, offsetY) {
  const hits = new Float32Array(size * size)
  const edges = []

  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]
      const b = polygon[(i + 1) % polygon.length]
      const ay = a[1] * scale + offsetY
      const by = b[1] * scale + offsetY
      if (ay === by) continue // horizontal edges never cross a scanline
      edges.push({
        x0: a[0] * scale + offsetX,
        y0: ay,
        x1: b[0] * scale + offsetX,
        y1: by,
        winding: by > ay ? 1 : -1,
      })
    }
  }

  const crossings = []
  for (let sy = 0; sy < size * SS; sy++) {
    const y = (sy + 0.5) / SS
    crossings.length = 0

    for (const e of edges) {
      const top = Math.min(e.y0, e.y1)
      const bottom = Math.max(e.y0, e.y1)
      if (y < top || y >= bottom) continue
      crossings.push({
        x: e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0),
        winding: e.winding,
      })
    }
    if (crossings.length === 0) continue

    crossings.sort((a, b) => a.x - b.x)

    let winding = 0
    const row = Math.floor(sy / SS) * size
    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i].winding
      if (winding === 0) continue

      // Inside: accumulate the subsamples this span covers on the real row.
      const from = crossings[i].x
      const to = crossings[i + 1].x
      for (let sx = Math.max(0, Math.ceil(from * SS - 0.5)); sx < size * SS; sx++) {
        const x = (sx + 0.5) / SS
        if (x >= to) break
        if (x < 0) continue
        const col = Math.floor(x)
        if (col >= size) break
        hits[row + col] += 1
      }
    }
  }

  const samples = SS * SS
  for (let i = 0; i < hits.length; i++) hits[i] = Math.min(1, hits[i] / samples)
  return hits
}

/**
 * @param size     output edge length in pixels
 * @param artWidth how much of that edge the mark should span, 0..1
 */
function render(size, artWidth) {
  const { shapes, vbWidth, vbHeight } = readArtwork()

  const scale = (size * artWidth) / vbWidth
  const offsetX = (size - vbWidth * scale) / 2
  const offsetY = (size - vbHeight * scale) / 2

  const pixels = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = BACKGROUND[0]
    pixels[i * 4 + 1] = BACKGROUND[1]
    pixels[i * 4 + 2] = BACKGROUND[2]
    pixels[i * 4 + 3] = 255
  }

  for (const shape of shapes) {
    const coverage = rasterize(shape.polygons, size, scale, offsetX, offsetY)
    for (let i = 0; i < coverage.length; i++) {
      const a = coverage[i]
      if (a <= 0) continue
      for (let c = 0; c < 3; c++) {
        const at = i * 4 + c
        pixels[at] = Math.round(pixels[at] + (shape.color[c] - pixels[at]) * a)
      }
    }
  }

  return pixels
}

// --------------------------------------------------------------- PNG encoding

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

  // One scanline per row, each prefixed with filter type 0 (none).
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
//  - 0.78 full-bleed, for manifest `purpose: any` and the browser's own use.
//  - 0.62 keeps the mark inside the maskable safe zone (the middle 80%) even
//    once a launcher crops it to a circle.
//  - 0.72 leaves room for the corner radius iOS applies to home-screen icons.
const TARGETS = [
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  ['icon-maskable-512.png', 512, 0.62],
  ['apple-touch-icon.png', 180, 0.72],
]

for (const [name, size, artWidth] of TARGETS) {
  const file = png(size, render(size, artWidth))
  writeFileSync(join(PUBLIC_DIR, name), file)
  console.log(`${name.padEnd(24)} ${size}x${size}  ${(file.length / 1024).toFixed(1)} KB`)
}
