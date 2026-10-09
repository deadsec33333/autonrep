// Direct Postgres access for server code (the private schema is never exposed over the public API).
import postgres from "npm:postgres@3.4.5";

export const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 15 });

export async function setting<T>(key: string): Promise<T> {
  const r = await sql`select value from private.settings where key = ${key}`;
  return r[0]?.value as T;
}
export async function setSetting(key: string, value: unknown) {
  await sql`insert into private.settings (key, value) values (${key}, ${sql.json(value as any)})
            on conflict (key) do update set value = excluded.value, updated_at = now()`;
}
export async function secret(name: string): Promise<string | null> {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name}`;
  return r[0]?.decrypted_secret ?? null;
}
export async function putSecret(name: string, value: string, description = "") {
  const r = await sql`select id from vault.secrets where name = ${name}`;
  if (r.length) await sql`select vault.update_secret(${r[0].id}::uuid, ${value})`;
  else await sql`select vault.create_secret(${value}, ${name}, ${description})`;
}
