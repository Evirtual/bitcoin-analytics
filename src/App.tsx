import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ASSETS, type AssetKey, type ChainId } from './assets/catalog'
import { useAssetBalances, useUserAssetTotals } from './hooks/useAssetBalances'
import { useCandles, useChange24h, useSpotUsd, useSpotUsdMany } from './hooks/useMarket'
import { useGasBalances } from './hooks/useGasBalances'
import { Modal } from './components/Modal'
import { AssetIcon } from './components/AssetIcon'
import './App.css'

const usd = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const compact = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 2,
})

const tooltipContentStyle: React.CSSProperties = {
  background: 'rgba(10, 12, 22, 0.92)',
  border: '0.0625em solid rgba(255, 255, 255, 0.14)',
  borderRadius: '0.75em',
  padding: '0.625em 0.75em',
  boxShadow: '0 0.875em 2.5em rgba(0,0,0,0.55)',
  color: 'rgba(255,255,255,0.92)',
}

const tooltipLabelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.62)',
  marginBottom: '0.375em',
}

const tooltipItemStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.92)',
  padding: 0,
}

function connectorInitials(name: string): string {
  const cleaned = name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
  if (!cleaned) return 'W'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase()
}

function ChartFrame({
  style,
  fallback,
  children,
}: {
  style?: React.CSSProperties
  fallback: React.ReactNode
  children: (size: { width: number; height: number }) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      const r = el.getBoundingClientRect()
      const width = Math.round(r.width)
      const height = Math.round(r.height)
      const next = { width: width > 0 ? width : 0, height: height > 0 ? height : 0 }
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }

    update()
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    })
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className="chartWrap" style={style}>
      {size.width > 0 && size.height > 0 ? children(size) : fallback}
    </div>
  )
}

type CandleRange = '1D' | '1W' | '1M'

function rangeToDays(r: CandleRange) {
  if (r === '1D') return 1
  if (r === '1M') return 30
  return 7
}

function RangeToggle({ value, onChange }: { value: CandleRange; onChange: (v: CandleRange) => void }) {
  return (
    <div className="segmented" aria-label="Candle range">
      {(['1D', '1W', '1M'] as const).map((r) => (
        <button
          key={r}
          className={r === value ? 'segBtn segBtnActive' : 'segBtn'}
          type="button"
          onClick={() => onChange(r)}
        >
          <span className="segLabel">{r}</span>
        </button>
      ))}
    </div>
  )
}

