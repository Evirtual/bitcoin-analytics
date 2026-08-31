import { useQuery } from '@tanstack/react-query'
import { walletConnectProjectId } from '../wagmi'

/**
 * The wallets WalletConnect knows about.
 *
 * wagmi has no concept of a wallet registry -- it knows the connectors it was
 * given, plus whatever EIP-6963 announced -- so the list has to come from
 * WalletConnect's own explorer. It is a plain HTTP API keyed by the project id,
 * fetched only when someone opens the pairing window, so nothing is downloaded
 * for a visitor who never asks to connect.
 */
const EXPLORER = 'https://explorer-api.walletconnect.com/v3'

/**
 * Deep enough that searching has something to find. The registry runs to
 * several hundred; this is the popular end of it, filtered in the browser so
 * typing costs no further requests.
 */
const ENTRIES = 60

export type DirectoryWallet = {
  id: string
  name: string
  imageUrl: string
  native: string
  universal: string
}

type ExplorerListing = {
  id?: string
  name?: string
  image_id?: string
  mobile?: { native?: string | null; universal?: string | null }
}

/**
 * Point a wallet at this pairing request.
 *
 * Universal links are preferred where a wallet has one: a custom scheme fails
 * silently when the app is missing, while a universal link lands on the
 * wallet's own page instead of nothing happening at all.
 */
export function walletConnectDeepLink(wallet: DirectoryWallet, uri: string): string | undefined {
  const encoded = encodeURIComponent(uri)
  if (wallet.universal) return `${wallet.universal.replace(/\/$/, '')}/wc?uri=${encoded}`
  if (wallet.native) return `${wallet.native.replace(/\/$/, '')}/wc?uri=${encoded}`
  return undefined
}

async function fetchWallets(signal?: AbortSignal): Promise<DirectoryWallet[]> {
  const url = `${EXPLORER}/wallets?projectId=${walletConnectProjectId}&entries=${ENTRIES}&page=1`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Wallet directory unavailable')

  const json = (await res.json()) as { listings?: Record<string, ExplorerListing> }
  return Object.values(json.listings ?? {})
    .filter((entry): entry is ExplorerListing & { id: string; name: string; image_id: string } =>
      Boolean(entry.id && entry.name && entry.image_id),
    )
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      imageUrl: `${EXPLORER}/logo/sm/${entry.image_id}?projectId=${walletConnectProjectId}`,
      native: entry.mobile?.native ?? '',
      universal: entry.mobile?.universal ?? '',
    }))
    // A wallet we cannot hand the request to is only noise in a list of things
    // to tap.
    .filter((wallet) => wallet.native || wallet.universal)
}

export function useWalletDirectory(enabled: boolean) {
  return useQuery({
    queryKey: ['walletDirectory'],
    queryFn: ({ signal }) => fetchWallets(signal),
    enabled: enabled && Boolean(walletConnectProjectId),
    // The registry changes on the order of weeks, and the window is reopened
    // far more often than that.
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })
}
