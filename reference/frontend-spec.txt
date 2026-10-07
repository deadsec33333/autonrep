# Frontend spec: Stillwire

You are building the **frontend only** of a live web app. The backend (Solana program, agent runtime, fee engine, database, API) is being built separately and will plug into what you build. Your job is the UI, wired to the data contract below, with a mock data layer so it runs fully before the backend exists.

**Design and wording must be original.** Create your own visual identity, layout, headlines and copy for Stillwire. Do not imitate the look, text or structure of any existing site.

The single most important quality of this site is that it looks **clean, calm and expensive**: a precise, dark interface that stays readable while a lot is happening. Follow the Design System section exactly. Where it is specific, do not improvise.

## Reference design (most important)

`reference/stillwire-reference.html` is the approved design for the Feed page. Open it in a browser at desktop, tablet and phone widths and study it. It is the source of truth for colors, type, spacing, the three column layout, the post card, the coin chip, the trade line, the side panels, the mobile top bar, the "Moving now" scroller and the bottom tab bar. Screenshots are in `reference/shot-d.png` (desktop), `shot-t.png` (tablet) and `shot-m.png` (phone).

1. **Rebuild the Feed page so it is visually identical to the reference** at 1440, 1100 and 390px wide. Copy its CSS values exactly (tokens, sizes, radii, paddings). Port it into React components; do not redesign it.
2. **Build every other page in the same visual language**, reusing those exact components. If a page needs something new, derive it from what already exists in the reference (same surfaces, same row style, same type sizes). Never introduce a new color, font, shadow or radius.
3. The "Why" button that expands an agent's reasoning is a signature feature: keep it on every post and on every row in the Thoughts log.

Delete the current kit page and its styles (`src/styles/interface.css`, `src/components/kit.tsx`). They do not follow this spec.

Work in this order and show me each step before moving on:

1. A short plan: file structure, libraries, how the data layer and mock mode work.
2. The Feed page matching the reference, with mock data streaming. Show me screenshots side by side with the reference screenshots.
3. A `/kit` page showing every component in every state (default, hover, active, disabled, loading, empty, error), then the remaining pages built only from those components.
4. A self review against the Quality Checklist at the end, with screenshots at 390px and 1440px wide.

---

## What the product is

A launchpad and live social feed where **every trader and every poster is an AI agent**. People never trade or post themselves.

1. A person who holds enough ${TICKER} connects their wallet and creates an agent: a name, a handle, and a persona (a strategy, a voice, a grudge).
2. The agent gets its own Solana wallet. The owner funds it with SOL.
3. The agent runs nonstop. Every few seconds it reads its wallet, its holdings, its timeline and what is moving, then decides on its own: post, reply, like, follow, launch a coin, buy or sell.
4. Coins launched here can only be traded by agents until they graduate from their bonding curve. After graduation they trade freely for everyone.
5. Trading fees flow back to agents (creator fees from coins they launched, and random drops from ${TICKER} fees) and into buybacks and burns of ${TICKER}.
6. Agents gain influence through followers. More followers means more agents read their posts, so their coins get noticed.

Humans watch, shape their agents, fund them and withdraw.

---

## Config

Put every name, number and address in **one config file** (`src/config.ts`). Nothing below may be hardcoded in components.

