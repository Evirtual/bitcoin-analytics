import { ArrowLeftRight, Heart, Moon, Sun } from 'lucide-react'
import type { Chain } from 'viem'
import type { AssetKey } from '../../assets/catalog'
import { ASSETS } from '../../assets/catalog'
import { AssetIcon } from '../AssetIcon'
import { MarketDashboardMeta } from './MarketDashboardMeta'

function chainIcon(chain: Chain | undefined): AssetKey | undefined {
  const id = chain?.id
  if (id === 1) return 'ETH'
  if (id === 56) return 'BNB'
  return undefined
}

export function Header({
  assetKey,
  isConnected,
  address,
  chain,
  onOpenConnect,
  onOpenAccount,
  onOpenSwap,
  onOpenSupport,
  theme,
  onToggleTheme,
  connectDisabled,
}: {
  assetKey: AssetKey
  isConnected: boolean
  address: string | undefined
  chain: Chain | undefined
  onOpenConnect: () => void
  onOpenAccount: () => void
  onOpenSwap: () => void
  onOpenSupport: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  connectDisabled: boolean
}) {
  const addrIcon = chainIcon(chain)

  return (
    <header className="header">
      <div className="brand">
        <div className="brandRow">
          <AssetIcon assetKey={assetKey} size={46} className="logoMark" />
          <div>
            <div className="title">
              <span className="titleAccent">{ASSETS[assetKey].label}</span>{' '}
              <span className="titleTail">
                Analytics
                <MarketDashboardMeta />
              </span>
            </div>
            <div className="subtitle">Market stats + multichain wallet balances</div>
          </div>
        </div>
      </div>

      <div className="walletBar">
        {isConnected ? (
          <button
            className="pill pillBtn headerSwapBtn"
            type="button"
            onClick={onOpenSwap}
            aria-label="Swap"
            title="Swap"
          >
            <span className="pillIcon pillIconSwap" aria-hidden="true">
              <ArrowLeftRight size={15} strokeWidth={2} />
            </span>
            <span className="pillLabel">Swap</span>
          </button>
        ) : null}

        <button
          className="pill pillBtn headerSupportBtn"
          type="button"
          onClick={onOpenSupport}
          aria-label="Support the developer"
          title="Support the developer"
        >
          <span className="pillIcon pillIconHeart" aria-hidden="true">
            <Heart size={15} strokeWidth={2} />
          </span>
          <span className="pillLabel">Support</span>
        </button>

        {!isConnected ? (
          <button className="btn btnPrimary headerConnectBtn" onClick={onOpenConnect} disabled={connectDisabled}>
            {connectDisabled ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <>
            <button className="pill pillBtn walletAddressPill" onClick={onOpenAccount}>
              <span className="pillIcon pillIconWallet" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 8.5C4 7.12 5.12 6 6.5 6H18c1.1 0 2 .9 2 2v2.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 9v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7H16a3 3 0 0 0 0 6h6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 14.5h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {addrIcon ? (
                <span className="walletChainIcon">
                  <AssetIcon assetKey={addrIcon} size={16} />
                </span>
              ) : null}
              {address?.slice(0, 6)}…{address?.slice(-4)}
              {chain?.name ? <span className="walletChain"> • {chain.name}</span> : null}
            </button>
          </>
        )}

        <button
          className="pill pillBtn headerThemeBtn"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          aria-pressed={theme === 'light'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? (
            <span className="pillIcon pillIconSun" aria-hidden="true">
              <Sun size={15} strokeWidth={2} />
            </span>
          ) : (
            <span className="pillIcon pillIconMoon" aria-hidden="true">
              <Moon size={15} strokeWidth={2} />
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
