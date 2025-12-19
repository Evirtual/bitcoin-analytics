import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { base, bsc, mainnet } from 'viem/chains'

export type ChainId = 1 | 8453 | 56

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }],
  },
] as const

// Token addresses per chain.
// Base uses the canonical WBTC: 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c
// Ethereum mainnet WBTC:       0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
// BSC doesn't have canonical WBTC; we use Binance-Peg BTCB by default.
const tokenByChain: Record<ChainId, { symbol: string; address: Address; decimals: number }> = {
  1: { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  8453: { symbol: 'WBTC', address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c', decimals: 8 },
  56: { symbol: 'BTCB', address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18 },
}

function getClient(chainId: ChainId) {
  if (chainId === 1)
    return createPublicClient({ chain: mainnet, transport: http() })
  if (chainId === 8453)
    return createPublicClient({ chain: base, transport: http() })
  return createPublicClient({ chain: bsc, transport: http() })
}

function chainName(chainId: ChainId) {
  switch (chainId) {
    case 1:
      return 'Ethereum'
    case 8453:
      return 'Base'
    case 56:
      return 'BSC'
  }
}

export function useWbtcBalances(address: Address | undefined, chainIds: ChainId[]) {
  return useQuery({
    queryKey: ['wbtc', 'balances', address, chainIds],
    enabled: Boolean(address) && chainIds.length > 0,
    queryFn: async () => {
      if (!address) throw new Error('No address')

      const rows = await Promise.all(
        chainIds.map(async (cid) => {
          const token = tokenByChain[cid]
          const client = getClient(cid)
          const balance = await client.readContract({
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          })
          const formatted = formatUnits(balance, token.decimals)
          const amount = Number(formatted)
          return {
            chainId: cid,
            chainName: chainName(cid),
            tokenSymbol: token.symbol,
            raw: balance as bigint,
            formatted,
            amount: Number.isFinite(amount) ? amount : 0,
          }
        }),
      )

      // Total: normalize via bigint into 1e8 “sats-like” scale where possible.
      // Since BSC uses 18 decimals for BTCB, we compute totals by parsing floats to keep this simple.
      const totalAmount = rows.reduce((acc, r) => acc + r.amount, 0)

      return {
        byChain: rows.map((r) => ({
          chainId: r.chainId,
          chainName: r.chainName,
          tokenSymbol: r.tokenSymbol,
          amount: r.amount,
          formatted: r.amount.toLocaleString(undefined, {
            maximumFractionDigits: 8,
          }),
        })),
        totalAmount,
        totalFormatted: totalAmount.toLocaleString(undefined, { maximumFractionDigits: 8 }),
      }
    },
    staleTime: 20_000,
    refetchInterval: 20_000,
  })
}
