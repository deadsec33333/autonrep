// Agent wallets and money rules shared by the API, the brain and the fee engine.
import { sql, setting } from "./db.ts";
import { seal, open } from "./crypto.ts";
import { connection, Keypair, PublicKey, sol, lamports } from "./chain.ts";

/** SOL kept in every agent wallet for network fees and token account rent. */
export const RESERVE_SOL = 0.005;

export async function newAgentWallet() {
  const kp = Keypair.generate();
  return { pubkey: kp.publicKey.toBase58(), sealed: await seal(kp.secretKey) };
}

export async function agentKeypair(agentId: string): Promise<Keypair> {
  const r = await sql`select wallet_secret_enc from private.agent_secrets where agent_id = ${agentId}`;
  if (!r.length) throw new Error("agent wallet missing");
  return Keypair.fromSecretKey(await open(new Uint8Array(r[0].wallet_secret_enc)));
}

export type Balances = {
  sol_total: number; deposit_available_sol: number; earnings_unlocked_sol: number;
  earnings_locked_sol: number; unlock_at: string;
};

/**
 * What the owner can take out.
 * Deposits (minus deposit withdrawals) come back first and can be withdrawn at any time.
 * Everything above that is earnings (drops, creator fees, trading profit) and unlocks
 * 72 hours after the agent was made.
 */
export async function balances(agentId: string): Promise<Balances> {
  const [a] = await sql`select agent_wallet, earnings_unlock_at from public.agents where id = ${agentId}`;
  const [l] = await sql`select coalesce(sum(amount_sol) filter (where bucket = 'deposit'), 0)::float8 as net_deposit
                        from private.ledger where agent_id = ${agentId} and kind in ('deposit','withdrawal')`;
  const conn = await connection();
  const total = sol(await conn.getBalance(new PublicKey(a.agent_wallet)));
  const spendable = Math.max(0, total - RESERVE_SOL);
  const deposit = Math.min(spendable, Math.max(0, Number(l.net_deposit)));
  const earnings = Math.max(0, spendable - deposit);
  const unlocked = new Date(a.earnings_unlock_at) <= new Date();
  await sql`update public.agents set sol_balance = ${total} where id = ${agentId}`;
  return {
    sol_total: round(total), deposit_available_sol: round(deposit),
    earnings_unlocked_sol: unlocked ? round(earnings) : 0, earnings_locked_sol: unlocked ? 0 : round(earnings),
    unlock_at: new Date(a.earnings_unlock_at).toISOString(),
  };
}

const round = (n: number) => Math.floor(n * 1e9) / 1e9;

/** How many agents a wallet may run: one per HOLD_PER_AGENT of the main token. Devnet without a token: 3. */
export async function agentSlots(wallet: string): Promise<{ token_balance: number; agent_slots: number }> {
  const mint = await setting<string | null>("main_token_mint");
  const per = Number(await setting<number>("hold_per_agent"));
  if (!mint) return { token_balance: 0, agent_slots: 3 };
  const conn = await connection();
  const accs = await conn.getParsedTokenAccountsByOwner(new PublicKey(wallet), { mint: new PublicKey(mint) });
  const bal = accs.value.reduce((s, a) => s + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
  await sql`insert into private.owners (wallet, token_balance, balance_checked_at) values (${wallet}, ${bal}, now())
            on conflict (wallet) do update set token_balance = excluded.token_balance, balance_checked_at = now()`;
  return { token_balance: bal, agent_slots: Math.floor(bal / per) };
}

export async function notify(ownerWallet: string, agentId: string | null, kind: string, text: string, tx?: string) {
  const [s] = await sql`select events from private.alert_settings where owner_wallet = ${ownerWallet}`;
  if (s && !s.events.includes(kind)) return;
  await sql`insert into private.notifications (owner_wallet, agent_id, kind, text, tx_signature) values (${ownerWallet}, ${agentId}, ${kind}, ${text}, ${tx ?? null})`;
}

export { lamports };
