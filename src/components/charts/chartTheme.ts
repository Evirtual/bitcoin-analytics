import type { CSSProperties } from 'react'

export const tooltipContentStyle: CSSProperties = {
  background: 'var(--tooltipBg)',
  border: '0.0625em solid var(--tooltipBorder)',
  borderRadius: '0.75em',
  padding: '0.625em 0.75em',
  boxShadow: 'var(--tooltipShadow)',
  color: 'var(--tooltipText)',
}

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--tooltipLabel)',
  marginBottom: '0.375em',
}

export const tooltipItemStyle: CSSProperties = {
  color: 'var(--tooltipText)',
  padding: 0,
}

// Price-scale series have no meaningful zero -- nobody reads "BTC is 110,000
// above nothing" -- so their axis frames the data with a little room instead of
// starting from the ground, which would squeeze a week's movement into a few
// pixels at the top. Charts that do measure from zero (drawdown, volatility,
// volume) keep the default.
// 'auto' rather than a computed margin: recharts only rounds tick labels to
// readable numbers when it is allowed to pick the bounds, and the rounding
// leaves the headroom a hand-rolled 2% would have added anyway.
export const paddedDomain: ['auto', 'auto'] = ['auto', 'auto']
