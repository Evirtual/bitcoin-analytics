export type CandleRange = '1D' | '1W' | '1M'

export type CandlePoint = {
  t: string
  ts?: number
  price: number
  volume: number
}
