import { useEffect, useRef, useState } from 'react'
import { useOutsideClick } from '../../hooks/useOutsideClick'

export function MarketDashboardMeta({ isRefreshing }: { isRefreshing: boolean }) {
  const [infoPinned, setInfoPinned] = useState(false)
  const [infoHover, setInfoHover] = useState(false)
  const [infoFocus, setInfoFocus] = useState(false)

  const infoOpen = infoPinned || infoHover || infoFocus
  const wrapRef = useRef<HTMLSpanElement>(null)

  useOutsideClick(
    wrapRef,
    () => {
      setInfoPinned(false)
      setInfoHover(false)
      setInfoFocus(false)
    },
    infoOpen,
  )

  useEffect(() => {
    if (!infoOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setInfoPinned(false)
      setInfoHover(false)
      setInfoFocus(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [infoOpen])

  return (
    <div className="dashboardMeta muted small">
      <span>{isRefreshing ? 'Refreshing…' : 'Market dashboard'}</span>
      <span
        ref={wrapRef}
        className="infoWrap"
        onMouseEnter={() => setInfoHover(true)}
        onMouseLeave={() => setInfoHover(false)}
      >
        <button
          type="button"
          className="infoBtn"
          aria-label="About this market dashboard"
          aria-expanded={infoOpen}
          aria-describedby={infoOpen ? 'market-dashboard-tooltip' : undefined}
          onFocus={() => setInfoFocus(true)}
          onBlur={() => setInfoFocus(false)}
          onClick={() => setInfoPinned((v) => !v)}
        >
          i
        </button>
        {infoOpen ? (
          <div className="infoTooltip" id="market-dashboard-tooltip" role="tooltip">
            <div className="infoTooltipTitle">How this data is fetched</div>
            <div className="infoTooltipRow">
              <span className="infoTooltipKey">Spot price:</span> Coinbase spot API (fallback to Kraken).
            </div>
            <div className="infoTooltipRow">
              <span className="infoTooltipKey">Charts:</span> Hourly candles from Coinbase Exchange (fallback to Kraken OHLC).
            </div>
            <div className="infoTooltipRow">
              <span className="infoTooltipKey">Sentiment:</span> Fear &amp; Greed Index from alternative.me.
            </div>
            <div className="infoTooltipDivider" />
            <div className="infoTooltipRow">
              <span className="infoTooltipKey">Update interval:</span> Prices refresh about every 60 seconds; other metrics refresh every few minutes.
            </div>
          </div>
        ) : null}
      </span>
    </div>
  )
}
