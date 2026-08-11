#!/usr/bin/env node
// SHIFTED — one-off DB setup over a direct Postgres connection (Session pooler).
// Applies the grant migration and verifies the API roles can reach the schema.
// Reads SUPABASE_DB_* from .env.local. Safe to re-run.
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("connected as:", (await client.query("select current_user")).rows[0].current_user);

const grants = readFileSync(join(root, "supabase/migrations/0004_grants.sql"), "utf8");
await client.query(grants);
console.log("✓ grants applied");

const tables = ["profiles", "employer_profiles", "candidate_profiles", "jobs", "applications", "staff", "saved_jobs"];
const q = await client.query(
  `select unnest($1::text[]) as t`,
  [tables],
);
for (const { t } of q.rows) {
  const r = await client.query(
    `select has_table_privilege('service_role', 'public.'||$1, 'SELECT') as svc,
            has_table_privilege('anon', 'public.'||$1, 'SELECT') as anon`,
    [t],
  );
  console.log(`  ${t}: service_role=${r.rows[0].svc} anon=${r.rows[0].anon}`);
}

await client.end();
console.log("DONE");
