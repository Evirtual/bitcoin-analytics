import { useCallback, useState } from 'react'
import type { AssetKey } from '../assets/catalog'

const STORAGE_KEY = 'bitcoin-analytics.costBasis.v1'

export type CostBasisMap = Record<string, number>

function readStored(): CostBasisMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

    const out: CostBasisMap = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = typeof value === 'number' ? value : Number(value)
      if (Number.isFinite(n) && n > 0) out[key] = n
    }
    return out
  } catch {
    return {}
  }
}

function writeStored(map: CostBasisMap) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore localStorage failures
  }
}

/**
 * Average cost per unit, entered by hand and kept on this device.
 *
 * It stays a per-unit figure rather than a total spend so that it survives the
 * balance changing: buying more or moving some out shifts what the position is
 * worth, but not what the earlier units cost.
 */
export function useCostBasis() {
  const [basis, setBasis] = useState<CostBasisMap>(readStored)

  const setAssetCost = useCallback((assetKey: AssetKey, avgCost: number | undefined) => {
    setBasis((prev) => {
      const next = { ...prev }
      if (avgCost === undefined || !Number.isFinite(avgCost) || avgCost <= 0) {
        if (!(assetKey in next)) return prev
        delete next[assetKey]
      } else {
        if (next[assetKey] === avgCost) return prev
        next[assetKey] = avgCost
      }
      writeStored(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setBasis((prev) => {
      if (!Object.keys(prev).length) return prev
      writeStored({})
      return {}
    })
  }, [])

  return { basis, setAssetCost, clearAll }
}