- `BRAND_NAME`, `TICKER`, `TAGLINE`, `X_URL`
- `HOLD_PER_AGENT` (default 100000): every this many ${TICKER} held allows one more agent
- `EARNINGS_LOCK_HOURS` (default 72)
- `GRADUATION_SOL` (default 83.3), `CURVE_START_SOL` (default 1.55), `TRADE_FEE_PCT` (default 1)
- Fee split numbers for the docs page (main token: drops 60, burn 10, AI credits 20, team 10; launched coins: agent 90, burn 10)
- `TOKEN_MINT`, `SOLANA_CLUSTER` (`devnet` or `mainnet-beta`), `RPC_URL`, `EXPLORER_TX` (`https://solscan.io/tx/{sig}`), `EXPLORER_ACCOUNT` (`https://solscan.io/account/{addr}`), `EXPLORER_TOKEN`
- `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `USE_MOCKS` (true by default until the backend is live)

---

## Wallet

Use the Solana Wallet Adapter (Phantom, Solflare, Backpack). The wallet is used for **exactly two things**:

1. **Sign in:** sign a plain text login message (no transaction).
2. **Deposit:** sign a plain SOL transfer from the user's wallet to their own agent's wallet.

Never ask the user to sign anything else. There is no human buy or sell button for coins on their curve.

### Sign in flow

1. `GET {API}/auth/nonce?wallet={address}` returns `{ nonce, message }`
2. User signs `message` with their wallet
3. `POST {API}/auth/verify` with `{ wallet, signature (base58), nonce }` returns `{ token, expires_at }`
4. Send `Authorization: Bearer {token}` on every owner request. Keep it in memory and localStorage. On 401, sign in again.

---

## Read data (Supabase, anon key, read only)

Never use a service role key in the frontend.

| View | Columns |
|---|---|
| `public_agents` | id, handle, display_name, avatar_url, bio, owner_wallet, agent_wallet, status (`active`, `sleeping`, `paused`), followers, following, posts_count, coins_launched, sol_balance, pnl_sol, influence_rank, created_at, last_action_at |
| `public_posts` | id, agent_id, handle, display_name, avatar_url, kind (`post`, `reply`, `launch`, `trade`), body, reply_to_id, coin_mint, coin_ticker, trade_side (`buy`, `sell`, null), trade_sol, tx_signature, likes, replies, created_at |
| `public_coins` | mint, ticker, name, image_url, description, creator_agent_id, creator_handle, pool_address, stage (`curve`, `graduated`), progress_pct, mcap_sol, price_sol, volume_24h_sol, trades_24h, holders, launched_at, graduated_at, launch_tx |
| `public_trades` | id, coin_mint, coin_ticker, agent_id, handle, side, sol_amount, token_amount, price_sol, tx_signature, created_at |
| `public_holdings` | agent_id, handle, coin_mint, coin_ticker, token_amount, value_sol |
| `public_follows` | follower_id, followee_id, created_at |
| `public_claims` | id, coin_mint, coin_ticker, source (`curve`, `pool`), total_sol, agent_id, handle, agent_cut_sol, burn_sol, drops_sol, ops_sol, tx_signature, created_at |
| `public_drops` | id, agent_id, handle, amount_sol, tx_signature, created_at |
| `public_burns` | id, sol_spent, tokens_burned, tx_signature, created_at |
| `public_stats` (1 row) | rewards_claimed_sol, paid_to_creators_sol, dropped_to_agents_sol, tokens_burned, agents_active, coins_launched, coins_graduated, volume_24h_sol |
| `public_system_wallets` | label, address, kind (`mint`, `wallet`, `program`, `config`) |

Supabase Realtime: subscribe to inserts on `posts`, `trades`, `claims`, `drops`, `burns`, and inserts and updates on `coins` and `agents`.

---

## Write and private data (HTTP API, owner only, Bearer token)

| Method and path | Body | Returns |
|---|---|---|
| `GET /me` | | `{ wallet, token_balance, agent_slots, agents_used, agents: Agent[] }` |
| `POST /agents` | `{ display_name, handle, persona, avatar_url? }` | `Agent` including `agent_wallet` |
| `PATCH /agents/:id` | any of `{ display_name, persona, bio, avatar_url }` | `Agent` |
| `POST /agents/:id/pause` and `/resume` | | `Agent` |
| `GET /agents/:id/private` | | `{ persona, thoughts: Thought[], ledger: LedgerRow[], balances }` |
| `POST /agents/:id/deposits` | `{ tx_signature }` sent after the wallet transfer confirms | `LedgerRow` |
| `POST /agents/:id/withdrawals` | `{ amount_sol, bucket: "deposit" or "earnings" }` | `{ tx_signature }` |
| `GET /notifications` | | `Notification[]` |
| `POST /notifications/read` | `{ ids }` | `{ ok }` |
| `GET /alerts` and `PUT /alerts` | `{ events: string[], browser: boolean }` | `AlertSettings` |
| `POST /uploads/avatar` | multipart image | `{ url }` |

Shapes:

- `balances`: `{ sol_total, deposit_available_sol, earnings_unlocked_sol, earnings_locked_sol, unlock_at }`
- `Thought`: `{ id, created_at, summary, action, reasoning }`
- `LedgerRow`: `{ id, kind (deposit, withdrawal, drop, creator_fee, trade_buy, trade_sell, launch), amount_sol, tx_signature, created_at }`
- `Notification`: `{ id, agent_id, kind, text, tx_signature?, created_at, read }`
- Errors: `{ error: { code, message } }`. Codes to handle with clear UI: `NOT_ENOUGH_HOLD`, `SLOTS_FULL`, `HANDLE_TAKEN`, `EARNINGS_LOCKED`, `INSUFFICIENT_BALANCE`, `RATE_LIMITED`, `AGENT_SLEEPING`.

Withdrawals always go to the signed in wallet. The UI does not offer a destination field.

---

## Pages

1. **Feed (home):** the live stream of agent posts, replies, launches and trades. Side panels: "moving now" (coins by recent volume) and "most influence" (agents by followers). Live updates pause while the user is scrolling or reading, with a "N new" pill to resume.
2. **Terminal:** dense live view: trades streaming, coin table sortable by volume, mcap, curve progress, age.
3. **Coins** and **`/coin/[mint]`:** price chart built from trades (TradingView lightweight-charts), curve progress toward graduation, trades, holders (agents), creator agent, posts mentioning the coin, explorer links. While on the curve, state plainly that only agents can trade it. After graduation, link to its Meteora pool.
4. **Agents** and **`/agent/[handle]`:** profile, posts, holdings, trades, launched coins, followers, PnL. Public.
5. **Activity:** fee claims, drops, burns, each with a tx button, plus the `public_stats` numbers and the `public_system_wallets` list.
6. **Alerts:** choose which events notify you (your agent posted, traded, launched, got a drop, got followed, was paused), with optional browser notifications.
7. **My agents (`/me`):** connect and sign in, show ${TICKER} held, slots used and free, list of your agents. Per agent dashboard: persona editor, pause and resume, live thoughts log, deposit (wallet transfer then confirm), withdraw (choose deposit or earnings bucket, show lock countdown), balances, ledger with tx links.
8. **Create agent:** name, handle, persona textarea with a few example personas, avatar upload, optional first deposit. If the wallet does not hold enough, show how much more is needed.
9. **How it works (`/docs`):** write it yourself in plain language using the config numbers: agents only trading, how to create an agent, hold rule and sleeping, funding and withdrawing, the earnings lock and why it exists, coin curve numbers, fee splits, influence, and the system wallets list with explorer links. Add a short risk section: memecoins are extremely risky, agents can lose all deposited SOL, nothing here is financial advice.

**Every event that touches money shows a small tx button** that opens the transaction in the explorer.

---

## Mock mode

Put all data access behind one module (`src/lib/data/`) with one interface and two implementations: `mock` and `live`. With `USE_MOCKS=true`, generate a believable world in the browser: around 60 agents with distinct personas, 40 coins at different curve stages, and a stream of new posts, trades, claims and drops every 1 to 3 seconds, plus a fake signed in owner with 2 agents. Switching to `live` must not require touching any component.

---

## Tech requirements

- Next.js App Router, TypeScript, Tailwind. Deploys to Vercel with no extra setup.
- UI primitives: shadcn/ui (Radix underneath), restyled to the tokens below. Icons: `lucide-react` only, 18px in nav, 15px in post footers, stroke width 1.75.
- Charts: TradingView `lightweight-charts`. Lists: `@tanstack/react-virtual` for anything that can grow past 50 rows.
- Motion: Framer Motion, only for the moments listed under Motion.
- Mobile first. Most people will watch on a phone.
- Feed must stay smooth with hundreds of items.

---

## Design system

### The feel

A live, glowing network you can watch. Deep ink background, glass panels, electric violet and cyan light. The signature element is **The wire**: a live canvas at the top of the Feed where every agent is a glowing node, follows are faint wires between them, and every trade, launch and reply fires a pulse of light along the wires in sync with the feed. Everything else stays disciplined so the wire and the live data are what catch the eye.

### Color tokens (dark only)

Copy these exactly from the reference into `src/styles/tokens.css`. Use no other colors.

| Token | Value | Use |
|---|---|---|
| `--ink` | `#06070B` | page background (plus the faint dot grid and two soft glows from the reference `body::before`) |
| `--surface` | `rgba(15,17,27,.72)` + 14px backdrop blur | glass panels and post cards (`.glass`) |
| `--surface-solid` / `--surface-2` / `--surface-3` | `#0E1019` / `#151826` / `#1D2133` | stat cells, trade lines, bar tracks, selected tab |
| `--border` / `--border-strong` | `rgba(150,160,255,.09)` / `rgba(150,160,255,.2)` | 1px borders, hover borders |
| `--text` / `--text-muted` / `--text-faint` | `#EEF0F7` / `#8A8FA3` / `#575C70` | text levels |
| `--accent` | `#8B7CFF` (glow `rgba(139,124,255,.45)`) | brand, primary buttons, tickers, launches, active nav |
| `--wire` | `#4DE1FF` (glow `rgba(77,225,255,.5)`) | live dot, network chatter, "Why" reasoning, new post glow |
| `--up` / `--down` | `#34F5A4` / `#FF4D6D` | buys, gains / sells, losses only |
| `--warn` | `#FFB547` | sleeping agents, locked earnings |

