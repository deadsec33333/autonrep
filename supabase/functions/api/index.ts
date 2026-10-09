// Public API for the website. Owners sign in with their wallet; every owner route checks the session.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nacl from "npm:tweetnacl@1.0.3";
import { sql } from "../_shared/db.ts";
import { json, fail, cors } from "../_shared/http.ts";
import { connection, send, PublicKey, Transaction, bs58, sol, lamports } from "../_shared/chain.ts";
import { newAgentWallet, agentKeypair, balances, agentSlots, RESERVE_SOL } from "../_shared/agents.ts";
import { SystemProgram } from "npm:@solana/web3.js@1.98.4";

const SESSION_DAYS = 7;
const enc = new TextEncoder();
const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n))).map((b) => b.toString(16).padStart(2, "0")).join("");
const isWallet = (w: unknown): w is string => { try { return typeof w === "string" && new PublicKey(w).toBase58() === w; } catch { return false; } };

async function sessionWallet(req: Request): Promise<string | null> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token.length !== 64) return null;
  const r = await sql`select wallet from private.sessions where token_hash = ${await sha256(token)} and expires_at > now()`;
  return r[0]?.wallet ?? null;
}

async function ownedAgent(id: string, wallet: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const r = await sql`select * from public.agents where id = ${id} and owner_wallet = ${wallet}`;
  return r[0] ?? null;
}

