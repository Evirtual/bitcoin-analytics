import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { useCallback, useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ASSETS, type AssetKey, type ChainId } from './assets/catalog'
import { useAssetBalances, useUserAssetTotals } from './hooks/useAssetBalances'
import { useCandles, useChange24h, useSpotUsd, useSpotUsdMany } from './hooks/useMarket'
import { useGasBalances } from './hooks/useGasBalances'
import { AssetIcon } from './components/AssetIcon'
import type { CandleRange } from './components/charts/types'
import { ChartFrame } from './components/charts/ChartFrame'
import { RangeToggle } from './components/charts/range'
import { rangeToDays } from './components/charts/rangeUtils'
import { tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from './components/charts/chartTheme'
import { PriceChartCard } from './components/charts/PriceChartCard'
import { VolumeChartCard } from './components/charts/VolumeChartCard'
import { DrawdownChartCard } from './components/charts/DrawdownChartCard'
import { VolatilityChartCard } from './components/charts/VolatilityChartCard'
import { ReturnsChartCard } from './components/charts/ReturnsChartCard'
import { Header } from './components/dashboard/Header'
import { AccountModal } from './components/wallet/AccountModal'
import { ConnectWalletModal } from './components/wallet/ConnectWalletModal'
import { useTheme } from './hooks/useTheme'
import { usd } from './lib/format'
import './App.css'

function formatConnectErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('wallet_requestpermissions') && m.includes('already pending')) {
    return 'A wallet connection request is already pending. Open MetaMask and approve it, or wait and try again.'
  }
  if (m.includes('already pending')) {
    return 'A wallet connection request is already pending. Please wait and try again.'
  }
  return message
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const { address, isConnected, chain } = useAccount()
  const {
    connectors,
    connect,
    connectAsync,
    isPending: isConnecting,
    error: connectError,
  } = useConnect()
  const { disconnect } = useDisconnect()

  const [connectUiPending, setConnectUiPending] = useState(false)

  const connectDisabled = isConnecting || connectUiPending

  const connectErrorText = useMemo(() => {
    return connectError?.message ? formatConnectErrorMessage(connectError.message) : undefined
  }, [connectError])

  const runConnect = useCallback(
    async (connector: (typeof connectors)[number]) => {
      if (connectDisabled) return

      setConnectUiPending(true)
      try {
        if (connectAsync) {
          await connectAsync({ connector })
        } else {
          connect({ connector })
        }
      } finally {
        setConnectUiPending(false)
      }
    },
    [connect, connectAsync, connectDisabled],
  )

  const chainIds = useMemo<ChainId[]>(() => [1, 8453, 56], [])

  const supportedAssetKeys = useMemo<AssetKey[]>(() => ['BTC', 'ETH', 'USDT', 'USDC'], [])
  const assetTotals = useUserAssetTotals(address, chainIds, supportedAssetKeys)

  const spotMany = useSpotUsdMany(supportedAssetKeys)

  const [assetKey, setAssetKey] = useState<AssetKey>('BTC')
  // Selected asset metadata is read via ASSETS[assetKey] where needed.

  const accent = ASSETS[assetKey].accent
  const accentSoft = ASSETS[assetKey].accentSoft

  const spotUsd = useSpotUsd(assetKey)
  const change24h = useChange24h(assetKey)

  const [priceRange, setPriceRange] = useState<CandleRange>('1W')
  const [volumeRange, setVolumeRange] = useState<CandleRange>('1W')
  const [returnsRange, setReturnsRange] = useState<CandleRange>('1W')
  const [drawdownRange, setDrawdownRange] = useState<CandleRange>('1W')
  const [volRange, setVolRange] = useState<CandleRange>('1W')
  const [portfolioRange, setPortfolioRange] = useState<CandleRange>('1W')

  const priceDays = useMemo(() => rangeToDays(priceRange) as 1 | 7 | 30, [priceRange])
  const volumeDays = useMemo(() => rangeToDays(volumeRange) as 1 | 7 | 30, [volumeRange])
  const returnsDays = useMemo(() => rangeToDays(returnsRange) as 1 | 7 | 30, [returnsRange])
  const drawdownDays = useMemo(() => rangeToDays(drawdownRange) as 1 | 7 | 30, [drawdownRange])
  const volDays = useMemo(() => rangeToDays(volRange) as 1 | 7 | 30, [volRange])

  const priceCandles = useCandles(assetKey, priceDays)
  const volumeCandles = useCandles(assetKey, volumeDays)
  const returnsCandles = useCandles(assetKey, returnsDays)
  const drawdownCandles = useCandles(assetKey, drawdownDays)
  const volCandles = useCandles(assetKey, volDays)

  const balances = useAssetBalances(address, assetKey, chainIds)
  const gas = useGasBalances(address, chainIds)

  const portfolioUsd =
    spotUsd.data && balances.data ? spotUsd.data * balances.data.totalAmount : undefined

  const portfolioByAsset = useMemo(() => {
    const totals = assetTotals.data ?? []
    const items = totals.map((t) => {
      const price = spotMany.data.get(t.assetKey)
      const usdValue = price !== undefined ? price * t.totalAmount : 0
      return {
        assetKey: t.assetKey,
        amount: t.totalAmount,
        usd: usdValue,
        usdLabel: usd.format(usdValue),
      }
    })
    const totalUsd = items.reduce((acc, i) => acc + (Number.isFinite(i.usd) ? i.usd : 0), 0)
    return { items, totalUsd }
  }, [assetTotals.data, spotMany.data])

  const [connectOpen, setConnectOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const range7d = useMemo(() => {
    const pts = priceCandles.data ?? []
    if (!pts.length) return undefined
    let lo = Infinity
    let hi = -Infinity
    for (const p of pts) {
      lo = Math.min(lo, p.price)
      hi = Math.max(hi, p.price)
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined
    return { lo, hi, pct: lo > 0 ? ((hi - lo) / lo) * 100 : 0 }
  }, [priceCandles.data])

  const assetOptions = supportedAssetKeys

  const heldSet = useMemo(() => {
    const set = new Set<AssetKey>()
    for (const a of assetTotals.data ?? []) {
      if ((a.totalAmount ?? 0) > 0) set.add(a.assetKey)
    }
    return set
  }, [assetTotals.data])

  return (
    <div
      className="page"
      style={
        {
          ['--accent' as unknown as string]: accent,
          ['--accentSoft' as unknown as string]: accentSoft,
        } as React.CSSProperties
      }
    >
      <Header
        assetKey={assetKey}
        isConnected={isConnected}
        address={address}
        chain={chain}
        onOpenConnect={() => setConnectOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        connectDisabled={connectDisabled}
      />

      {connectErrorText ? <div className="banner error">{connectErrorText}</div> : null}

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Asset selector">
          {assetOptions.map((k) => (
            <button
              key={k}
              className={k === assetKey ? 'segBtn segBtnActive' : 'segBtn'}
              onClick={() => setAssetKey(k)}
              type="button"
            >
              <AssetIcon assetKey={k} size={16} />
              <span className="segLabel">{k}</span>
              {isConnected && heldSet.has(k) ? <span className="segDot" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
        <div className="muted small">{assetTotals.isLoading ? 'Refreshing…' : 'Market dashboard'}</div>
      </div>

      <div className="kpiGrid">
        <div className="kpiCard">
          <div className="kpiLabel">{assetKey} Price</div>
          <div className="kpiValue">
            {spotUsd.data ? `$${spotUsd.data.toLocaleString()}` : spotUsd.isLoading ? 'Loading…' : '—'}
          </div>
          <div className="kpiSub">
            {change24h.data !== undefined ? (
              <span className={change24h.data >= 0 ? 'pos' : 'neg'}>
                {change24h.data >= 0 ? '+' : ''}
                {change24h.data.toFixed(2)}% (24h)
              </span>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Range ({priceRange})</div>
          <div className="kpiValue">
            {range7d
              ? `${range7d.pct.toFixed(2)}%`
              : priceCandles.isLoading
                ? 'Loading…'
                : '—'}
          </div>
          <div className="kpiSub muted">
            {range7d ? `$${Math.round(range7d.lo).toLocaleString()} → $${Math.round(range7d.hi).toLocaleString()}` : '—'}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Points ({priceRange})</div>
          <div className="kpiValue">
            {priceCandles.data
              ? `${priceCandles.data.length}`
              : priceCandles.isLoading
                ? 'Loading…'
                : '—'}
          </div>
          <div className="kpiSub muted">Hourly candles</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Portfolio (selected)</div>
          <div className="kpiValue">
            {isConnected && portfolioUsd !== undefined
              ? `$${Math.round(portfolioUsd).toLocaleString()}`
              : '—'}
          </div>
          <div className="kpiSub">
            <span className="muted">Shown in account popup</span>
          </div>
        </div>
      </div>

      <section className="grid2">
        <PriceChartCard
          assetKey={assetKey}
          range={priceRange}
          onRangeChange={setPriceRange}
          candles={priceCandles.data}
          isLoading={priceCandles.isLoading}
        />
        <VolumeChartCard
          assetKey={assetKey}
          range={volumeRange}
          onRangeChange={setVolumeRange}
          candles={volumeCandles.data}
          isLoading={volumeCandles.isLoading}
        />
      </section>

      <section className="grid2">
        <DrawdownChartCard
          assetKey={assetKey}
          range={drawdownRange}
          onRangeChange={setDrawdownRange}
          candles={drawdownCandles.data}
          isLoading={drawdownCandles.isLoading}
        />
        <VolatilityChartCard
          range={volRange}
          onRangeChange={setVolRange}
          candles={volCandles.data}
          isLoading={volCandles.isLoading}
        />
      </section>

      <section className="grid1">
        <ReturnsChartCard
          range={returnsRange}
          onRangeChange={setReturnsRange}
          candles={returnsCandles.data}
          isLoading={returnsCandles.isLoading}
        />
      </section>

      <section className="grid1">
        {isConnected ? (
          <div className="card">
            <div className="cardHeader">
              <h2>Portfolio Allocation</h2>
              <RangeToggle value={portfolioRange} onChange={setPortfolioRange} />
            </div>

            {assetTotals.isLoading || spotMany.isLoading ? (
              <div className="chartWrap" style={{ height: '16.25em' }}>
                <div className="empty">Loading…</div>
              </div>
            ) : (
              <ChartFrame style={{ height: '16.25em' }} fallback={<div className="empty">Loading…</div>}>
                {({ width, height }) => (
                  <BarChart
                    width={width}
                    height={height}
                    data={portfolioByAsset.items}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="var(--chartGrid)" />
                    <XAxis dataKey="assetKey" tick={{ fontSize: 12, fill: 'var(--chartTick)' }} />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--chartTick)' }}
                      axisLine={{ stroke: 'var(--chartAxis)' }}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                      formatter={(value) => {
                        const n = Number(value)
                        return [Number.isFinite(n) ? usd.format(n) : String(value), 'Value']
                      }}
                    />
                    <Bar dataKey="usd" fill="var(--accent)" opacity={0.72} />
                  </BarChart>
                )}
              </ChartFrame>
            )}

            <div className="footnote">Total ≈ {usd.format(portfolioByAsset.totalUsd)}</div>
          </div>
        ) : null}
      </section>

      <ConnectWalletModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        connectors={connectors}
        disabled={connectDisabled}
        onSelectConnector={(c) => {
          setConnectOpen(false)
          void runConnect(c)
        }}
      />

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        isConnected={isConnected}
        address={address}
        connectors={connectors}
        disabled={connectDisabled}
        onSelectConnector={(c) => {
          setAccountOpen(false)
          void runConnect(c)
        }}
        gas={{ isLoading: gas.isLoading, data: gas.data }}
        onDisconnect={() => disconnect()}
        assetTotals={{ isLoading: assetTotals.isLoading, data: assetTotals.data }}
        spotMany={spotMany}
        selectedAssetKey={assetKey}
        onSelectAsset={(k) => setAssetKey(k)}
        portfolioTotalUsd={portfolioByAsset.totalUsd}
      />
    </div>
  )
}

export default App
