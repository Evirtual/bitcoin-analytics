import type { CandleRange } from './types'

export function rangeToDays(r: CandleRange) {
  if (r === '1D') return 1
  if (r === '1M') return 30
  return 7
}
