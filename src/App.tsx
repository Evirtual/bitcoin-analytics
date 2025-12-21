import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ASSETS, type AssetKey, type ChainId } from './assets/catalog'
import { useAssetBalances, useUserAssetTotals } from './hooks/useAssetBalances'
import { useCandles, useChange24h, useSpotUsd, useSpotUsdMany } from './hooks/useMarket'
import { useGasBalances } from './hooks/useGasBalances'
import { AssetIcon } from './components/AssetIcon'
import type { CandleRange } from './components/charts/types'
import { rangeToDays } from './components/charts/rangeUtils'
import { PriceChartCard } from './components/charts/PriceChartCard'
import { VolumeChartCard } from './components/charts/VolumeChartCard'
import { DrawdownChartCard } from './components/charts/DrawdownChartCard'
import { VolatilityChartCard } from './components/charts/VolatilityChartCard'
import { ReturnsChartCard } from './components/charts/ReturnsChartCard'
import { PortfolioChartCard } from './components/charts/PortfolioChartCard'
import { Header } from './components/dashboard/Header'
import { MarketMoodCard } from './components/dashboard/MarketMoodCard'
import { AccountModal } from './components/wallet/AccountModal'
import { ConnectWalletModal } from './components/wallet/ConnectWalletModal'
import { SwapModal } from './components/swap/SwapModal'
import { Toast } from './components/Toast'
import { SupportDeveloperModal } from './components/SupportDeveloperModal'
import { useTheme } from './hooks/useTheme'
import { compact, usd } from './lib/format'
import './App.css'

function getErrorMessage(err: unknown): string | undefined {
  if (!err) return undefined
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const anyErr = err as { message?: unknown; shortMessage?: unknown; details?: unknown }
    if (typeof anyErr.shortMessage === 'string' && anyErr.shortMessage.trim()) return anyErr.shortMessage
    if (typeof anyErr.message === 'string' && anyErr.message.trim()) return anyErr.message
    if (typeof anyErr.details === 'string' && anyErr.details.trim()) return anyErr.details
    try {
      return JSON.stringify(err)
    } catch {
      return undefined
    }
  }
  return String(err)
}

function formatConnectErrorMessage(message: string): string {
  const trimmed = message.trim()

  // Some providers throw non-Error values; wagmi/viem may stringify them.
  if (trimmed === '[]') return 'Wallet request failed. Please try again.'

  // Drop noisy suffixes like "Version: viem@...".
  const withoutVersion = trimmed.replace(/\s*[,;]?\s*version:\s*viem@[^\s]+\s*$/i, '')
  const m = withoutVersion.toLowerCase()

  // Common UX-friendly cases
  if (m.includes('user rejected') || m.includes('user rejected the request')) {
    return 'Connection cancelled in your wallet.'
  }
  if (m.includes('connection request reset')) {
    return 'WalletConnect request reset. Open your wallet and try connecting again.'
  }
  if (m.includes('wallet_requestpermissions') && m.includes('already pending')) {
    return 'A wallet connection request is already pending. Open MetaMask and approve it, or wait and try again.'
  }
  if (m.includes('already pending')) {
    return 'A wallet connection request is already pending. Please wait and try again.'
  }

  // If the message contains a "Details:" section, only show the leading part.
  const detailsIdx = withoutVersion.toLowerCase().indexOf('details:')
  if (detailsIdx > 0) return withoutVersion.slice(0, detailsIdx).trim()

  return withoutVersion
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
    const msg = getErrorMessage(connectError)
    return msg ? formatConnectErrorMessage(msg) : undefined
  }, [connectError])

  const [connectToastOpen, setConnectToastOpen] = useState(false)
  const [connectToastMessage, setConnectToastMessage] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!connectErrorText) {
      setConnectToastOpen(false)
      return
    }
    setConnectToastMessage(connectErrorText)
    setConnectToastOpen(true)
    const t = window.setTimeout(() => setConnectToastOpen(false), 8000)
    return () => window.clearTimeout(t)
  }, [connectErrorText])

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

  const supportedAssetKeys = useMemo<AssetKey[]>(() => ['BTC', 'ETH', 'BNB', 'DOGE', 'USDT', 'USDC'], [])
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
  const [swapOpen, setSwapOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)

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

  const periodReturn = useMemo(() => {
    const pts = priceCandles.data ?? []
    if (pts.length < 2) return undefined
    const first = pts[0]?.price
    const last = pts[pts.length - 1]?.price
    if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return undefined
    return ((last - first) / first) * 100
  }, [priceCandles.data])

  const avgVolume = useMemo(() => {
    const pts = volumeCandles.data ?? []
    if (!pts.length) return undefined
    let sum = 0
    let n = 0
    for (const p of pts) {
      if (Number.isFinite(p.volume)) {
        sum += p.volume
        n++
      }
    }
    if (!n) return undefined
    return sum / n
  }, [volumeCandles.data])

  const heldSet = useMemo(() => {
    const set = new Set<AssetKey>()
    for (const a of assetTotals.data ?? []) {
      if ((a.totalAmount ?? 0) > 0) set.add(a.assetKey)
    }
    return set
  }, [assetTotals.data])

  const assetOptions = useMemo(() => {
    const order = new Map<AssetKey, number>()
    for (let i = 0; i < supportedAssetKeys.length; i++) order.set(supportedAssetKeys[i]!, i)

    return [...supportedAssetKeys].sort((a, b) => {
      const aHeld = heldSet.has(a)
      const bHeld = heldSet.has(b)
      if (aHeld !== bHeld) return aHeld ? -1 : 1
      return (order.get(a) ?? 0) - (order.get(b) ?? 0)
    })
  }, [heldSet, supportedAssetKeys])

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
        onOpenSwap={() => setSwapOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        connectDisabled={connectDisabled}
      />

      <Toast
        open={connectToastOpen && !!connectToastMessage}
        variant="error"
        message={connectToastMessage ?? ''}
        onClose={() => setConnectToastOpen(false)}
      />

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
        <MarketMoodCard />

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
          <div className="kpiLabel">Return ({priceRange})</div>
          <div className="kpiValue">
            {periodReturn !== undefined
              ? `${periodReturn >= 0 ? '+' : ''}${periodReturn.toFixed(2)}%`
              : priceCandles.isLoading
                ? 'Loading…'
                : '—'}
          </div>
          <div className="kpiSub">
            {periodReturn !== undefined ? (
              <span className={periodReturn >= 0 ? 'pos' : 'neg'}>
                {periodReturn >= 0 ? 'Uptrend' : 'Downtrend'}
              </span>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
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

        <div className="kpiCard">
          <div className="kpiLabel">Avg Volume ({volumeRange})</div>
          <div className="kpiValue">
            {avgVolume !== undefined
              ? compact.format(avgVolume)
              : volumeCandles.isLoading
                ? 'Loading…'
                : '—'}
          </div>
          <div className="kpiSub muted">Per hour</div>
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
          <PortfolioChartCard
            range={portfolioRange}
            onRangeChange={setPortfolioRange}
            items={portfolioByAsset.items}
            isLoading={assetTotals.isLoading || spotMany.isLoading}
            totalUsd={portfolioByAsset.totalUsd}
          />
        ) : null}
      </section>

      <SupportDeveloperModal open={supportOpen} onClose={() => setSupportOpen(false)} />

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

      <SwapModal
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        assetKey={assetKey}
        chain={chain}
        isConnected={isConnected}
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
        chainIds={chainIds}
        portfolioTotalUsd={portfolioByAsset.totalUsd}
      />
    </div>
  )
}

export default App
