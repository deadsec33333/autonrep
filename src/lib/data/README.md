# Data boundary planned for stage 3

`index.ts` will select a single `DataClient` using `config.USE_MOCKS`.
`mock.ts` will own the seeded browser world and mock owner actions.
`live.ts` will own read-only Supabase queries/realtime, HTTP owner requests,
login nonce/verification, token expiry and 401 handling.
Wallet signatures belong in a separate wallet provider and are limited to
login messages and SOL deposits. Neither adapter is implemented in this
component-review package. No backend or real wallet is contacted.
