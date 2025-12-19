import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ASSETS, type AssetKey, type ChainId } from './assets/catalog'
import { useAssetBalances, useUserAssetTotals, useUserNonZeroAssets } from './hooks/useAssetBalances'
import { useCandles7d, useChange24h, useSpotUsd, useSpotUsdMany } from './hooks/useMarket'
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
  const heldAssets = useUserNonZeroAssets(address, chainIds, supportedAssetKeys)
  const assetTotals = useUserAssetTotals(address, chainIds, supportedAssetKeys)

  const spotMany = useSpotUsdMany(supportedAssetKeys)

  const [assetKey, setAssetKey] = useState<AssetKey>('BTC')
  // Selected asset metadata is read via ASSETS[assetKey] where needed.

  const accent = ASSETS[assetKey].accent
  const accentSoft = ASSETS[assetKey].accentSoft

  const spotUsd = useSpotUsd(assetKey)
  const change24h = useChange24h(assetKey)
  const candles7d = useCandles7d(assetKey)
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
    const points = candles7d.data ?? []
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
  }, [candles7d.data])

  const range7d = useMemo(() => {
    const pts = candles7d.data ?? []
    if (!pts.length) return undefined
    let lo = Infinity
    let hi = -Infinity
    for (const p of pts) {
      lo = Math.min(lo, p.price)
      hi = Math.max(hi, p.price)
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return undefined
    return { lo, hi, pct: lo > 0 ? ((hi - lo) / lo) * 100 : 0 }
  }, [candles7d.data])

  const assetOptions = supportedAssetKeys

  const heldSet = useMemo(() => {
    const set = new Set<AssetKey>()
    for (const a of heldAssets.data ?? []) set.add(a.assetKey)
    return set
  }, [heldAssets.data])

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
        <div className="muted small">
          {heldAssets.isLoading ? 'Refreshing…' : 'Market dashboard'}
        </div>
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
          <div className="kpiLabel">7d Range</div>
          <div className="kpiValue">
            {range7d
              ? `${range7d.pct.toFixed(2)}%`
              : candles7d.isLoading
                ? 'Loading…'
                : '—'}
          </div>
          <div className="kpiSub muted">
            {range7d ? `$${Math.round(range7d.lo).toLocaleString()} → $${Math.round(range7d.hi).toLocaleString()}` : '—'}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">7d Points</div>
          <div className="kpiValue">
            {candles7d.data ? `${candles7d.data.length}` : candles7d.isLoading ? 'Loading…' : '—'}
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
            <h2>{assetKey} Price (7d)</h2>
            <div className="muted">Hourly</div>
          </div>

          <div className="chartWrap">
            {candles7d.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={candles7d.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  <Area type="monotone" dataKey="price" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">{candles7d.isLoading ? 'Loading chart…' : 'Chart unavailable'}</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <h2>{assetKey} Volume (7d)</h2>
            <div className="muted">Hourly</div>
          </div>

          <div className="chartWrap">
            {candles7d.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={candles7d.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              </ResponsiveContainer>
            ) : (
              <div className="empty">{candles7d.isLoading ? 'Loading chart…' : 'Chart unavailable'}</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid1">
        <div className="card">
          <div className="cardHeader">
            <h2>Daily Returns (7d)</h2>
            <div className="muted">% change per day</div>
          </div>
          <div className="chartWrap" style={{ height: '16.25em' }}>
            {dailyReturns.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyReturns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              </ResponsiveContainer>
            ) : (
              <div className="empty">{candles7d.isLoading ? 'Loading…' : 'Data unavailable'}</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid1">
        <div className="card">
          <div className="cardHeader">
            <h2>Portfolio Allocation</h2>
            <div className="muted">USD value by asset</div>
          </div>

          <div className="chartWrap" style={{ height: '16.25em' }}>
            {!isConnected ? (
              <div className="empty">Connect wallet to see portfolio allocation</div>
            ) : assetTotals.isLoading || spotMany.isLoading ? (
              <div className="empty">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
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
              </ResponsiveContainer>
            )}
          </div>

          <div className="footnote">
            Total ≈ {isConnected ? usd.format(portfolioByAsset.totalUsd) : '—'}
          </div>
        </div>
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
              <div className="connectName">{c.name}</div>
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
                  <div className="connectName">{c.name}</div>
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
