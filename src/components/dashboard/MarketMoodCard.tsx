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

// The colour bands are the label thresholds, so the ring and the word always
// agree about which zone the needle is in. Boundaries sit between the two
// values they separate. A small gap keeps the rounded ends from overlapping.
const MOOD_BANDS = [
  { from: 0, to: 24.5, className: 'moodArcFreeze' },
  { from: 24.5, to: 44.5, className: 'moodArcCautious' },
  { from: 44.5, to: 55.5, className: 'moodArcBalanced' },
  { from: 55.5, to: 74.5, className: 'moodArcOptimistic' },
  { from: 74.5, to: 100, className: 'moodArcEuphoric' },
]

const BAND_GAP_DEG = 1.5

// 0 → left of the semicircle, 100 → right.
function valueToAngle(value: number) {
  return 180 + (value / 100) * 180
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
          {MOOD_BANDS.map((band, index) => {
            const start = valueToAngle(band.from) + (index === 0 ? 0 : BAND_GAP_DEG / 2)
            const end = valueToAngle(band.to) - (index === MOOD_BANDS.length - 1 ? 0 : BAND_GAP_DEG / 2)
            return <path key={band.className} d={arcPath(100, 100, 74, start, end)} className={`moodArc ${band.className}`} />
          })}

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
