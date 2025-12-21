import type React from 'react'
import { useMemo, useState } from 'react'

import type { AssetKey } from '../assets/catalog'

import btcUrl from 'cryptocurrency-icons/svg/color/btc.svg?url'
import ethUrl from 'cryptocurrency-icons/svg/color/eth.svg?url'
import usdtUrl from 'cryptocurrency-icons/svg/color/usdt.svg?url'
import usdcUrl from 'cryptocurrency-icons/svg/color/usdc.svg?url'
import bnbUrl from 'cryptocurrency-icons/svg/color/bnb.svg?url'
import dogeUrl from 'cryptocurrency-icons/svg/color/doge.svg?url'

export function AssetIcon(props: {
  assetKey: AssetKey
  size?: number
  className?: string
  style?: React.CSSProperties
}) {
  const size = props.size ?? 16
  const [failed, setFailed] = useState(false)

  const sizeEm = useMemo(() => `${size / 16}em`, [size])

  const src =
    props.assetKey === 'BTC'
      ? btcUrl
      : props.assetKey === 'ETH'
        ? ethUrl
        : props.assetKey === 'USDT'
          ? usdtUrl
          : props.assetKey === 'USDC'
            ? usdcUrl
            : props.assetKey === 'BNB'
              ? bnbUrl
              : props.assetKey === 'DOGE'
                ? dogeUrl
                : undefined

  // Prefer the CC0 icon set for a familiar look.
  if (src && !failed) {
    return (
      <img
        className={props.className}
        style={{ width: sizeEm, height: sizeEm, display: 'block', ...props.style }}
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
      />
    )
  }

  const bg =
    props.assetKey === 'BTC'
      ? '#F7931A'
      : props.assetKey === 'ETH'
        ? '#627EEA'
        : props.assetKey === 'USDT'
          ? '#26A17B'
          : props.assetKey === 'USDC'
            ? '#2775CA'
            : props.assetKey === 'BNB'
              ? '#F3BA2F'
              : '#C2A633'

  return (
    <svg
      className={props.className}
      style={props.style}
      width={sizeEm}
      height={sizeEm}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="bg" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor={bg} stopOpacity="1" />
          <stop offset="1" stopColor={bg} stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#bg)" />
      <circle cx="16" cy="16" r="14" stroke="var(--stroke)" />

      {props.assetKey === 'BTC' ? (
        // Original BTC-style mark (not the official logo): stylized B with two vertical strokes.
        <g fill="#fff" opacity="0.95">
          <path d="M14.2 8.8h2.4v14.4h-2.4V8.8z" opacity="0.95" />
          <path d="M17.4 8.8h0.9v14.4h-0.9V8.8z" opacity="0.8" />
          <path
            d="M14.6 10.4h4.2c2.1 0 3.6 1.2 3.6 2.9 0 1.1-0.7 2.1-1.8 2.5 1.5 0.4 2.5 1.6 2.5 3.1 0 2.1-1.8 3.5-4.2 3.5h-4.3V10.4zm4.1 5.0c1.1 0 1.8-0.5 1.8-1.4 0-0.9-0.7-1.4-1.8-1.4h-2.0v2.8h2.0zm0.3 6.2c1.4 0 2.2-0.6 2.2-1.7 0-1.1-0.8-1.7-2.2-1.7h-2.3v3.4h2.3z"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </g>
      ) : props.assetKey === 'ETH' ? (
        // Original ETH-style diamond (simplified geometry).
        <g fill="#fff" opacity="0.95">
          <path d="M16 8.4l5.2 7.8L16 14.9 10.8 16.2 16 8.4z" />
          <path d="M16 15.8l5.0 1.3L16 23.6l-5.0-6.5 5.0-1.3z" opacity="0.88" />
        </g>
      ) : props.assetKey === 'USDT' ? (
        // Original USDT-style T glyph.
        <g fill="#fff" opacity="0.95">
          <path d="M10 10.3h12v2.3h-4.8v1.9c2.9 0.2 4.9 1 4.9 2 0 1.2-2.6 2.1-6.1 2.1s-6.1-0.9-6.1-2.1c0-1 2-1.8 4.9-2v-1.9H10v-2.3zm6 6.5c2.4 0 4.3-0.4 4.3-0.8s-1.9-0.8-4.3-0.8-4.3 0.4-4.3 0.8 1.9 0.8 4.3 0.8z" />
        </g>
      ) : (
        // Original USDC-style C ring.
        <g fill="#fff" opacity="0.95">
          <path
            d="M21.4 13.0c-0.7-1.2-2.0-2.0-3.6-2.0-2.3 0-4.2 1.9-4.2 4.2s1.9 4.2 4.2 4.2c1.6 0 2.9-0.8 3.6-2.0l1.8 1.0c-1.1 1.9-3.2 3.1-5.4 3.1-3.4 0-6.3-2.8-6.3-6.3s2.8-6.3 6.3-6.3c2.2 0 4.3 1.2 5.4 3.1l-1.8 1.0z"
          />
          <path d="M10.6 12.4h1.6v7.6h-1.6v-7.6z" opacity="0.8" />
          <path d="M19.8 12.4h1.6v7.6h-1.6v-7.6z" opacity="0.8" />
        </g>
      )}
    </svg>
  )
}