function App() {
  const { address, isConnected, chain } = useAccount()
  const {
    connectors,
    connect,
    isPending: isConnecting,
    error: connectError,
  } = useConnect()
  const { disconnect } = useDisconnect()

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
  const [portfolioRange, setPortfolioRange] = useState<CandleRange>('1W')

  const priceDays = useMemo(() => rangeToDays(priceRange) as 1 | 7 | 30, [priceRange])
  const volumeDays = useMemo(() => rangeToDays(volumeRange) as 1 | 7 | 30, [volumeRange])
  const returnsDays = useMemo(() => rangeToDays(returnsRange) as 1 | 7 | 30, [returnsRange])

  const priceCandles = useCandles(assetKey, priceDays)
  const volumeCandles = useCandles(assetKey, volumeDays)
  const returnsCandles = useCandles(assetKey, returnsDays)

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

  const dailyReturns = useMemo(() => {
    const points = returnsCandles.data ?? []
    const dayMap = new Map<string, { first?: number; last?: number }>()
    for (const p of points) {
      // p.t is localized string; group by date portion
      const day = p.t.split(',')[0] ?? p.t
      const cur = dayMap.get(day) ?? {}
      if (cur.first === undefined) cur.first = p.price
      cur.last = p.price
      dayMap.set(day, cur)
    }
    return Array.from(dayMap.entries()).map(([day, v]) => {
      const r = v.first && v.last ? ((v.last - v.first) / v.first) * 100 : 0
      return { day, ret: Number.isFinite(r) ? r : 0 }
    })
  }, [returnsCandles.data])

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
      <header className="header">
        <div className="brand">
          <div className="brandRow">
            <AssetIcon assetKey={assetKey} size={46} className="logoMark" />
            <div>
              <div className="title">
                <span className="titleAccent">{ASSETS[assetKey].label}</span> Analytics
              </div>
              <div className="subtitle">Market stats + multichain wallet balances</div>
            </div>
          </div>
        </div>

        <div className="walletBar">
          {!isConnected ? (
            <button className="btn btnPrimary" onClick={() => setConnectOpen(true)}>
              Connect
            </button>
          ) : (
            <>
              <button className="pill pillBtn" onClick={() => setAccountOpen(true)}>
                {address?.slice(0, 6)}…{address?.slice(-4)}
                {chain?.name ? ` • ${chain.name}` : ''}
              </button>
            </>
          )}
        </div>
      </header>

      {connectError ? <div className="banner error">{connectError.message}</div> : null}

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
        <div className="card">
          <div className="cardHeader">
            <h2>
              {assetKey} Price ({priceRange})
            </h2>
            <RangeToggle value={priceRange} onChange={setPriceRange} />
          </div>

          {priceCandles.data ? (
            <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
              {({ width, height }) => (
                <AreaChart
                  width={width}
                  height={height}
                  data={priceCandles.data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={48} />
                  <YAxis tick={{ fontSize: 12 }} width={72} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value) => {
                      const n = Number(value)
                      return [Number.isFinite(n) ? usd.format(n) : String(value), 'Price']
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.18}
                  />
                </AreaChart>
              )}
            </ChartFrame>
          ) : (
            <div className="chartWrap">
              <div className="empty">
                {priceCandles.isLoading ? 'Loading chart…' : 'Chart unavailable'}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2>
              {assetKey} Volume ({volumeRange})
            </h2>
            <RangeToggle value={volumeRange} onChange={setVolumeRange} />
          </div>

          {volumeCandles.data ? (
            <ChartFrame fallback={<div className="empty">Loading chart…</div>}>
              {({ width, height }) => (
                <BarChart
                  width={width}
                  height={height}
                  data={volumeCandles.data}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="t" tick={{ fontSize: 12 }} minTickGap={64} />
                  <YAxis tick={{ fontSize: 12 }} width={72} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value) => {
                      const n = Number(value)
                      return [Number.isFinite(n) ? compact.format(n) : String(value), 'Volume']
                    }}
                  />
                  <Bar dataKey="volume" fill="var(--accent)" opacity={0.65} />
                </BarChart>
              )}
            </ChartFrame>
          ) : (
            <div className="chartWrap">
              <div className="empty">
                {volumeCandles.isLoading ? 'Loading chart…' : 'Chart unavailable'}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid1">
        <div className="card">
          <div className="cardHeader">
            <h2>Daily Returns ({returnsRange})</h2>
            <RangeToggle value={returnsRange} onChange={setReturnsRange} />
          </div>

          {dailyReturns.length ? (
            <ChartFrame style={{ height: '16.25em' }} fallback={<div className="empty">Loading…</div>}>
              {({ width, height }) => (
                <BarChart
                  width={width}
                  height={height}
                  data={dailyReturns}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 12 }} width={56} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={(value) => {
                      const n = Number(value)
                      return [Number.isFinite(n) ? `${n.toFixed(2)}%` : String(value), 'Return']
                    }}
                  />
                  <Bar dataKey="ret" fill="var(--accent)" opacity={0.72} />
                </BarChart>
              )}
            </ChartFrame>
          ) : (
            <div className="chartWrap">
              <div className="empty">{returnsCandles.isLoading ? 'Loading…' : 'Data unavailable'}</div>
            </div>
          )}
        </div>
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
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="assetKey" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={72} />
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

      <Modal open={connectOpen} title="Connect Wallet" onClose={() => setConnectOpen(false)}>
        <div className="stack">
          {connectors.map((c) => (
            <button
              key={c.uid}
              className="connectRow"
              onClick={() => {
                connect({ connector: c })
                setConnectOpen(false)
              }}
              disabled={isConnecting}
            >
              <div className="connectLeft">
                <div className="connectIcon" aria-hidden="true">
                  {connectorInitials(c.name)}
                </div>
                <div className="connectName">{c.name}</div>
              </div>
              <div className="muted small">Select</div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={accountOpen} title="Account" onClose={() => setAccountOpen(false)}>
        {!isConnected ? (
          <div className="stack">
            <div className="muted small">Not connected</div>
            <div className="stack">
              {connectors.map((c) => (
                <button
                  key={c.uid}
                  className="connectRow"
                  onClick={() => {
                    connect({ connector: c })
                    setAccountOpen(false)
                  }}
                  disabled={isConnecting}
                >
                  <div className="connectLeft">
                    <div className="connectIcon" aria-hidden="true">
                      {connectorInitials(c.name)}
                    </div>
                    <div className="connectName">{c.name}</div>
                  </div>
                  <div className="muted small">Select</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="stack">
            <div className="accountTop">
              <div>
                <div className="muted small">Address</div>
                <div className="mono">{address}</div>
                <div className="muted small" style={{ marginTop: '0.375em' }}>
                  Gas:{' '}
                  {gas.isLoading
                    ? 'Loading…'
                    : gas.data
                      ? gas.data
                          .map((g) => `${g.chainName} ${g.formatted} ${g.symbol}`)
                          .join(' • ')
                      : 'Unavailable'}
                </div>
              </div>
              <button className="btn" onClick={() => disconnect()}>
                Disconnect
              </button>
            </div>

            <div className="divider" />

            <div className="muted small">Balances (supported assets)</div>

            <div className="assetList">
              {assetTotals.isLoading || spotMany.isLoading ? (
                <div className="muted">Loading…</div>
              ) : assetTotals.data?.some((a) => a.totalAmount > 0) ? (
                assetTotals.data
                  .filter((a) => a.totalAmount > 0)
                  .map((a) => {
                  const price = spotMany.data.get(a.assetKey)
                  const v = price !== undefined ? price * a.totalAmount : undefined
                  return (
                  <button
                    key={a.assetKey}
                    className={a.assetKey === assetKey ? 'assetRow assetRowActive' : 'assetRow'}
                    onClick={() => setAssetKey(a.assetKey)}
                    style={
                      {
                        ['--rowAccent' as unknown as string]: ASSETS[a.assetKey].accent,
                        ['--rowAccentSoft' as unknown as string]: ASSETS[a.assetKey].accentSoft,
                      } as React.CSSProperties
                    }
                  >
                    <div className="assetLeft">
                      <AssetIcon assetKey={a.assetKey} size={24} className="assetRowIcon" />
                      <div>
                        <div className="rowTitle">{a.assetKey}</div>
                        <div className="rowSub muted">{ASSETS[a.assetKey].label}</div>
                      </div>
                    </div>
                    <div className="rightStack">
                      <div className="mono">{a.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
                      <div className="rowSub muted">
                        {v !== undefined ? usd.format(v) : '—'}
                      </div>
                    </div>
                  </button>
                  )
                })
              ) : (
                <div className="muted">No supported assets detected.</div>
              )}
            </div>

            <div className="footnote">
              Portfolio total ≈ {usd.format(portfolioByAsset.totalUsd)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default App
