import { secret } from "./db.ts";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-session",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, OPTIONS",
};
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)), { status, headers: { ...cors, "Content-Type": "application/json" } });
export const fail = (code: string, message: string, status = 400) => json({ error: { code, message } }, status);

/** Admin calls come only from the database (private.call_fn), which attaches the vault admin token. */
export async function isAdmin(req: Request): Promise<boolean> {
  const got = req.headers.get("x-admin-token") ?? "";
  const want = (await secret("admin_token")) ?? "";
  if (!want || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
