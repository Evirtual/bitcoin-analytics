import { useQuery } from '@tanstack/react-query'
import { formatUnits, type Address } from 'viem'
import type { ChainId } from '../assets/catalog'
import { getChainName, getClient, getGasSymbol, getRpcErrorMessage } from '../lib/rpc'

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

export function useGasBalances(address: Address | undefined, chainIds: ChainId[]) {
  return useQuery({
    queryKey: ['balances', 'gas', address, chainIds],
    enabled: Boolean(address) && chainIds.length > 0,
    queryFn: async () => {
      if (!address) throw new Error('No address')

      const rows = await Promise.all(
        chainIds.map(async (chainId) => {
          try {
            const client = getClient(chainId)
            const bal = await client.getBalance({ address })
            const amount = Number(formatUnits(bal, 18))
            return {
              chainId,
              chainName: getChainName(chainId),
              symbol: getGasSymbol(chainId),
              amount: Number.isFinite(amount) ? amount : 0,
              error: undefined,
            }
          } catch (err) {
            return {
              chainId,
              chainName: getChainName(chainId),
              symbol: getGasSymbol(chainId),
              amount: 0,
              error: getRpcErrorMessage(err),
            }
          }
        }),
      )

      return rows.map((r) => ({
        ...r,
        formatted: r.error ? 'Unavailable' : r.amount.toLocaleString(undefined, { maximumFractionDigits: 6 }),
      }))
    },
    staleTime: 2 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: (failureCount, err) => isRateLimitError(err) && failureCount < 3,
    retryDelay: (failureCount, err) => retryDelayMs(failureCount, err),
  })
}
