import { useQueries, useQuery } from '@tanstack/react-query'
import { formatUnits, type Address } from 'viem'
import { ASSETS, type AssetKey, type AssetOnChain, type ChainId } from '../assets/catalog'
import { getChainName, getClient, getRpcErrorMessage } from '../lib/rpc'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStatus(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined
  const raw = value.status
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function readMessage(value: unknown): string {
  if (value instanceof Error) return value.message
  if (!isRecord(value)) return ''
  const raw = value.message
  return typeof raw === 'string' ? raw : ''
}

function isRateLimitError(err: unknown): boolean {
  const status =
    readStatus(err) ??
    (isRecord(err) ? readStatus(err.cause) : undefined) ??
    (isRecord(err) ? readStatus(err.response) : undefined)
  if (status === 429) return true
  const msg = readMessage(err)
  return msg.includes('429') || msg.toLowerCase().includes('rate limit')
}

function retryDelayMs(failureCount: number, err: unknown) {
  if (isRateLimitError(err)) return Math.min(60_000, 2_000 * 2 ** failureCount)
  return Math.min(10_000, 1_000 * 2 ** failureCount)
}

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
] as const

export type AssetChainRow = {
  chainId: ChainId
  chainName: string
  supported: boolean
  tokenSymbol: string
  amount: number
  formatted: string
  error: string | undefined
  status: string
}

// The per-chain reads have already happened to produce the total, so they are
// carried with it. Dropping them here only meant fetching them a second time
// as soon as anything wanted to show where a balance actually sits.
export type AssetTotal = {
  assetKey: AssetKey
  totalAmount: number
  errorCount: number
  byChain: AssetChainRow[]
}

function successfulAmount(balance: bigint, decimals: number) {
  const amount = Number(formatUnits(balance, decimals))
  return Number.isFinite(amount) ? amount : 0
}

export async function fetchAssetBalances(address: Address, assetKey: AssetKey, chainIds: ChainId[]) {
  const asset = ASSETS[assetKey]

  const toDefs = (value: (typeof asset.perChain)[ChainId] | undefined): AssetOnChain[] => {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  const rows = await Promise.all(
    chainIds.map(async (chainId) => {
      const defs = toDefs(asset.perChain[chainId])
      if (!defs.length) {
        return {
          chainId,
          chainName: getChainName(chainId),
          supported: false,
          tokenSymbol: '—',
          amount: 0,
          error: undefined,
        }
      }

      const client = getClient(chainId)
      const balances: Array<{ amount: number; error: string | undefined }> = defs.map(() => ({
        amount: 0,
        error: undefined,
      }))

      await Promise.all([
        Promise.all(
          defs.map(async (def, index) => {
            if (def.kind !== 'native') return
            try {
              const bal = await client.getBalance({ address })
              balances[index] = { amount: successfulAmount(bal, def.decimals), error: undefined }
            } catch (err) {
              balances[index] = { amount: 0, error: getRpcErrorMessage(err) }
            }
          }),
        ),
        (async () => {
          const erc20Defs = defs
            .map((def, index) => ({ def, index }))
            .filter((item): item is { def: Extract<AssetOnChain, { kind: 'erc20' }>; index: number } => {
              return item.def.kind === 'erc20'
            })

          if (!erc20Defs.length) return

          try {
            const results = await client.multicall({
              allowFailure: true,
              contracts: erc20Defs.map(({ def }) => ({
                address: def.address,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [address],
              })),
            })

            results.forEach((result, resultIndex) => {
              const { def, index } = erc20Defs[resultIndex]!
              if (result.status === 'success') {
                balances[index] = {
                  amount: successfulAmount(result.result, def.decimals),
                  error: undefined,
                }
              } else {
                balances[index] = { amount: 0, error: getRpcErrorMessage(result.error) }
              }
            })
          } catch (err) {
            const message = getRpcErrorMessage(err)
            for (const { index } of erc20Defs) {
              balances[index] = { amount: 0, error: message }
            }
          }
        })(),
      ])

      const amount = balances.reduce((acc, r) => acc + r.amount, 0)
      const errors = balances.map((r) => r.error).filter((msg): msg is string => Boolean(msg))

      return {
        chainId,
        chainName: getChainName(chainId),
        supported: true,
        tokenSymbol: defs.length > 1 ? assetKey : defs[0]!.symbol,
        amount,
        error: errors.length === defs.length ? errors[0] : undefined,
        status: errors.length === 0 ? 'ok' : errors.length === defs.length ? 'unavailable' : 'partial',
      }
    }),
  )

  const byChain = rows.map((r) => ({
    chainId: r.chainId,
    chainName: r.chainName,
    supported: r.supported,
    tokenSymbol: r.tokenSymbol,
    amount: r.amount,
    formatted: r.error ? 'Unavailable' : r.amount.toLocaleString(undefined, { maximumFractionDigits: 8 }),
    error: r.error,
    status: r.status ?? (r.supported ? 'ok' : 'unsupported'),
  }))

  const totalAmount = byChain.filter((r) => r.supported).reduce((acc, r) => acc + r.amount, 0)
  const errorCount = byChain.filter((r) => r.supported && r.error).length

  return {
    byChain,
    totalAmount,
    totalFormatted: totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 }),
    errorCount,
  }
}