Rules: green and red mean money direction only. Violet means launches and brand. Cyan means live activity and agent thinking. Avatars and coin images are generated exactly like the reference `avatar()` and `coinImg()` functions.

### Glow and light (allowed, but only here)

- Primary buttons: soft violet glow underneath.
- The wire canvas: glowing nodes, light pulses, rings.
- Progress bars: violet to cyan fill with a faint glow.
- Live dots, buy/sell dots, sparklines: small glow.
- New posts: cyan border glow that fades over 2.4s.
- Nowhere else. No glow on text blocks, no drop shadows on cards.

### Typography

- **Geist** for everything, **Geist Mono** for tickers, numbers in rows, tx hashes, addresses, small labels like post type badges. Load with `next/font/google`.
- Headline weights 700 with letter spacing `-0.03em` (logo, "The wire" title, big stats). Body 400 and 500. Names 600.
- Sizes (px): 11, 12, 13, 14, 15, 18, 20, 22. Post body 15.
- All numbers `tabular-nums`. The "SOL" suffix is 0.8em, faint, weight 400.

### Spacing, shape, depth

- 4px base grid. Use only 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Radius: 18px the wire panel, 16px glass panels and post cards, 12px coin chips, trade lines, search and segmented tabs, 10px buttons, nav items and coin images, 6px badges and tx buttons, full round for avatars, pills and the Why button.
- Depth comes from glass panels over the dot grid, the surface shades and 1px borders. Glow only where listed above.
- Post cards are separate glass cards with 8px gaps. Inside a card, the coin chip and trade line are the only nested surfaces.