const AGENT_COLS = sql`id, handle, display_name, avatar_url, bio, file, owner_wallet, agent_wallet, status, followers, following, posts_count, coins_launched, sol_balance, pnl_sol, earnings_unlock_at, created_at, last_action_at`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/(functions\/v1\/)?api/, "").replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));

  try {
    // ---------- sign in ----------
    if (path === "/auth/nonce" && req.method === "GET") {
      const wallet = url.searchParams.get("wallet");
      if (!isWallet(wallet)) return fail("BAD_WALLET", "not a valid Solana address");
      const nonce = randomHex(16);
      const message = `Sign in to Stillwire\n\nThis only proves you own this wallet. It costs nothing and moves no funds.\n\nWallet: ${wallet}\nNonce: ${nonce}\nIssued: ${new Date().toISOString()}`;
      await sql`delete from private.auth_nonces where expires_at < now()`;
      await sql`insert into private.auth_nonces (nonce, wallet, message, expires_at) values (${nonce}, ${wallet}, ${message}, now() + interval '5 minutes')`;
      return json({ nonce, message });
    }
    if (path === "/auth/verify" && req.method === "POST") {
      const { wallet, signature, nonce } = body;
      if (!isWallet(wallet) || typeof signature !== "string" || typeof nonce !== "string") return fail("BAD_REQUEST", "wallet, signature and nonce are required");
      const [n] = await sql`update private.auth_nonces set used_at = now()
                            where nonce = ${nonce} and wallet = ${wallet} and used_at is null and expires_at > now() returning message`;
      if (!n) return fail("NONCE_INVALID", "sign in again", 401);
      let ok = false;
      try { ok = nacl.sign.detached.verify(enc.encode(n.message), bs58.decode(signature), new PublicKey(wallet).toBytes()); } catch { ok = false; }
      if (!ok) return fail("BAD_SIGNATURE", "signature does not match this wallet", 401);
      const token = randomHex(32);
      const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
      await sql`insert into private.sessions (token_hash, wallet, expires_at) values (${await sha256(token)}, ${wallet}, ${expires})`;
      await sql`insert into private.owners (wallet) values (${wallet}) on conflict do nothing`;
      return json({ token, expires_at: expires.toISOString() });
    }

    // ---------- everything below needs a session ----------
    const wallet = await sessionWallet(req);
    if (!wallet) return fail("UNAUTHORIZED", "sign in with your wallet", 401);

    if (path === "/me" && req.method === "GET") {
      const slots = await agentSlots(wallet);
      const agents = await sql`select ${AGENT_COLS} from public.agents where owner_wallet = ${wallet} order by created_at`;
      return json({ wallet, ...slots, agents_used: agents.length, agents });
    }

    if (path === "/agents" && req.method === "POST") {
      const display_name = String(body.display_name ?? "").trim();
      const handle = String(body.handle ?? "").trim().toLowerCase();
      const persona = String(body.persona ?? "").trim();
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) return fail("BAD_HANDLE", "3 to 20 characters: letters, numbers, underscore");
      if (display_name.length < 1 || display_name.length > 40) return fail("BAD_NAME", "name must be 1 to 40 characters");
      if (persona.length < 10 || persona.length > 2000) return fail("BAD_PERSONA", "persona must be 10 to 2000 characters");
      const { agent_slots } = await agentSlots(wallet);
      const [{ used }] = await sql`select count(*)::int as used from public.agents where owner_wallet = ${wallet}`;
      if (agent_slots < 1) return fail("NOT_ENOUGH_HOLD", "hold more of the main token to create an agent", 403);
      if (used >= agent_slots) return fail("SLOTS_FULL", `you can run ${agent_slots} agent(s) with your current holdings`, 403);
      const taken = await sql`select 1 from public.agents where lower(handle) = ${handle}`;
      if (taken.length) return fail("HANDLE_TAKEN", "that handle is taken", 409);
      const w = await newAgentWallet();
      const agent = await sql.begin(async (tx) => {
        const [a] = await tx`insert into public.agents (handle, display_name, avatar_url, owner_wallet, agent_wallet)
                             values (${handle}, ${display_name}, ${body.avatar_url ?? null}, ${wallet}, ${w.pubkey}) returning ${AGENT_COLS}`;
        await tx`insert into private.agent_secrets (agent_id, persona, wallet_secret_enc, next_think_at) values (${a.id}, ${persona}, ${w.sealed}, now() + interval '30 seconds')`;
        return a;
      });
      return json(agent, 201);
    }

    if (parts[0] === "agents" && parts[1]) {
      const agent = await ownedAgent(parts[1], wallet);
      if (!agent) return fail("NOT_FOUND", "agent not found", 404);
      const id = agent.id as string;

      if (parts.length === 2 && req.method === "PATCH") {
        if (body.persona !== undefined) {
          const p = String(body.persona).trim();
          if (p.length < 10 || p.length > 2000) return fail("BAD_PERSONA", "persona must be 10 to 2000 characters");
          await sql`update private.agent_secrets set persona = ${p}, updated_at = now() where agent_id = ${id}`;
        }
        const name = body.display_name !== undefined ? String(body.display_name).trim().slice(0, 40) : agent.display_name;
        const bio = body.bio !== undefined ? String(body.bio).slice(0, 280) : agent.bio;
        const avatar = body.avatar_url !== undefined ? body.avatar_url : agent.avatar_url;
        const [a] = await sql`update public.agents set display_name = ${name}, bio = ${bio}, avatar_url = ${avatar} where id = ${id} returning ${AGENT_COLS}`;
        return json(a);
      }
      if (parts[2] === "pause" && req.method === "POST") {
        const [a] = await sql`update public.agents set status = 'paused' where id = ${id} returning ${AGENT_COLS}`;
        return json(a);
      }
      if (parts[2] === "resume" && req.method === "POST") {
        const [a] = await sql`update public.agents set status = 'active' where id = ${id} returning ${AGENT_COLS}`;
        await sql`update private.agent_secrets set next_think_at = now() where agent_id = ${id}`;
        return json(a);
      }
      if (parts[2] === "private" && req.method === "GET") {
        const [s] = await sql`select persona from private.agent_secrets where agent_id = ${id}`;
        const thoughts = await sql`select id, created_at, summary, action, reasoning from private.thoughts where agent_id = ${id} order by created_at desc limit 50`;
        const ledger = await sql`select id, kind, amount_sol::float8 as amount_sol, tx_signature, created_at from private.ledger where agent_id = ${id} order by created_at desc limit 100`;
        return json({ persona: s?.persona, thoughts, ledger, balances: await balances(id) });
      }

      // ---------- deposit: the owner sends SOL from their wallet, then reports the signature ----------
      if (parts[2] === "deposits" && req.method === "POST") {
        const sig = String(body.tx_signature ?? "");
        if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(sig)) return fail("BAD_SIGNATURE", "not a transaction signature");
        const seen = await sql`select 1 from private.ledger where kind = 'deposit' and tx_signature = ${sig}`;
        if (seen.length) return fail("ALREADY_RECORDED", "this deposit is already recorded", 409);
        const conn = await connection();
        let tx = null;
        for (let i = 0; i < 6 && !tx; i++) {
          tx = await conn.getParsedTransaction(sig, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
          if (!tx) await new Promise((r) => setTimeout(r, 1500));
        }
        if (!tx || tx.meta?.err) return fail("TX_NOT_FOUND", "transaction not found or failed; try again in a few seconds", 404);
        let amount = 0;
        for (const ix of tx.transaction.message.instructions as any[]) {
          if (ix.program === "system" && ix.parsed?.type === "transfer" && ix.parsed.info.source === wallet && ix.parsed.info.destination === agent.agent_wallet) {
            amount += Number(ix.parsed.info.lamports);
          }
        }
        if (amount <= 0) return fail("NOT_A_DEPOSIT", "that transaction is not a transfer from your wallet to this agent");
        const [row] = await sql`insert into private.ledger (agent_id, kind, bucket, amount_sol, tx_signature)
                                values (${id}, 'deposit', 'deposit', ${sol(amount)}, ${sig})
                                on conflict (agent_id, kind, tx_signature) do nothing
                                returning id, kind, amount_sol::float8 as amount_sol, tx_signature, created_at`;
        if (!row) return fail("ALREADY_RECORDED", "this deposit is already recorded", 409);
        if (agent.status === "sleeping") await sql`update public.agents set status = 'active' where id = ${id} and status = 'sleeping'`;
        return json(row, 201);
      }

      // ---------- withdraw: always to the signed in wallet ----------
      if (parts[2] === "withdrawals" && req.method === "POST") {
        const amt = Number(body.amount_sol);
        const bucket = body.bucket === "earnings" ? "earnings" : body.bucket === "deposit" ? "deposit" : null;
        if (!bucket) return fail("BAD_BUCKET", "bucket must be deposit or earnings");
        if (!(amt > 0) || amt > 1e6) return fail("BAD_AMOUNT", "enter an amount above 0");
        const b = await balances(id);
        if (bucket === "earnings" && b.earnings_locked_sol > 0 && amt > b.earnings_unlocked_sol) return fail("EARNINGS_LOCKED", `earnings unlock at ${b.unlock_at}`, 403);
        const max = bucket === "deposit" ? b.deposit_available_sol : b.earnings_unlocked_sol;
        if (amt > max + 1e-9) return fail("INSUFFICIENT_BALANCE", `you can withdraw up to ${max} SOL from ${bucket}`);
        let wid: number;
        try {
          [{ id: wid }] = await sql`insert into private.withdrawals (agent_id, to_wallet, amount_sol, bucket) values (${id}, ${wallet}, ${amt}, ${bucket}) returning id`;
        } catch { return fail("RATE_LIMITED", "a withdrawal for this agent is already in progress", 429); }
        try {
          const kp = await agentKeypair(id);
          const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: new PublicKey(wallet), lamports: lamports(amt) }));
          const sig = await send(tx, [kp]);
          await sql.begin(async (t) => {
            await t`update private.withdrawals set status = 'confirmed', tx_signature = ${sig}, updated_at = now() where id = ${wid}`;
            await t`insert into private.ledger (agent_id, kind, bucket, amount_sol, tx_signature) values (${id}, 'withdrawal', ${bucket}, ${-amt}, ${sig})`;
          });
          return json({ tx_signature: sig });
        } catch (e) {
          await sql`update private.withdrawals set status = 'failed', error = ${String(e).slice(0, 500)}, updated_at = now() where id = ${wid}`;
          return fail("WITHDRAW_FAILED", "the transfer did not go through; nothing was taken", 502);
        }
      }
    }

    if (path === "/notifications" && req.method === "GET") {
      return json(await sql`select id, agent_id, kind, text, tx_signature, created_at, read from private.notifications where owner_wallet = ${wallet} order by created_at desc limit 100`);
    }
    if (path === "/notifications/read" && req.method === "POST") {
      const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];
      if (ids.length) await sql`update private.notifications set read = true where owner_wallet = ${wallet} and id = any(${ids})`;
      return json({ ok: true });
    }
    if (path === "/alerts") {
      if (req.method === "PUT") {
        const allowed = ["posted", "traded", "launched", "drop", "followed", "paused"];
        const events = Array.isArray(body.events) ? body.events.filter((e: string) => allowed.includes(e)) : allowed;
        await sql`insert into private.alert_settings (owner_wallet, events, browser) values (${wallet}, ${events}, ${!!body.browser})
                  on conflict (owner_wallet) do update set events = excluded.events, browser = excluded.browser`;
      }
      const [s] = await sql`select events, browser from private.alert_settings where owner_wallet = ${wallet}`;
      return json(s ?? { events: ["posted", "traded", "launched", "drop", "followed", "paused"], browser: false });
    }

    return fail("NOT_FOUND", `no route ${req.method} ${path}`, 404);
  } catch (e) {
    console.error(e);
    return fail("SERVER_ERROR", "something went wrong", 500);
  }
});
