import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import type { Connector } from 'wagmi'
import { ASSETS, type AssetKey, type ChainId } from './assets/catalog'
import { useAssetBalances, useUserAssetTotals } from './hooks/useAssetBalances'
import {
  useCandles,
  useCandlesMany,
  useChange24h,
  useChange24hMany,
  useSpotUsd,
  useSpotUsdMany,
} from './hooks/useMarket'
import { useGasBalances } from './hooks/useGasBalances'
import { AssetIcon } from './components/AssetIcon'
import type { CandleRange } from './components/charts/types'
import { rangeToDays } from './components/charts/rangeUtils'
import { Header } from './components/dashboard/Header'
import { MarketMoodCard } from './components/dashboard/MarketMoodCard'
import { PortfolioHoldingsCard } from './components/dashboard/PortfolioHoldingsCard'
import { PortfolioRiskCard } from './components/dashboard/PortfolioRiskCard'
import { CostBasisCard } from './components/dashboard/CostBasisCard'
import { Toast } from './components/Toast'
import { useTheme } from './hooks/useTheme'
import { useCostBasis } from './hooks/useCostBasis'
import { useScrollEdges } from './hooks/useScrollEdges'
import {
  buildPortfolioValueSeries,
  computeConcentration,
  computeCostBasisSummary,
  computePortfolio24h,
  computePortfolioStats,
} from './lib/portfolio'
import { compact, usd } from './lib/format'
import { formatConnectErrorMessage } from './lib/wallet'
import './App.css'

const PriceChartCard = lazy(() => import('./components/charts/PriceChartCard').then((m) => ({ default: m.PriceChartCard })))
const VolumeChartCard = lazy(() => import('./components/charts/VolumeChartCard').then((m) => ({ default: m.VolumeChartCard })))
const DrawdownChartCard = lazy(() => import('./components/charts/DrawdownChartCard').then((m) => ({ default: m.DrawdownChartCard })))
const VolatilityChartCard = lazy(() => import('./components/charts/VolatilityChartCard').then((m) => ({ default: m.VolatilityChartCard })))
const ReturnsChartCard = lazy(() => import('./components/charts/ReturnsChartCard').then((m) => ({ default: m.ReturnsChartCard })))
const PortfolioChartCard = lazy(() => import('./components/charts/PortfolioChartCard').then((m) => ({ default: m.PortfolioChartCard })))
const MovingAverageChartCard = lazy(() =>
  import('./components/charts/MovingAverageChartCard').then((m) => ({ default: m.MovingAverageChartCard })),
)
const PriceBandsChartCard = lazy(() =>
  import('./components/charts/PriceBandsChartCard').then((m) => ({ default: m.PriceBandsChartCard })),
)
const ReturnsHeatmapCard = lazy(() =>
  import('./components/charts/ReturnsHeatmapCard').then((m) => ({ default: m.ReturnsHeatmapCard })),
)
// None of these is reachable on first paint, and one of them carries the QR
// library. Each is mounted only while it is open, so its chunk is fetched when
// the window is actually asked for rather than on load.
const AccountModal = lazy(() =>
  import('./components/wallet/AccountModal').then((m) => ({ default: m.AccountModal })),
)
const ConnectWalletModal = lazy(() =>
  // lazy() erases the component generic, which would leave the connector
  // handed back to onSelectConnector typed as the bare constraint. Pinned
  // here to the connector type wagmi actually gives us.
  import('./components/wallet/ConnectWalletModal').then((m) => ({
    default: m.ConnectWalletModal<Connector>,
  })),
)
const SwapModal = lazy(() =>
  import('./components/swap/SwapModal').then((m) => ({ default: m.SwapModal })),
)
const SupportDeveloperModal = lazy(() =>
  import('./components/SupportDeveloperModal').then((m) => ({ default: m.SupportDeveloperModal })),
)
const PortfolioHistoryChartCard = lazy(() =>
  import('./components/charts/PortfolioHistoryChartCard').then((m) => ({
    default: m.PortfolioHistoryChartCard,
  })),
)
const AssetComparisonChartCard = lazy(() =>
  import('./components/charts/AssetComparisonChartCard').then((m) => ({ default: m.AssetComparisonChartCard })),
)
const CorrelationChartCard = lazy(() =>
  import('./components/charts/CorrelationChartCard').then((m) => ({ default: m.CorrelationChartCard })),
)