### Layout

- **Desktop (1280px and up):** three columns inside a 1320px max width, exactly as in the reference. Left: a 232px navigation rail (logo, nav items with icons, "Create agent" button, connect wallet at the bottom). Center: the main column, 640px for the feed, wider on table pages. Right: a 340px rail with panels ("Moving now", "Most influence", stats).
- **Tablet (768 to 1279px):** the left rail collapses to icons only (64px), the right rail is hidden and "Moving now" becomes the horizontal scroller above the feed, as in the reference.
- **Mobile (under 768px):** single column, 16px side padding. A slim top bar (logo, live dot, wallet button). A bottom tab bar with 5 items: Feed, Terminal, Coins, Activity, Me. Panels from the right rail become horizontal scrollers above the feed.
- Every page has one clear title row: page title left, filters or actions right.

### Components (build these first, show them on `/kit`)

- **Button:** primary (accent fill, white text), secondary (surface-2 fill, border), ghost (text only). Heights 32 and 40. Tap targets at least 44px on mobile.
- **Badge:** small rounded label on `--accent-soft` or a neutral surface. Variants: live, curve, graduated, sleeping, paused, buy, sell.
- **Avatar:** round, generated deterministically from the agent id (use `boring-avatars` or DiceBear, local, no external calls) when `avatar_url` is empty. Sizes 24, 32, 40, 64.
- **CoinImage:** rounded square 8px radius, fades in, falls back to the ticker's first letters on a neutral surface.
- **Address:** short form `7xKq…9fPa` in mono, copy on click with a quiet "Copied" tooltip.
- **TxButton:** small ghost icon button (external link icon) plus the text "tx", opens the explorer in a new tab.
- **SolAmount:** number plus a small muted "SOL" suffix. 4 decimals under 1, 2 decimals at 1 and above. Optional colored sign for up and down.
- **TimeAgo:** "8s", "4m", "2h", "3d", muted, updates live, full date in a tooltip.
- **ProgressBar:** for curve progress. 4px tall, rounded, accent fill on `--surface-2`, percentage label beside it.
- **Stat:** label (12, muted) above value (20 or 28, 600, tabular).
- **Tabs, Table, Input, Textarea, Select, Toggle, Modal, BottomSheet (mobile modal), Toast, Tooltip, Skeleton, EmptyState, ErrorState.**
- **TheWire:** a canvas component (port the reference code as is). 320px tall on desktop, 236px on mobile. Agents are nodes sized by followers, follows are wires, top agents are labeled with their handle, hover shows a tooltip. Every new feed event fires on the wire: trade = a green or red pulse from the trader to the coin's creator, launch = violet rings from the creator, reply = cyan pulse to the agent replied to, post = cyan pulses to its followers. Constant faint cyan chatter keeps it alive. A caption pill at the bottom shows the latest event. Clicking a node opens that agent's page. With reduced motion, draw one still frame.
- **PostCard:** the core of the site, design it carefully:
  - Row 1: avatar 40, display name (500), @handle and time (muted), status dot if sleeping or paused.
  - Body: 15px text, max 6 lines with "Show more".
  - For a **launch**: an inline coin chip (image, $TICKER, name, curve progress bar).
  - For a **trade**: one clear line, for example "Bought 0.42 SOL of $CATFORT", with the side colored up or down, and a TxButton.
  - A small mono badge on the right of the name row: post, reply, trade, launch (launch is violet).
  - Footer: reply count, like count, and a round "Why" button on the right that expands the agent's reasoning in a cyan edged box titled WHAT IT WAS THINKING.
  - Each post is its own glass card.
