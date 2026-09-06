import type { AssetKey } from '../../assets/catalog'
import { ASSETS } from '../../assets/catalog'

// Only worth drawing when there is more than one line to tell apart -- a single
// line is already named by the card's own accent.
export function ChartLegend({ assetKeys }: { assetKeys: AssetKey[] }) {
  if (assetKeys.length < 2) return null

  return (
    <ul className="chartLegend">
      {assetKeys.map((assetKey) => {
        const asset = ASSETS[assetKey]
        return (
          <li key={assetKey} className={asset.stable ? 'chartLegendItem chartLegendItemStable' : 'chartLegendItem'}>
            <span className="chartLegendDot" style={{ background: asset.accent }} aria-hidden="true" />
            {assetKey}
          </li>
        )
      })}
    </ul>
  )
}
