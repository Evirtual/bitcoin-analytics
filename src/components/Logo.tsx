import type React from 'react'

export function LogoMark(props: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={props.className}
      style={props.style}
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="g" x1="5" y1="5" x2="29" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <circle cx="17" cy="17" r="15" stroke="url(#g)" strokeWidth="2" />
      <path
        d="M14 10.6h5.2c2 0 3.6 1.2 3.6 3 0 1.2-.8 2.2-2 2.6 1.6.4 2.6 1.6 2.6 3.2 0 2.2-1.9 3.6-4.2 3.6H14V10.6zm5.2 6.2c1.2 0 2-.6 2-1.6s-.8-1.6-2-1.6h-3.5v3.2h3.5zm.4 7.2c1.5 0 2.4-.7 2.4-1.9s-.9-1.9-2.4-1.9H15.7V24h3.9z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  )
}