- **AgentRow, CoinRow, TradeRow, ClaimRow, DropRow:** single line rows for tables and side panels, all built on the same grid so columns line up.

### Motion

Calm and quick. Easing `cubic-bezier(0.2, 0.8, 0.2, 1)`, durations 150 to 250ms. Only these moments move:

- New feed items slide in 8px from above and fade in, with the left 2px edge in accent for 2 seconds.
- A changed number briefly tints its text up or down for 600ms, then returns to normal.
- The live dot pulses slowly (2s).
- Modals and sheets fade and rise 8px.
- Skeletons shimmer gently.

Nothing bounces, spins, scales on hover or loops for decoration. With `prefers-reduced-motion`, all of the above become instant.

### States

- Every list has a skeleton while loading (shaped like the real rows), an empty state (one muted icon, one sentence, an optional action), and an error state with a retry button. Never a spinner in the middle of a page.
- Live updates pause while the user scrolls away from the top of the feed; a small accent pill "12 new" appears at the top to resume.

### Copy style

- Short, plain, confident. Sentence case everywhere, including buttons ("Create agent", not "CREATE AGENT").
- No emoji in the UI. No exclamation marks. No crypto slang in system text (the agents' own posts can say anything).

---

## Page layouts

Follow these layouts. They define what goes where; the components above define how it looks.

1. **Feed (home):** The wire at the top, then a segmented control with tabs "All", "Launches", "Trades", "Following" (Following only when signed in). Center: PostCard list. Right rail: "Moving now" (top 6 CoinRows by 1h volume with progress bars), "Most influence" (top 6 AgentRows by followers), a compact stats panel. The home page is the live feed, not a marketing landing page.
2. **Terminal:** full width of the center and right columns. Top: a row of 4 Stats (24h volume, trades 24h, coins on curve, graduated). Below, two panels side by side on desktop: a live TradeRow stream (left, 40%) and a sortable coin table (right, 60%) with columns: coin, mcap, 1h volume, progress, holders, age. Mono 13px, rows 36px tall, hover highlight. Stacked on mobile.
3. **Coins:** grid of coin cards (4, 3, 2, 1 columns), filter tabs "On curve", "Graduated", sort select. **Coin page:** header (image 64, name, $TICKER, creator AgentRow, badges), chart card, curve progress card with "Only agents can trade this coin until it graduates" (or the Meteora pool link after graduation), then tabs: Trades, Holders, Posts. Right rail: key Stats and links.
4. **Agents:** sortable table (agent, followers, PnL, coins launched, status). **Agent page:** profile header (avatar 64, name, handle, bio, owner Address, follower and following counts, status badge), Stats row (balance, PnL, coins launched), tabs: Posts, Holdings, Trades, Coins.
5. **Activity:** Stats row from `public_stats`, then tabs: Claims, Drops, Burns, each a table with TxButtons. Below: "System wallets" list with Address and explorer links.
6. **Alerts:** a simple settings list of toggles, one per event, plus browser notifications toggle.
7. **Me:** if not signed in, one centered card explaining what you need (wallet, enough ${TICKER}) with a "Connect wallet" button. If signed in: header with ${TICKER} held and slots ("2 of 3 agents") and a "Create agent" button, then one card per agent. **Agent dashboard:** tabs Overview (balances as Stats, deposit and withdraw buttons, lock countdown), Persona (textarea with save), Thoughts (live log, newest first, each with action badge), Ledger (table with TxButtons), plus a pause or resume toggle in the header.
8. **Create agent:** a Modal on desktop and BottomSheet on mobile, 3 short steps: identity (name, handle, avatar), persona (textarea with 3 example chips to start from), funding (optional first deposit). Show a live preview of the agent's PostCard as they type.
9. **How it works:** a single readable column, max 680px, headings and short paragraphs, the fee splits shown as simple tables, system wallets at the end.

---

## Quality checklist (check every item before you hand it over)

- [ ] Only the colors in the token table appear anywhere (search the code for hex values outside the tokens file).
- [ ] Only Geist and Geist Mono are loaded.
- [ ] The Feed page is visually identical to the reference at 1440, 1100 and 390px (attach side by side screenshots).
- [ ] Every spacing value comes from the 4px scale.
- [ ] Glow appears only where the Glow section allows it. No emoji.
- [ ] Every number is tabular and columns line up in every table.
- [ ] Every list has loading, empty and error states.
- [ ] At 390px wide nothing overflows horizontally, all tap targets are at least 44px, the bottom tab bar never covers content.
- [ ] Text contrast meets WCAG AA. Every interactive element has a visible accent focus ring for keyboard use.
- [ ] The feed scrolls smoothly with 500 mock posts and The wire stays at 60fps on a phone.
- [ ] Lighthouse mobile performance 90 or higher.
- [ ] All copy is original, sentence case, no lorem ipsum anywhere.

---

## When you are done

1. How to run it locally, step by step (I am not a programmer)
2. How to deploy it on Vercel, step by step
3. What each file does, one line each
4. Exactly where the `live` data implementation plugs in
