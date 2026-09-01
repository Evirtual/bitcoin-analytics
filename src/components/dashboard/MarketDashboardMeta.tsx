import { useCallback, useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import { useOutsideClick } from '../../hooks/useOutsideClick'

export function MarketDashboardMeta() {
  const [infoPinned, setInfoPinned] = useState(false)
  const [infoHover, setInfoHover] = useState(false)
  const [infoFocus, setInfoFocus] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const infoOpen = infoPinned || (!isMobile && (infoHover || infoFocus))
  const wrapRef = useRef<HTMLSpanElement>(null)

  const closeInfo = useCallback(() => {
    setInfoPinned(false)
    setInfoHover(false)
    setInfoFocus(false)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 43.5rem)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useOutsideClick(wrapRef, closeInfo, infoOpen)

  useEffect(() => {
    if (!infoOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      closeInfo()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeInfo, infoOpen])

  useEffect(() => {
    if (!isMobile || !infoOpen) return
    // Prevent background scroll when the mobile popup is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [infoOpen, isMobile])

  return (
    <div className="dashboardMeta muted">
      {isMobile && infoOpen ? <div className="infoBackdrop" onClick={closeInfo} aria-hidden="true" /> : null}
      <span
        ref={wrapRef}
        className="infoWrap"
        onMouseEnter={() => (isMobile ? undefined : setInfoHover(true))}
        onMouseLeave={() => (isMobile ? undefined : setInfoHover(false))}
      >
        <button
          type="button"
          className="infoBtn"
          aria-label="About this market dashboard"
          aria-expanded={infoOpen}
          aria-describedby={infoOpen ? 'market-dashboard-tooltip' : undefined}
          onFocus={() => (isMobile ? undefined : setInfoFocus(true))}
          onBlur={() => (isMobile ? undefined : setInfoFocus(false))}
          onClick={() => setInfoPinned((v) => !v)}
        >
          <Info size={17} strokeWidth={1.9} aria-hidden="true" />
        </button>
        {infoOpen ? (
          <div
            className={isMobile ? 'infoTooltip infoTooltipMobile' : 'infoTooltip'}
            id="market-dashboard-tooltip"
            role="tooltip"
          >
            {isMobile ? (
              <button type="button" className="infoTooltipClose" onClick={closeInfo} aria-label="Close">
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
            <div className="infoTooltipTitle">How this data is fetched</div>
            <div className="infoTooltipRow">
              <span className="infoTooltipKey">Spot price:</span> Kraken ticker (fallback to Coinbase).
            </div>
            <div className="infoTooltipRow">
              <span className="infoTooltipKey">Charts:</span> Hourly candles from Kraken OHLC (fallback to Coinbase
              Exchange).
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
