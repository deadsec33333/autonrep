import {
  Connection, Keypair, PublicKey, Transaction, ComputeBudgetProgram, LAMPORTS_PER_SOL,
} from "npm:@solana/web3.js@1.98.4";
import bs58 from "npm:bs58@6.0.0";
import { secret, setting } from "./db.ts";

export { Keypair, PublicKey, Transaction, LAMPORTS_PER_SOL, bs58 };

let _conn: Connection | null = null;
export async function connection() {
  if (!_conn) _conn = new Connection(await setting<string>("rpc_url"), "confirmed");
  return _conn;
}

export async function padKeypair(): Promise<Keypair> {
  const s = await secret("pad_secret");
  if (!s) throw new Error("pad wallet not set up");
  return Keypair.fromSecretKey(bs58.decode(s));
}

/** Sign with every signer, send, and wait for confirmation. Returns the signature. */
export async function send(tx: Transaction, signers: Keypair[], opts: { priorityMicroLamports?: number } = {}) {
  const conn = await connection();
  if (opts.priorityMicroLamports) tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: opts.priorityMicroLamports }));
  tx.feePayer = tx.feePayer ?? signers[0].publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.signatures = [];
  tx.sign(...signers);
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  const res = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new Error(`transaction ${sig} failed: ${JSON.stringify(res.value.err)}`);
  return sig;
}

export const sol = (lamports: number | bigint) => Number(lamports) / LAMPORTS_PER_SOL;
export const lamports = (s: number) => Math.round(s * LAMPORTS_PER_SOL);
