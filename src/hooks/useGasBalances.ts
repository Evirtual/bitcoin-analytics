import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { base, bsc, mainnet } from 'viem/chains'
import type { ChainId } from '../assets/catalog'

function getClient(chainId: ChainId) {
  if (chainId === 1) return createPublicClient({ chain: mainnet, transport: http() })
  if (chainId === 8453) return createPublicClient({ chain: base, transport: http() })
  return createPublicClient({ chain: bsc, transport: http() })
}

function gasSymbol(chainId: ChainId) {
  if (chainId === 56) return 'BNB'
  return 'ETH'
}

function chainName(chainId: ChainId) {
  if (chainId === 1) return 'Ethereum'
  if (chainId === 8453) return 'Base'
  return 'BSC'
}

export function useGasBalances(address: Address | undefined, chainIds: ChainId[]) {
  return useQuery({
    queryKey: ['balances', 'gas', address, chainIds],
    enabled: Boolean(address) && chainIds.length > 0,
    queryFn: async () => {
      if (!address) throw new Error('No address')

      const rows = await Promise.all(
        chainIds.map(async (chainId) => {
          const client = getClient(chainId)
          const bal = await client.getBalance({ address })
          const amount = Number(formatUnits(bal, 18))
          return {
            chainId,
            chainName: chainName(chainId),
            symbol: gasSymbol(chainId),
            amount: Number.isFinite(amount) ? amount : 0,
          }
        }),
      )

      return rows.map((r) => ({
        ...r,
        formatted: r.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }),
      }))
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
