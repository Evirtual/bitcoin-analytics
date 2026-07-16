import { createPublicClient, fallback, http } from 'viem'
import { base, bsc, mainnet } from 'viem/chains'
import type { ChainId } from '../assets/catalog'

const RPC_TIMEOUT_MS = 8_000
const RPC_RETRY_COUNT = 1

const PUBLIC_RPCS: Record<ChainId, string[]> = {
  1: ['https://ethereum-rpc.publicnode.com', 'https://eth.llamarpc.com'],
  8453: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com', 'https://base.llamarpc.com'],
  56: ['https://bsc-dataseed.binance.org', 'https://bsc-rpc.publicnode.com', 'https://binance.llamarpc.com'],
}

function envRpc(chainId: ChainId): string | undefined {
  if (chainId === 1) return import.meta.env.VITE_RPC_MAINNET as string | undefined
  if (chainId === 8453) return import.meta.env.VITE_RPC_BASE as string | undefined
  return import.meta.env.VITE_RPC_BSC as string | undefined
}

function transportFor(chainId: ChainId) {
  const options = { retryCount: RPC_RETRY_COUNT, timeout: RPC_TIMEOUT_MS }
  const customRpc = envRpc(chainId)?.trim()
  const urls = customRpc ? [customRpc, ...PUBLIC_RPCS[chainId]] : PUBLIC_RPCS[chainId]

  return fallback(urls.map((url) => http(url, options)), {
    rank: false,
    retryCount: 0,
  })
}

export function getChainName(chainId: ChainId) {
  if (chainId === 1) return 'Ethereum'
  if (chainId === 8453) return 'Base'
  return 'BSC'
}

export function getGasSymbol(chainId: ChainId) {
  if (chainId === 56) return 'BNB'
  return 'ETH'
}

export function getClient(chainId: ChainId) {
  if (chainId === 1) return createPublicClient({ chain: mainnet, transport: transportFor(chainId) })
  if (chainId === 8453) return createPublicClient({ chain: base, transport: transportFor(chainId) })
  return createPublicClient({ chain: bsc, transport: transportFor(chainId) })
}

export function getRpcErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    const message = err.message.toLowerCase()
    if (message.includes('timeout')) return 'Network timeout'
    if (message.includes('http request failed')) return 'Network unavailable'
    if (message.includes('fetch failed')) return 'Network unavailable'
    if (message.includes('rate limit') || message.includes('429')) return 'Rate limited'
    if (err.message.length > 90) return `${err.message.slice(0, 87)}...`
    return err.message
  }
  return 'Network unavailable'
}
