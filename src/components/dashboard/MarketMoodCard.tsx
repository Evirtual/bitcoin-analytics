import { useMemo } from 'react'
import { useFearGreedIndex } from '../../hooks/useFearGreed'

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (Math.PI / 180) * angleDeg
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg)
  const end = polarToCartesian(cx, cy, r, endDeg)
  const delta = ((endDeg - startDeg) % 360 + 360) % 360
  const largeArc = delta > 180 ? 1 : 0
  // Our angle convention matches screen coordinates; sweep=1 draws the arc along increasing angles.
  const sweep = 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
}

function moodLabel(value: number): string {
  // Intentionally avoids the words “fear” and “greed”.
  if (value <= 24) return 'Deep Freeze'
  if (value <= 44) return 'Cautious'
  if (value <= 55) return 'Balanced'
  if (value <= 74) return 'Optimistic'
  return 'Euphoric'
}

export function MarketMoodCard() {
  const q = useFearGreedIndex()

  const value = q.data?.value
  const label = value !== undefined ? moodLabel(value) : undefined

  const pointer = useMemo(() => {
    const v = value !== undefined ? clamp01(value / 100) : 0
    // 0 → left, 100 → right across the top semicircle.
    const angle = 180 + v * 180
    const cx = 100
    const cy = 100
    const r = 74
    const p = polarToCartesian(cx, cy, r, angle)
    return { angle, x: p.x, y: p.y }
  }, [value])

  return (
    <div className="kpiCard moodCard">
      <div className="kpiLabel">Market Mood</div>

      <div className="moodGauge" aria-label={label ? `Market mood ${label}, index ${Math.round(value ?? 0)}` : 'Market mood'}>
        <svg viewBox="0 0 200 120" role="img" focusable="false">
          <path d={arcPath(100, 100, 74, 180, 240)} className="moodArc moodArcLow" />
          <path d={arcPath(100, 100, 74, 240, 300)} className="moodArc moodArcMid" />
          <path d={arcPath(100, 100, 74, 300, 360)} className="moodArc moodArcHigh" />

          <circle cx={pointer.x} cy={pointer.y} r={9} className="moodPointerOuter" />
          <circle cx={pointer.x} cy={pointer.y} r={5} className="moodPointerInner" />
        </svg>

        <div className="moodCenter">
          <div className="moodValue">
            {value !== undefined ? Math.round(value) : q.isLoading ? '…' : '—'}
          </div>
          <div className="moodLabel">{label ?? (q.isLoading ? 'Loading…' : 'Unavailable')}</div>
        </div>
      </div>
    </div>
  )
}
