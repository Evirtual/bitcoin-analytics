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
