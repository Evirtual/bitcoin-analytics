## Bitcoin Analytics

React + TypeScript + Vite dashboard for:

- BTC price + simple 7d chart
- Wallet connection (Injected + optional WalletConnect)
- Multichain wrapped BTC balances: Ethereum (WBTC), Base (WBTC), BSC (BTCB default)
- Optional “Support the developer” modal with donation addresses + QR codes

## Production checklist

- Run quality gates: `npm run lint` and `npm run build`
- Verify market data works (Coinbase + Kraken fallback) and you’re not hitting rate limits
- Verify charts render for all ranges (1D/1W/1M) and the UI still works when disconnected
- Wallet flow:
  - Injected connector works (MetaMask/Brave)
  - (Optional) WalletConnect works if configured
- Confirm your deployment base path is correct (see `VITE_BASE` below)
- Smoke test the built app locally: `npm run preview`

## Run

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`

## WalletConnect (optional)

Copy `.env.example` to `.env.local` (recommended) and set:

- `VITE_WALLETCONNECT_PROJECT_ID`

## Support developer modal

The “Support the developer” modal displays donation addresses and a QR code for each.

Implementation notes:

- QR codes are rendered with `qrcode.react`.
- Asset icons come from `cryptocurrency-icons`.

## Third‑party licenses (quick note)

- `cryptocurrency-icons` is CC0-1.0
- `qrcode.react` is ISC

## Deploy (free/public): GitHub Pages

This repo includes a GitHub Actions workflow that builds and deploys the `dist/` output to GitHub Pages on every push to `main`.

### 1) Push to GitHub

- Ensure your default branch is `main`
- Push your latest commits

### 2) Enable Pages (one-time)

In GitHub:

- Settings → Pages
- Under **Build and deployment**, select **GitHub Actions**

### 3) (Optional) Configure WalletConnect project id

If you want WalletConnect enabled on the deployed site:

- Settings → Secrets and variables → Actions → **Variables**
- Add variable `VITE_WALLETCONNECT_PROJECT_ID`

### 4) Confirm the base path

GitHub Pages serves your site under:

- `https://<owner>.github.io/<repo>/`

This project supports that via `VITE_BASE`. The workflow sets:

- `VITE_BASE=/<repo>/`

If you ever deploy somewhere else (root domain), use:

- `VITE_BASE=/`

### Local Pages-like build (optional)

If your repo is named `bitcoin-analytics`, you can test locally:

- PowerShell:
  - `$env:VITE_BASE='/bitcoin-analytics/'; npm run build`
- bash:
  - `VITE_BASE=/bitcoin-analytics/ npm run build`

---

If you want, we can also add a custom domain later (still free) or deploy to Cloudflare Pages (also free) for better SPA routing defaults.
