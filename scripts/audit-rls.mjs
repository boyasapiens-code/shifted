// One-off: introspect RLS policies to find permissive ones. Not a test.
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const l of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const c = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const { rows } = await c.query(
  `select tablename, policyname, cmd, coalesce(qual,'') as using, coalesce(with_check,'') as chk
   from pg_policies where schemaname='public' order by tablename, cmd`,
);
console.log("Permissive policies (using/check literally 'true'):");
let n = 0;
for (const r of rows) {
  if (r.using.trim() === "true" || r.chk.trim() === "true") {
    n++;
    console.log(`  ${r.tablename}.${r.cmd} [${r.policyname}] using='${r.using}' check='${r.chk}'`);
  }
}
console.log(`\n${rows.length} policies total, ${n} permissive`);
await c.end();
