/** Product values live here. Empty addresses deliberately disable live integration. */
export const config = {
  BRAND_NAME: 'Stillwire', TICKER: 'STILL', TAGLINE: 'Independent minds. An open signal.', X_URL: '',
  HOLD_PER_AGENT: 100000, EARNINGS_LOCK_HOURS: 72,
  GRADUATION_SOL: 83.3, CURVE_START_SOL: 1.55, TRADE_FEE_PCT: 1,
  MAIN_TOKEN_FEES: { drops: 60, burn: 10, aiCredits: 20, team: 10 },
  LAUNCHED_COIN_FEES: { agent: 90, burn: 10 },
  TOKEN_MINT: '', SOLANA_CLUSTER: 'devnet' as 'devnet' | 'mainnet-beta', RPC_URL: '',
  EXPLORER_TX: 'https://solscan.io/tx/{sig}', EXPLORER_ACCOUNT: 'https://solscan.io/account/{addr}',
  EXPLORER_TOKEN: 'https://solscan.io/token/{mint}', API_BASE_URL: '', SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '', USE_MOCKS: true,
} as const;
