import type { Address } from 'viem'

export type ChainId = 1 | 8453 | 56
export type AssetKey = 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'BNB' | 'DOGE'

export const CHAINS: Array<{ id: ChainId; name: string }> = [
  { id: 1, name: 'Ethereum' },
  { id: 8453, name: 'Base' },
  { id: 56, name: 'BSC' },
]

export type AssetOnChain =
  | {
      kind: 'native'
      symbol: string
      decimals: number
    }
  | {
      kind: 'erc20'
      symbol: string
      decimals: number
      address: Address
    }

export type AssetDefinition = {
  key: AssetKey
  label: string
  // Accent colors used for theming (buttons/charts) per asset.
  accent: string
  accentSoft: string
  // Coinbase product id is used for price + candles. If not present, we show no chart.
  coinbaseProductId?: string
  // Used for Coinbase spot endpoint (base currency).
  spotSymbol?: string
  // Optional override for Kraken pair codes (some assets don't match `${symbol}USD`).
  krakenPair?: string
  // Pegged to a dollar. Charts that measure movement against another asset have
  // nothing to show for these, and say so by drawing them faintly.
  stable?: boolean
  perChain: Partial<Record<ChainId, AssetOnChain | AssetOnChain[]>>
}

export const ASSETS: Record<AssetKey, AssetDefinition> = {
  BTC: {
    key: 'BTC',
    label: 'Bitcoin',
    accent: '#F7931A',
    accentSoft: 'rgba(247, 147, 26, 0.18)',
    coinbaseProductId: 'BTC-USD',
    spotSymbol: 'BTC',
    krakenPair: 'XBTUSD',
    perChain: {
      // Wrapped BTC variants
      1: {
        kind: 'erc20',
        symbol: 'WBTC',
        decimals: 8,
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      },
      8453: {
        kind: 'erc20',
        symbol: 'WBTC',
        decimals: 8,
        address: '0x0555E30da8f98308EdB960aa94C0Db47230d2B9c',
      },
      56: {
        // BSC typically uses BTCB; treating as wrapped BTC on BSC.
        kind: 'erc20',
        symbol: 'BTCB',
        decimals: 18,
        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      },
    },
  },
  ETH: {
    key: 'ETH',
    label: 'Ethereum',
    accent: '#627EEA',
    accentSoft: 'rgba(98, 126, 234, 0.18)',
    coinbaseProductId: 'ETH-USD',
    spotSymbol: 'ETH',
    perChain: {
      // Count both native ETH and wrapped ETH (WETH) since many wallets hold WETH.
      1: [
        { kind: 'native', symbol: 'ETH', decimals: 18 },
        {
          kind: 'erc20',
          symbol: 'WETH',
          decimals: 18,
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        },
      ],
      8453: [
        { kind: 'native', symbol: 'ETH', decimals: 18 },
        {
          kind: 'erc20',
          symbol: 'WETH',
          decimals: 18,
          address: '0x4200000000000000000000000000000000000006',
        },
      ],
      // BSC uses BNB for native gas; ETH exposure is typically via Binance-Peg ETH (BEP-20).
      56: {
        kind: 'erc20',
        symbol: 'ETH',
        decimals: 18,
        address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
      },
    },
  },
  USDT: {
    key: 'USDT',
    label: 'Tether',
    accent: '#26A17B',
    accentSoft: 'rgba(38, 161, 123, 0.18)',
    stable: true,
    coinbaseProductId: 'USDT-USD',
    spotSymbol: 'USDT',
    perChain: {
      1: {
        kind: 'erc20',
        symbol: 'USDT',
        decimals: 6,
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
      56: {
        kind: 'erc20',
        symbol: 'USDT',
        decimals: 18,
        address: '0x55d398326f99059fF775485246999027B3197955',
      },
      // Base USDT address can vary; omitted by default.
    },
  },
  USDC: {
    key: 'USDC',
    label: 'USD Coin',
    accent: '#2775CA',
    accentSoft: 'rgba(39, 117, 202, 0.18)',
    stable: true,
    coinbaseProductId: 'USDC-USD',
    spotSymbol: 'USDC',
    perChain: {
      1: {
        kind: 'erc20',
        symbol: 'USDC',
        decimals: 6,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      8453: {
        kind: 'erc20',
        symbol: 'USDC',
        decimals: 6,
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      },
      56: {
        kind: 'erc20',
        symbol: 'USDC',
        decimals: 18,
        address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      },
    },
  },
  BNB: {
    key: 'BNB',
    label: 'BNB',
    accent: '#F3BA2F',
    accentSoft: 'rgba(243, 186, 47, 0.18)',
    coinbaseProductId: 'BNB-USD',
    spotSymbol: 'BNB',
    krakenPair: 'BNBUSD',
    perChain: {
      // Count both native BNB and wrapped BNB (WBNB) on BSC.
      56: [
        { kind: 'native', symbol: 'BNB', decimals: 18 },
        {
          kind: 'erc20',
          symbol: 'WBNB',
          decimals: 18,
          address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        },
      ],
    },
  },
  DOGE: {
    key: 'DOGE',
    label: 'Dogecoin',
    accent: '#C2A633',
    accentSoft: 'rgba(194, 166, 51, 0.18)',
    coinbaseProductId: 'DOGE-USD',
    spotSymbol: 'DOGE',
    krakenPair: 'XDGUSD',
    perChain: {
      // Binance-Peg Dogecoin (BEP-20)
      56: {
        kind: 'erc20',
        symbol: 'DOGE',
        decimals: 8,
        address: '0xbA2aE424d960c26247Dd6c32edC70B295c744C43',
      },
    },
  },
}
