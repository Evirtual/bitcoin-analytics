import { useQuery } from '@tanstack/react-query'
import { createPublicClient, formatUnits, http, type Address } from 'viem'
import { base, bsc, mainnet } from 'viem/chains'
import type { ChainId } from '../assets/catalog'

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

function getClient(chainId: ChainId) {
  const mainnetRpc = import.meta.env.VITE_RPC_MAINNET as string | undefined
  const baseRpc = import.meta.env.VITE_RPC_BASE as string | undefined
  const bscRpc = import.meta.env.VITE_RPC_BSC as string | undefined

  if (chainId === 1) return createPublicClient({ chain: mainnet, transport: http(mainnetRpc) })
  if (chainId === 8453) return createPublicClient({ chain: base, transport: http(baseRpc) })
  return createPublicClient({ chain: bsc, transport: http(bscRpc) })
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

      const rows: Array<{ chainId: ChainId; chainName: string; symbol: string; amount: number }> = []
      for (const chainId of chainIds) {
        const client = getClient(chainId)
        const bal = await client.getBalance({ address })
        const amount = Number(formatUnits(bal, 18))
        rows.push({
          chainId,
          chainName: chainName(chainId),
          symbol: gasSymbol(chainId),
          amount: Number.isFinite(amount) ? amount : 0,
        })
      }

      return rows.map((r) => ({
        ...r,
        formatted: r.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }),
      }))
    },
    staleTime: 2 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => isRateLimitError(err) && failureCount < 3,
    retryDelay: (failureCount, err) => retryDelayMs(failureCount, err),
  })
}
