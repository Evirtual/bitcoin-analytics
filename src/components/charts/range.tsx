import type { CandleRange } from './types'

export function RangeToggle({
  value,
  onChange,
}: {
  value: CandleRange
  onChange: (v: CandleRange) => void
}) {
  return (
    <div className="segmented" aria-label="Candle range">
      {(['1D', '1W', '1M'] as const).map((r) => (
        <button
          key={r}
          className={r === value ? 'segBtn segBtnActive' : 'segBtn'}
          type="button"
          onClick={() => onChange(r)}
        >
          <span className="segLabel">{r}</span>
        </button>
      ))}
    </div>
  )
}
