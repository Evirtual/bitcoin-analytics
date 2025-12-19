import { useQueries, useQuery } from '@tanstack/react-query'
import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { base, bsc, mainnet } from 'viem/chains'
import { ASSETS, CHAINS, type AssetKey, type ChainId } from '../assets/catalog'

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
  if (chainId === 1) return createPublicClient({ chain: mainnet, transport: http() })
  if (chainId === 8453) return createPublicClient({ chain: base, transport: http() })
  return createPublicClient({ chain: bsc, transport: http() })
}

export async function fetchAssetBalances(address: Address, assetKey: AssetKey, chainIds: ChainId[]) {
  const asset = ASSETS[assetKey]
  const rows = await Promise.all(
    chainIds.map(async (chainId) => {
      const def = asset.perChain[chainId]
      if (!def) {
        return {
          chainId,
          chainName: CHAINS.find((c) => c.id === chainId)?.name ?? String(chainId),
          tokenSymbol: '—',
          amount: 0,
        }
      }

      const client = getClient(chainId)
      if (def.kind === 'native') {
        const bal = await client.getBalance({ address })
        const amount = Number(formatUnits(bal, def.decimals))
        return {
          chainId,
          chainName: CHAINS.find((c) => c.id === chainId)?.name ?? String(chainId),
          tokenSymbol: def.symbol,
          amount: Number.isFinite(amount) ? amount : 0,
        }
      }

      const bal = await client.readContract({
        address: def.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })
      const amount = Number(formatUnits(bal, def.decimals))
      return {
        chainId,
        chainName: CHAINS.find((c) => c.id === chainId)?.name ?? String(chainId),
        tokenSymbol: def.symbol,
        amount: Number.isFinite(amount) ? amount : 0,
      }
    }),
  )

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
    staleTime: 20_000,
    refetchInterval: 20_000,
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
  const queries = useQueries({
    queries: assetKeys.map((assetKey) => ({
      queryKey: ['balances', 'totals', assetKey, address, chainIds],
      enabled: Boolean(address) && chainIds.length > 0,
      queryFn: async () => {
        if (!address) return { assetKey, totalAmount: 0 }
        const res = await fetchAssetBalances(address, assetKey, chainIds)
        return { assetKey, totalAmount: res.totalAmount }
      },
      staleTime: 30_000,
      refetchInterval: 30_000,
    })),
  })

  const isLoading = queries.some((q) => q.isLoading)
  const data = queries
    .map((q) => q.data)
    .filter(Boolean)
    .map((d) => d as { assetKey: AssetKey; totalAmount: number })
    .sort((a, b) => b.totalAmount - a.totalAmount)

  return { isLoading, data }
}
