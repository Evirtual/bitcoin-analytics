import { useQueries, useQuery } from '@tanstack/react-query'
import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { base, bsc, mainnet } from 'viem/chains'
import { ASSETS, CHAINS, type AssetKey, type ChainId } from '../assets/catalog'

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

function getClient(chainId: ChainId) {
  const mainnetRpc = import.meta.env.VITE_RPC_MAINNET as string | undefined
  const baseRpc = import.meta.env.VITE_RPC_BASE as string | undefined
  const bscRpc = import.meta.env.VITE_RPC_BSC as string | undefined

  if (chainId === 1) return createPublicClient({ chain: mainnet, transport: http(mainnetRpc) })
  if (chainId === 8453) return createPublicClient({ chain: base, transport: http(baseRpc) })
  return createPublicClient({ chain: bsc, transport: http(bscRpc) })
}

export async function fetchAssetBalances(address: Address, assetKey: AssetKey, chainIds: ChainId[]) {
  const asset = ASSETS[assetKey]
  const rows: Array<{
    chainId: ChainId
    chainName: string
    tokenSymbol: string
    amount: number
  }> = []

  for (const chainId of chainIds) {
      const def = asset.perChain[chainId]
      if (!def) {
        rows.push({
          chainId,
          chainName: CHAINS.find((c) => c.id === chainId)?.name ?? String(chainId),
          tokenSymbol: '—',
          amount: 0,
        })
        continue
      }

      const client = getClient(chainId)
      if (def.kind === 'native') {
        const bal = await client.getBalance({ address })
        const amount = Number(formatUnits(bal, def.decimals))
        rows.push({
          chainId,
          chainName: CHAINS.find((c) => c.id === chainId)?.name ?? String(chainId),
          tokenSymbol: def.symbol,
          amount: Number.isFinite(amount) ? amount : 0,
        })
        continue
      }

      const bal = await client.readContract({
        address: def.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })
      const amount = Number(formatUnits(bal, def.decimals))
      rows.push({
        chainId,
        chainName: CHAINS.find((c) => c.id === chainId)?.name ?? String(chainId),
        tokenSymbol: def.symbol,
        amount: Number.isFinite(amount) ? amount : 0,
      })
  }

  const byChain = rows
    .filter((r) => r.tokenSymbol !== '—')
    .map((r) => ({
      chainId: r.chainId,
      chainName: r.chainName,
      tokenSymbol: r.tokenSymbol,
      amount: r.amount,
      formatted: r.amount.toLocaleString(undefined, { maximumFractionDigits: 8 }),
    }))

  const totalAmount = byChain.reduce((acc, r) => acc + r.amount, 0)

  return {
    byChain,
    totalAmount,
    totalFormatted: totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 }),
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
        if (!address) return { assetKey, totalAmount: 0 }
        const res = await fetchAssetBalances(address, assetKey, chainIds)
        return { assetKey, totalAmount: res.totalAmount }
      },
      staleTime: 30_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const data = queries
    .map((q) => q.data)
    .filter(Boolean)
    .filter((d) => (d as { totalAmount: number }).totalAmount > 0)
    .map((d) => d as { assetKey: AssetKey; totalAmount: number })
    .sort((a, b) => b.totalAmount - a.totalAmount)

  return { isLoading, data }
}

export function useUserAssetTotals(address: Address | undefined, chainIds: ChainId[], assetKeys: AssetKey[]) {
  const q = useQuery({
    queryKey: ['balances', 'totals', address, chainIds, assetKeys],
    enabled: Boolean(address) && chainIds.length > 0 && assetKeys.length > 0,
    queryFn: async () => {
      if (!address) return [] as Array<{ assetKey: AssetKey; totalAmount: number }>
      const rows: Array<{ assetKey: AssetKey; totalAmount: number }> = []
      for (const assetKey of assetKeys) {
        const res = await fetchAssetBalances(address, assetKey, chainIds)
        rows.push({ assetKey, totalAmount: res.totalAmount })
      }
      return rows.sort((a, b) => b.totalAmount - a.totalAmount)
    },
    staleTime: 2 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => isRateLimitError(err) && failureCount < 3,
    retryDelay: (failureCount, err) => retryDelayMs(failureCount, err),
  })

  return { isLoading: q.isLoading, data: q.data ?? [] }
}
