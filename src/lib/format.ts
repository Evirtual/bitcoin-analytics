export const usd = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
})
