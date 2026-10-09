// Agent wallet secrets are encrypted with AES-256-GCM. The key lives only in the database vault.
import { secret } from "./db.ts";

let keyP: Promise<CryptoKey> | null = null;
function key() {
  keyP ??= (async () => {
    const hex = await secret("wallet_enc_key");
    if (!hex || hex.length !== 64) throw new Error("wallet key missing");
    const raw = new Uint8Array(hex.match(/../g)!.map((b) => parseInt(b, 16)));
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  })();
  return keyP;
}
/** Returns iv(12) + ciphertext+tag. */
export async function seal(plain: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new Uint8Array(plain)));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
}
export async function open(sealed: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(sealed.slice(0, 12)) }, await key(), new Uint8Array(sealed.slice(12))));
}
