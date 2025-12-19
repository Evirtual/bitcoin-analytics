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
}: {
  assetKey: AssetKey
  isConnected: boolean
  address: string | undefined
  chain: Chain | undefined
  onOpenConnect: () => void
  onOpenAccount: () => void
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
        {!isConnected ? (
          <button className="btn btnPrimary" onClick={onOpenConnect}>
            Connect
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