function ChartFallback() {
  return (
    <div className="card chartFallbackCard">
      <div className="chartWrap">
        <div className="empty">Loading chart...</div>
      </div>
    </div>
  )
}

type MarketCardId =
  | 'price'
  | 'volume'
  | 'returns'
  | 'heatmap'
  | 'trend'
  | 'bands'
  | 'drawdown'
  | 'volatility'
  | 'comparison'
  | 'correlation'

const DEFAULT_MARKET_CARD_ORDER: MarketCardId[] = [
  'price',
  'volume',
  'returns',
  'heatmap',
  'trend',
  'bands',
  'drawdown',
  'volatility',
  'comparison',
  'correlation',
]

const MARKET_CARD_STORAGE_KEY = 'bitcoin-analytics.marketCardOrder.v2'

function readMarketCardOrder(): MarketCardId[] {
  if (typeof window === 'undefined') return DEFAULT_MARKET_CARD_ORDER

  try {
    const raw = window.localStorage.getItem(MARKET_CARD_STORAGE_KEY)
    if (!raw) return DEFAULT_MARKET_CARD_ORDER
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return DEFAULT_MARKET_CARD_ORDER
    const valid = parsed.filter((id): id is MarketCardId => {
      return DEFAULT_MARKET_CARD_ORDER.includes(id as MarketCardId)
    })
    const missing = DEFAULT_MARKET_CARD_ORDER.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  } catch {
    return DEFAULT_MARKET_CARD_ORDER
  }
}

function writeMarketCardOrder(order: MarketCardId[]) {
  try {
    window.localStorage.setItem(MARKET_CARD_STORAGE_KEY, JSON.stringify(order))
  } catch {
    // ignore localStorage failures
  }
}

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