async function fetchAssetTotal(address: Address, assetKey: AssetKey, chainIds: ChainId[]): Promise<AssetTotal> {
  try {
    const res = await fetchAssetBalances(address, assetKey, chainIds)
    return {
      assetKey,
      totalAmount: res.totalAmount,
      errorCount: res.errorCount,
      byChain: res.byChain,
    }
  } catch {
    return { assetKey, totalAmount: 0, errorCount: chainIds.length, byChain: [] }
  }
}

export function useAssetBalances(address: Address | undefined, assetKey: AssetKey, chainIds: ChainId[]) {
  return useQuery({
    queryKey: ['balances', assetKey, address, chainIds],
    enabled: Boolean(address) && chainIds.length > 0,
    queryFn: async () => {
      if (!address) throw new Error('No address')
      return fetchAssetBalances(address, assetKey, chainIds)
    },
    staleTime: 2 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => isRateLimitError(err) && failureCount < 3,
    retryDelay: (failureCount, err) => retryDelayMs(failureCount, err),
  })
}

export function useUserNonZeroAssets(address: Address | undefined, chainIds: ChainId[], assetKeys: AssetKey[]) {
  const queries = useQueries({
    queries: assetKeys.map((assetKey) => ({
      queryKey: ['balances', 'probe', assetKey, address, chainIds],
      enabled: Boolean(address) && chainIds.length > 0,
      queryFn: async () => {
        if (!address) return { assetKey, totalAmount: 0, errorCount: 0, byChain: [] }
        return fetchAssetTotal(address, assetKey, chainIds)
      },
      staleTime: 30_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const data = queries
    .map((q) => q.data)
    .filter((d): d is AssetTotal => Boolean(d))
    .filter((d) => d.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)

  return { isLoading, data }
}

export function useUserAssetTotals(address: Address | undefined, chainIds: ChainId[], assetKeys: AssetKey[]) {
  const q = useQuery({
    queryKey: ['balances', 'totals', address, chainIds, assetKeys],
    enabled: Boolean(address) && chainIds.length > 0 && assetKeys.length > 0,
    queryFn: async () => {
      if (!address) return [] as AssetTotal[]
      return Promise.all(assetKeys.map((assetKey) => fetchAssetTotal(address, assetKey, chainIds)))
    },
    staleTime: 2 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => isRateLimitError(err) && failureCount < 3,
    retryDelay: (failureCount, err) => retryDelayMs(failureCount, err),
  })

  return {
    isLoading: q.isLoading,
    isRefetching: q.isRefetching,
    data: q.data ?? [],
    refetch: q.refetch,
  }
}
