import { InfoTip } from '../InfoTip'

export function MarketDashboardMeta() {
  return (
    <div className="dashboardMeta muted">
      <InfoTip label="About this market dashboard" title="How this data is fetched">
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
          <span className="infoTooltipKey">Update interval:</span> Prices refresh about every 60 seconds; other metrics
          refresh every few minutes.
        </div>
      </InfoTip>
    </div>
  )
}