function App() {
  const { theme, toggleTheme } = useTheme()
  const { address, isConnected, chain, status: accountStatus } = useAccount()
  const {
    connectors,
    connectAsync,
    isPending: isConnecting,
    error: connectError,
    reset: resetConnect,
  } = useConnect()
  const { disconnect } = useDisconnect()

  const [connectOpen, setConnectOpen] = useState(false)
  // The wallet being waited on, kept rather than a plain boolean so the row
  // can say which one, and so "Try again" knows what to retry.
  const [pendingConnector, setPendingConnector] = useState<(typeof connectors)[number] | undefined>(
    undefined,
  )
  const [walletConnectUri, setWalletConnectUri] = useState<string | undefined>(undefined)
  const [dashboardView, setDashboardView] = useState<'market' | 'portfolio'>('market')
  const [marketCardOrder, setMarketCardOrder] = useState<MarketCardId[]>(readMarketCardOrder)
  const [draggedMarketCard, setDraggedMarketCard] = useState<MarketCardId | null>(null)
  const [dragOverMarketCard, setDragOverMarketCard] = useState<MarketCardId | null>(null)

  // On a cold start wagmi is still restoring the stored session, so showing an
  // enabled "Connect" would invite a second connection over the live one.
  const connectDisabled = isConnecting || accountStatus === 'reconnecting'
  const activeDashboardView = isConnected ? dashboardView : 'market'

  const moveMarketCard = useCallback((from: MarketCardId, to: MarketCardId) => {
    if (from === to) return
    setMarketCardOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(from)
      const toIndex = next.indexOf(to)
      if (fromIndex < 0 || toIndex < 0) return prev
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, from)
      writeMarketCardOrder(next)
      return next
    })
  }, [])

  const connectErrorText = useMemo(() => {
    const msg = getErrorMessage(connectError)
    return msg ? formatConnectErrorMessage(msg) : undefined
  }, [connectError])

  const [dismissedConnectError, setDismissedConnectError] = useState<string | undefined>(undefined)
  const connectToastOpen = Boolean(connectErrorText && connectErrorText !== dismissedConnectError)

  useEffect(() => {
    if (!connectToastOpen || !connectErrorText) return
    const t = window.setTimeout(() => setDismissedConnectError(connectErrorText), 8000)
    return () => window.clearTimeout(t)
  }, [connectErrorText, connectToastOpen])

  // "Try again" needs to know what failed, and the failure clears the pending
  // connector by definition.
  const lastAttemptedUid = useRef<string | undefined>(undefined)

  const runConnect = useCallback(
    async (connector: (typeof connectors)[number]) => {
      lastAttemptedUid.current = connector.uid
      setPendingConnector(connector)
      setDismissedConnectError(undefined)
      resetConnect()
      try {
        await connectAsync({ connector })
        setPendingConnector(undefined)
        setConnectOpen(false)
      } catch {
        // Stay on this wallet's step: the reason belongs next to the wallet
        // that produced it, where it can be tried again.
      } finally {
        setWalletConnectUri(undefined)
      }
    },
    [connectAsync, resetConnect],
  )

  /**
   * Abandoning a request has to reach the connector, not just the UI.
   *
   * A pairing that is never answered leaves wagmi sat in `connecting`, which
   * is what made the button read "Connecting..." with no way back. Ending it
   * at the connector rejects that attempt, and wagmi returns to disconnected.
   */
  const cancelConnect = useCallback(() => {
    setWalletConnectUri(undefined)
    setPendingConnector(undefined)
    const pending = pendingConnector
    void pending?.disconnect().catch(() => {})
    resetConnect()
  }, [pendingConnector, resetConnect])

  // WalletConnect hands over a pairing URI instead of opening a modal of its
  // own. It arrives on the connector, not from the connect() call.
  useEffect(() => {
    const connector = connectors.find((c) => c.id === 'walletConnect')
    if (!connector) return

    const onMessage = ({ type, data }: { type: string; data?: unknown }) => {
      if (type === 'display_uri' && typeof data === 'string') setWalletConnectUri(data)
    }
    connector.emitter.on('message', onMessage)
    return () => connector.emitter.off('message', onMessage)
  }, [connectors])

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
  const [comparisonRange, setComparisonRange] = useState<CandleRange>('1W')

  const priceDays = useMemo(() => rangeToDays(priceRange) as 1 | 7 | 30, [priceRange])
  const volumeDays = useMemo(() => rangeToDays(volumeRange) as 1 | 7 | 30, [volumeRange])
  const returnsDays = useMemo(() => rangeToDays(returnsRange) as 1 | 7 | 30, [returnsRange])
  const drawdownDays = useMemo(() => rangeToDays(drawdownRange) as 1 | 7 | 30, [drawdownRange])
  const volDays = useMemo(() => rangeToDays(volRange) as 1 | 7 | 30, [volRange])
  const comparisonDays = useMemo(() => rangeToDays(comparisonRange) as 1 | 7 | 30, [comparisonRange])

  const priceCandles = useCandles(assetKey, priceDays)
  const volumeCandles = useCandles(assetKey, volumeDays)
  const returnsCandles = useCandles(assetKey, returnsDays)
  const drawdownCandles = useCandles(assetKey, drawdownDays)
  const volCandles = useCandles(assetKey, volDays)
  // Selecting BTC has nothing to pair it against, so it opens the field to every asset.
  const comparisonAssetKeys = useMemo<AssetKey[]>(
    () => (assetKey === 'BTC' ? supportedAssetKeys : ['BTC', assetKey]),
    [assetKey, supportedAssetKeys],
  )
  const comparisonCandles = useCandlesMany(comparisonAssetKeys, comparisonDays)

  const balances = useAssetBalances(address, assetKey, chainIds)
  const gas = useGasBalances(address, chainIds)

  const portfolioUsd =
    spotUsd.data && balances.data ? spotUsd.data * balances.data.totalAmount : undefined

  const selectedHoldingText = useMemo(() => {
    if (!isConnected) return undefined
    if (balances.isLoading) return 'Loading...'
    if (!balances.data) return 'Wallet balance unavailable'
    const unavailable = balances.data.errorCount > 0 ? 'Some networks unavailable' : undefined
    const amount = `${balances.data.totalFormatted} ${assetKey}`
    return unavailable ? `${amount} (${unavailable})` : amount
  }, [assetKey, balances.data, balances.isLoading, isConnected])

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
        price,
        byChain: t.byChain ?? [],
      }
    })
    const totalUsd = items.reduce((acc, i) => acc + (Number.isFinite(i.usd) ? i.usd : 0), 0)
    return { items, totalUsd }
  }, [assetTotals.data, spotMany.data])

  const portfolioAssetCount = useMemo(() => {
    return portfolioByAsset.items.filter((item) => item.amount > 0).length
  }, [portfolioByAsset.items])

  const heldPositions = useMemo(() => {
    return portfolioByAsset.items
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.usd - a.usd)
  }, [portfolioByAsset.items])

  const [portfolioRange, setPortfolioRange] = useState<CandleRange>('1W')
  const portfolioDays = useMemo(() => rangeToDays(portfolioRange) as 1 | 7 | 30, [portfolioRange])

  // Held assets only, and only once the portfolio view is actually open: this
  // is up to six extra candle requests, and none of them are worth making
  // while the market view is the one on screen.
  const portfolioAssetKeys = useMemo<AssetKey[]>(() => {
    if (activeDashboardView !== 'portfolio') return []
    return heldPositions.map((item) => item.assetKey)
  }, [activeDashboardView, heldPositions])

  const portfolioCandles = useCandlesMany(portfolioAssetKeys, portfolioDays)
  const portfolioChanges = useChange24hMany(portfolioAssetKeys)

  const portfolioValueSeries = useMemo(() => {
    return buildPortfolioValueSeries(heldPositions, portfolioCandles.data)
  }, [heldPositions, portfolioCandles.data])

  const portfolioStats = useMemo(() => computePortfolioStats(portfolioValueSeries), [portfolioValueSeries])

  const portfolioConcentration = useMemo(() => computeConcentration(heldPositions), [heldPositions])

  const portfolioChange24h = useMemo(() => {
    return computePortfolio24h(heldPositions, portfolioChanges.data)
  }, [heldPositions, portfolioChanges.data])

  const holdingRows = useMemo(() => {
    const total = portfolioByAsset.totalUsd
    return heldPositions.map((item) => ({
      assetKey: item.assetKey,
      amount: item.amount,
      price: item.price,
      usd: item.usd,
      change24h: portfolioChanges.data.get(item.assetKey),
      weight: total > 0 ? (item.usd / total) * 100 : 0,
      byChain: item.byChain,
    }))
  }, [heldPositions, portfolioByAsset.totalUsd, portfolioChanges.data])

  const { basis: costBasis, setAssetCost, clearAll: clearCostBasis } = useCostBasis()

  const assetStripRef = useRef<HTMLDivElement>(null)
  const assetStripEdges = useScrollEdges(assetStripRef)

  const costBasisSummary = useMemo(() => {
    return computeCostBasisSummary(heldPositions, costBasis)
  }, [costBasis, heldPositions])

  const balanceIssueCount = useMemo(() => {
    return (assetTotals.data ?? []).reduce((acc, item) => acc + (item.errorCount ?? 0), 0)
  }, [assetTotals.data])

  const gasSummary = useMemo(() => {
    if (gas.isLoading) return 'Loading...'
    if (!gas.data?.length) return 'Gas balances unavailable'
    return gas.data
      .map((g) => (g.error ? `${g.chainName} unavailable` : `${g.formatted} ${g.symbol} on ${g.chainName}`))
      .join(' / ')
  }, [gas.data, gas.isLoading])

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

  const marketCards = useMemo<Record<MarketCardId, { wide?: boolean; node: React.ReactNode }>>(
    () => ({
      price: {
        node: (
          <PriceChartCard
            assetKey={assetKey}
            range={priceRange}
            onRangeChange={setPriceRange}
            candles={priceCandles.data}
            isLoading={priceCandles.isLoading}
          />
        ),
      },
      volume: {
        node: (
          <VolumeChartCard
            assetKey={assetKey}
            range={volumeRange}
            onRangeChange={setVolumeRange}
            candles={volumeCandles.data}
            isLoading={volumeCandles.isLoading}
          />
        ),
      },
      returns: {
        node: (
          <ReturnsChartCard
            range={returnsRange}
            onRangeChange={setReturnsRange}
            candles={returnsCandles.data}
            isLoading={returnsCandles.isLoading}
          />
        ),
      },
      heatmap: {
        node: (
          <ReturnsHeatmapCard
            range={returnsRange}
            onRangeChange={setReturnsRange}
            candles={returnsCandles.data}
            isLoading={returnsCandles.isLoading}
          />
        ),
      },
      trend: {
        node: (
          <MovingAverageChartCard
            assetKey={assetKey}
            range={priceRange}
            onRangeChange={setPriceRange}
            candles={priceCandles.data}
            isLoading={priceCandles.isLoading}
          />
        ),
      },
      bands: {
        node: (
          <PriceBandsChartCard
            assetKey={assetKey}
            range={priceRange}
            onRangeChange={setPriceRange}
            candles={priceCandles.data}
            isLoading={priceCandles.isLoading}
          />
        ),
      },
      drawdown: {
        node: (
          <DrawdownChartCard
            assetKey={assetKey}
            range={drawdownRange}
            onRangeChange={setDrawdownRange}
            candles={drawdownCandles.data}
            isLoading={drawdownCandles.isLoading}
          />
        ),
      },
      volatility: {
        node: (
          <VolatilityChartCard
            range={volRange}
            onRangeChange={setVolRange}
            candles={volCandles.data}
            isLoading={volCandles.isLoading}
          />
        ),
      },
      comparison: {
        node: (
          <AssetComparisonChartCard
            range={comparisonRange}
            onRangeChange={setComparisonRange}
            series={comparisonCandles.data}
            isLoading={comparisonCandles.isLoading}
          />
        ),
      },
      correlation: {
        node: (
          <CorrelationChartCard
            range={comparisonRange}
            onRangeChange={setComparisonRange}
            series={comparisonCandles.data}
            isLoading={comparisonCandles.isLoading}
          />
        ),
      },
    }),
    [
      assetKey,
      comparisonCandles.data,
      comparisonCandles.isLoading,
      comparisonRange,
      drawdownCandles.data,
      drawdownCandles.isLoading,
      drawdownRange,
      priceCandles.data,
      priceCandles.isLoading,
      priceRange,
      returnsCandles.data,
      returnsCandles.isLoading,
      returnsRange,
      volCandles.data,
      volCandles.isLoading,
      volRange,
      volumeCandles.data,
      volumeCandles.isLoading,
      volumeRange,
    ],
  )

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
        open={connectToastOpen && !connectOpen}
        variant="error"
        message={connectErrorText ?? ''}
        onClose={() => setDismissedConnectError(connectErrorText)}
      />

      <div className="toolbar">
        <div
          ref={assetStripRef}
          className={[
            'segmented',
            'assetSwitch',
            assetStripEdges.start ? 'segmentedFadeStart' : '',
            assetStripEdges.end ? 'segmentedFadeEnd' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="tablist"
          aria-label="Asset selector"
        >
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

        {isConnected ? (
          <div className="segmented viewSwitch" role="tablist" aria-label="Dashboard view">
            <button
              className={activeDashboardView === 'market' ? 'segBtn segBtnActive' : 'segBtn'}
              type="button"
              onClick={() => setDashboardView('market')}
              aria-selected={activeDashboardView === 'market'}
            >
              Market
            </button>
            <button
              className={activeDashboardView === 'portfolio' ? 'segBtn segBtnActive' : 'segBtn'}
              type="button"
              onClick={() => setDashboardView('portfolio')}
              aria-selected={activeDashboardView === 'portfolio'}
            >
              Portfolio
            </button>
          </div>
        ) : null}
      </div>

      {activeDashboardView === 'market' ? (
        <>
      <div className="kpiGrid">
        <MarketMoodCard />

        <div className="kpiCard">
          <div className="kpiLabel">{assetKey} Price</div>
          <div className="kpiValue">
            {spotUsd.data ? `$${spotUsd.data.toLocaleString()}` : spotUsd.isLoading ? 'Loading...' : '-'}
          </div>
          <div className="kpiSub">
            {change24h.data !== undefined ? (
              <span className={change24h.data >= 0 ? 'pos' : 'neg'}>
                {change24h.data >= 0 ? '+' : ''}
                {change24h.data.toFixed(2)}% (24h)
              </span>
            ) : (
              <span className="muted">-</span>
            )}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Momentum</div>
          <div className="kpiValue">
            {change24h.data !== undefined && periodReturn !== undefined
              ? `${change24h.data + periodReturn >= 0 ? '+' : ''}${(change24h.data + periodReturn).toFixed(2)}%`
              : change24h.isLoading || priceCandles.isLoading
                ? 'Loading...'
                : '-'}
          </div>
          <div className="kpiSub">
            {change24h.data !== undefined && periodReturn !== undefined ? (
              <span className={change24h.data + periodReturn >= 0 ? 'pos' : 'neg'}>
                24h + selected range
              </span>
            ) : (
              <span className="muted">-</span>
            )}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Range ({priceRange})</div>
          <div className="kpiValue">
            {range7d
              ? `${range7d.pct.toFixed(2)}%`
              : priceCandles.isLoading
                ? 'Loading...'
                : '-'}
          </div>
          <div className="kpiSub muted">
            {range7d ? `$${Math.round(range7d.lo).toLocaleString()} → $${Math.round(range7d.hi).toLocaleString()}` : '-'}
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Points ({priceRange})</div>
          <div className="kpiValue">
            {priceCandles.data
              ? `${priceCandles.data.length}`
              : priceCandles.isLoading
                ? 'Loading...'
                : '-'}
          </div>
          <div className="kpiSub muted">Hourly candles</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Return ({priceRange})</div>
          <div className="kpiValue">
            {periodReturn !== undefined
              ? `${periodReturn >= 0 ? '+' : ''}${periodReturn.toFixed(2)}%`
              : priceCandles.isLoading
                ? 'Loading...'
                : '-'}
          </div>
          <div className="kpiSub">
            {periodReturn !== undefined ? (
              <span className={periodReturn >= 0 ? 'pos' : 'neg'}>
                {periodReturn >= 0 ? 'Uptrend' : 'Downtrend'}
              </span>
            ) : (
              <span className="muted">-</span>
            )}
          </div>
        </div>


        <div className="kpiCard">
          <div className="kpiLabel">Avg Volume ({volumeRange})</div>
          <div className="kpiValue">
            {avgVolume !== undefined
              ? compact.format(avgVolume)
              : volumeCandles.isLoading
                ? 'Loading...'
                : '-'}
          </div>
          <div className="kpiSub muted">Per hour</div>
        </div>
      </div>

      <Suspense fallback={<ChartFallback />}>
        <section
          className="marketGrid"
          aria-label="Customizable market charts"
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragOverMarketCard(null)
            }
          }}
        >
          {marketCardOrder.map((cardId) => {
            const card = marketCards[cardId]
            return (
              <div
                key={cardId}
                className={[
                  'marketTile',
                  card.wide ? 'marketTileWide' : '',
                  draggedMarketCard === cardId ? 'marketTileDragging' : '',
                  dragOverMarketCard === cardId ? 'marketTileDragOver' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable
                title="Drag to reorder"
                onDragStart={(event) => {
                  setDraggedMarketCard(cardId)
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', cardId)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragOverMarketCard(cardId)
                }}
                onDragLeave={() => setDragOverMarketCard((current) => (current === cardId ? null : current))}
                onDrop={(event) => {
                  event.preventDefault()
                  if (draggedMarketCard) moveMarketCard(draggedMarketCard, cardId)
                  setDraggedMarketCard(null)
                  setDragOverMarketCard(null)
                }}
                onDragEnd={() => {
                  setDraggedMarketCard(null)
                  setDragOverMarketCard(null)
                }}
              >
                {card.node}
              </div>
            )
          })}
        </section>
      </Suspense>
        </>
      ) : (
        <>
          <div className="portfolioSummary">
            <div className="kpiCard portfolioHero">
              <div className="kpiLabel">Portfolio Total</div>
              <div className="kpiValue">{usd.format(portfolioByAsset.totalUsd)}</div>
              <div className="kpiSub">
                {portfolioChange24h ? (
                  <span className={portfolioChange24h.deltaUsd >= 0 ? 'pos' : 'neg'}>
                    {portfolioChange24h.deltaUsd >= 0 ? '+' : '-'}
                    {usd.format(Math.abs(portfolioChange24h.deltaUsd))} (
                    {portfolioChange24h.pct >= 0 ? '+' : ''}
                    {portfolioChange24h.pct.toFixed(2)}%) 24h
                  </span>
                ) : (
                  <span className="muted">
                    {portfolioChanges.isLoading ? 'Loading 24h change...' : '24h change unavailable'}
                  </span>
                )}
              </div>
              <div className="kpiSub muted">
                {portfolioAssetCount
                  ? `${portfolioAssetCount} supported asset${portfolioAssetCount === 1 ? '' : 's'} detected`
                  : 'No supported assets detected yet'}
                {portfolioChange24h?.uncoveredCount
                  ? ` · ${portfolioChange24h.uncoveredCount} without a 24h quote`
                  : ''}
              </div>
            </div>

            <div className="kpiCard portfolioGasCard">
              <div className="kpiLabel">Selected Holding</div>
              <div className="kpiValue">{portfolioUsd !== undefined ? usd.format(portfolioUsd) : '-'}</div>
              <div className="kpiSub muted">{selectedHoldingText ?? '-'}</div>
            </div>

            <div className="kpiCard">
              <div className="kpiLabel">Network Status</div>
              <div className="kpiValue">{balanceIssueCount ? `${balanceIssueCount}` : 'OK'}</div>
              <div className="kpiSub muted">
                {balanceIssueCount ? 'Some balance reads are incomplete' : 'Balance reads completed'}
              </div>
            </div>

            <div className="kpiCard">
              <div className="kpiLabel">Gas</div>
              <div className="kpiValue">{gas.isLoading ? 'Loading...' : gas.data?.length ? `${gas.data.length}` : '-'}</div>
              <div className="kpiSub muted">{gasSummary}</div>
            </div>
          </div>

          <Suspense fallback={<ChartFallback />}>
            <section className="grid1">
              <PortfolioHistoryChartCard
                points={portfolioValueSeries}
                stats={portfolioStats}
                range={portfolioRange}
                onRangeChange={setPortfolioRange}
                isLoading={portfolioCandles.isLoading || assetTotals.isLoading}
              />
            </section>
          </Suspense>

          <section className="grid1">
            <PortfolioHoldingsCard
              rows={holdingRows}
              totalUsd={portfolioByAsset.totalUsd}
              isLoading={assetTotals.isLoading || spotMany.isLoading}
              selectedAssetKey={assetKey}
              onSelectAsset={setAssetKey}
            />
          </section>

          <Suspense fallback={<ChartFallback />}>
            <section className="grid2">
              <PortfolioChartCard
                items={portfolioByAsset.items}
                isLoading={assetTotals.isLoading || spotMany.isLoading}
                totalUsd={portfolioByAsset.totalUsd}
              />
              <div className="card">
                <div className="cardHeader">
                  <h2>Wallet Actions</h2>
                </div>
                <div className="portfolioActions">
                  <button className="btn btnPrimary" type="button" onClick={() => setAccountOpen(true)}>
                    Open Account Details
                  </button>
                  <button className="btn" type="button" onClick={() => setSwapOpen(true)}>
                    Swap Selected Asset
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      void assetTotals.refetch()
                      void gas.refetch()
                      void balances.refetch()
                    }}
                    disabled={assetTotals.isRefetching || gas.isRefetching || balances.isRefetching}
                  >
                    {assetTotals.isRefetching || gas.isRefetching || balances.isRefetching
                      ? 'Refreshing...'
                      : 'Refresh Portfolio'}
                  </button>
                </div>
                <div className="portfolioActionMeta">
                  <div>
                    <span className="muted small">Selected</span>
                    <strong>{assetKey}</strong>
                  </div>
                  <div>
                    <span className="muted small">Assets</span>
                    <strong>{portfolioAssetCount || 0}</strong>
                  </div>
                  <div>
                    <span className="muted small">Networks</span>
                    <strong>{balanceIssueCount ? 'Partial' : 'OK'}</strong>
                  </div>
                </div>
              </div>
            </section>
          </Suspense>

          <section className="grid2">
            <PortfolioRiskCard
              stats={portfolioStats}
              concentration={portfolioConcentration}
              range={portfolioRange}
              isLoading={portfolioCandles.isLoading || assetTotals.isLoading}
            />
            <CostBasisCard
              summary={costBasisSummary}
              onSetCost={setAssetCost}
              onClearAll={clearCostBasis}
            />
          </section>
        </>
      )}

      {supportOpen ? (
        <Suspense fallback={null}>
          <SupportDeveloperModal
            open
            onClose={() => setSupportOpen(false)}
            chainId={chain?.id}
            assetKey={assetKey}
          />
        </Suspense>
      ) : null}

      {connectOpen ? (
        <Suspense fallback={null}>
          <ConnectWalletModal
            open
            onClose={() => {
              cancelConnect()
              setConnectOpen(false)
            }}
            connectors={connectors}
            pending={
              pendingConnector
                ? {
                    uid: pendingConnector.uid,
                    id: pendingConnector.id,
                    name: pendingConnector.name,
                    icon: pendingConnector.icon,
                  }
                : undefined
            }
            walletConnectUri={walletConnectUri}
            errorText={connectErrorText}
            onSelectConnector={(c) => void runConnect(c)}
            onRetry={() => {
              const last = connectors.find((c) => c.uid === lastAttemptedUid.current)
              if (last) void runConnect(last)
            }}
            onBack={cancelConnect}
          />
        </Suspense>
      ) : null}


      {swapOpen ? (
        <Suspense fallback={null}>
          <SwapModal
            open
            onClose={() => setSwapOpen(false)}
            assetKey={assetKey}
            chain={chain}
            isConnected={isConnected}
          />
        </Suspense>
      ) : null}

      {accountOpen ? (
        <Suspense fallback={null}>
          <AccountModal
            open
            onClose={() => setAccountOpen(false)}
            isConnected={isConnected}
            address={address}
            onOpenConnect={() => {
              setAccountOpen(false)
              setConnectOpen(true)
            }}
            gas={{ isLoading: gas.isLoading, isRefetching: gas.isRefetching, data: gas.data, refetch: gas.refetch }}
            onDisconnect={() => disconnect()}
            assetTotals={{
              isLoading: assetTotals.isLoading,
              isRefetching: assetTotals.isRefetching,
              data: assetTotals.data,
              refetch: assetTotals.refetch,
            }}
            spotMany={spotMany}
            chainIds={chainIds}
            portfolioTotalUsd={portfolioByAsset.totalUsd}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

export default App
