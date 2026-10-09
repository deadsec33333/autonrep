// Admin actions. Callable only from inside the database via private.call_fn (vault admin token).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sql, setting, setSetting, secret, putSecret } from "../_shared/db.ts";
import { json, fail, isAdmin, cors } from "../_shared/http.ts";
import { connection, padKeypair, send, Keypair, PublicKey, bs58, sol, LAMPORTS_PER_SOL } from "../_shared/chain.ts";
import { curveParams, type CurveSettings } from "../_shared/curve.ts";

// Heavy libraries load at run time (keeps deploys fast).
const meteora = () => import("npm:@meteora-ag/dynamic-bonding-curve-sdk@1.5.9");
const NATIVE_MINT = "So11111111111111111111111111111111111111112";

async function log(action: string, result: unknown) {
  await sql`insert into private.admin_log (action, result) values (${action}, ${sql.json(result as any)})`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!(await isAdmin(req))) return fail("FORBIDDEN", "admin only", 403);
  const { action, ...args } = await req.json().catch(() => ({}));
  try {
    let result: unknown;
    switch (action) {
      case "setup-pad": {
        let s = await secret("pad_secret");
        if (!s) { const kp = Keypair.generate(); s = bs58.encode(kp.secretKey); await putSecret("pad_secret", s, "pad wallet: pays for launches, claims fees, sends drops"); }
        const pub = Keypair.fromSecretKey(bs58.decode(s)).publicKey.toBase58();
        await sql`insert into public.system_wallets (label, address, kind) values ('Pad wallet', ${pub}, 'wallet')
                  on conflict (label) do update set address = excluded.address`;
        result = { pad: pub };
        break;
      }
      case "status": {
        const conn = await connection(); const pad = await padKeypair();
        result = { pad: pad.publicKey.toBase58(), pad_sol: sol(await conn.getBalance(pad.publicKey)), cluster: await setting("cluster"), dbc_config: await setting("dbc_config"), slot: await conn.getSlot() };
        break;
      }
      case "airdrop": {
        if ((await setting<string>("cluster")) !== "devnet") return fail("NOT_DEVNET", "airdrops only exist on devnet");
        const conn = await connection(); const pad = await padKeypair();
        const sig = await conn.requestAirdrop(pad.publicKey, Math.min(Number(args.sol ?? 1), 2) * LAMPORTS_PER_SOL);
        await conn.confirmTransaction(sig, "confirmed");
        result = { sig, pad_sol: sol(await conn.getBalance(pad.publicKey)) };
        break;
      }
      case "create-config": {
        const existing = await setting<string | null>("dbc_config");
        if (existing && !args.force) { result = { dbc_config: existing, note: "already exists" }; break; }
        const conn = await connection(); const pad = await padKeypair();
        const m = await meteora();
        const { DynamicBondingCurveClient } = m;
        const client = DynamicBondingCurveClient.create(conn, "confirmed");
        const cfgKp = Keypair.generate();
        const params = curveParams(m, await setting<CurveSettings>("curve"));
        const tx = await client.partner.createConfig({
          config: cfgKp.publicKey, feeClaimer: pad.publicKey, leftoverReceiver: pad.publicKey,
          quoteMint: new PublicKey(NATIVE_MINT), payer: pad.publicKey, ...params,
        } as any);
        const sig = await send(tx, [pad, cfgKp]);
        await setSetting("dbc_config", cfgKp.publicKey.toBase58());
        await sql`insert into public.system_wallets (label, address, kind) values ('Coin curve config', ${cfgKp.publicKey.toBase58()}, 'config')
                  on conflict (label) do update set address = excluded.address`;
        result = { dbc_config: cfgKp.publicKey.toBase58(), sig };
        break;
      }
      default:
        return fail("UNKNOWN_ACTION", String(action));
    }
    await log(action, result);
    return json(result);
  } catch (e) {
    const err = { error: String((e as Error)?.message ?? e), logs: (e as any)?.logs?.slice?.(-15) };
    await log(action, err).catch(() => {});
    return json(err, 500);
  }
});
