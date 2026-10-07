# Feed data boundary

`index.ts` selects mock/live through `config.USE_MOCKS`; components use the
`DataClient` interface defined in `types.ts`. `mock.ts` implements the Feed
snapshot and event subscription. `reference-world.json` contains the approved
sample data. `live.ts` intentionally fails closed until backend integration.
Do not add service-role credentials to this frontend.
