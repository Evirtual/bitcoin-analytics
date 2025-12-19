import type { Chain } from 'viem'
import type { AssetKey } from '../../assets/catalog'
import { ASSETS } from '../../assets/catalog'
import { AssetIcon } from '../AssetIcon'

export function Header({
  assetKey,
  isConnected,
  address,
  chain,
  onOpenConnect,
  onOpenAccount,
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
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  connectDisabled: boolean
}) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brandRow">
          <AssetIcon assetKey={assetKey} size={46} className="logoMark" />
          <div>
            <div className="title">
              <span className="titleAccent">{ASSETS[assetKey].label}</span> Analytics
            </div>
            <div className="subtitle">Market stats + multichain wallet balances</div>
          </div>
        </div>
      </div>

      <div className="walletBar">
        <button
          className="pill pillBtn"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          aria-pressed={theme === 'light'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        {!isConnected ? (
          <button className="btn btnPrimary" onClick={onOpenConnect} disabled={connectDisabled}>
            {connectDisabled ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <button className="pill pillBtn" onClick={onOpenAccount}>
            {address?.slice(0, 6)}…{address?.slice(-4)}
            {chain?.name ? ` • ${chain.name}` : ''}
          </button>
        )}
      </div>
    </header>
  )
}
