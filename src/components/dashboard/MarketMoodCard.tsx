import { useMemo } from 'react'
import { useFearGreedIndex } from '../../hooks/useFearGreed'
import { InfoTip } from '../InfoTip'

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

// One smooth ramp rather than five flat segments. Each colour is anchored at the
// middle of the zone it belongs to, so the needle sits over its own colour while
// the transitions between zones stay soft.
const MOOD_STOPS = [
  { at: 0, className: 'moodStopFreeze' },
  { at: 12, className: 'moodStopFreeze' },
  { at: 34.5, className: 'moodStopCautious' },
  { at: 50, className: 'moodStopBalanced' },
  { at: 65, className: 'moodStopOptimistic' },
  { at: 87.5, className: 'moodStopEuphoric' },
  { at: 100, className: 'moodStopEuphoric' },
]

// 0 → left of the semicircle, 100 → right.
function valueToAngle(value: number) {
  return 180 + (value / 100) * 180
}

// The gradient runs left to right across the arc's bounding box, and a value's
// horizontal position on a semicircle is not linear in the value, so each stop
// is placed where its own value actually sits.
function valueToOffset(value: number) {
  return (1 + Math.cos((Math.PI / 180) * valueToAngle(value))) / 2
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
    const angle = valueToAngle(v * 100)
    const cx = 100
    const cy = 100
    const r = 74
    const p = polarToCartesian(cx, cy, r, angle)
    return { angle, x: p.x, y: p.y }
  }, [value])

  return (
    <div className="kpiCard moodCard">
      <div className="kpiLabelRow">
        <div className="kpiLabel">Market Mood</div>
        <InfoTip className="cardHeadingInfo" size={14} label="About market mood" title="Market mood">
          A crowd sentiment index published by alternative.me, scored 0 to 100. Low means the market is anxious, high
          means it is confident. It reads mood rather than price, so it can sit high while the price falls.
        </InfoTip>
      </div>

      <div className="moodGauge" aria-label={label ? `Market mood ${label}, index ${Math.round(value ?? 0)}` : 'Market mood'}>
        <svg viewBox="0 0 200 120" role="img" focusable="false">
          <defs>
            <linearGradient id="moodRamp" gradientUnits="userSpaceOnUse" x1={26} y1={0} x2={174} y2={0}>
              {MOOD_STOPS.map((stop) => (
                <stop key={`${stop.className}-${stop.at}`} offset={valueToOffset(stop.at)} className={stop.className} />
              ))}
            </linearGradient>
          </defs>

          <path d={arcPath(100, 100, 74, 180, 360)} className="moodArc" stroke="url(#moodRamp)" />

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
