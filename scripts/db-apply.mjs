#!/usr/bin/env node
// Apply a .sql file to the database over a direct Postgres connection.
// Usage: node scripts/db-apply.mjs supabase/migrations/0005_reputation.sql
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/db-apply.mjs <path-to.sql>");
  process.exit(1);
}
const sql = readFileSync(resolve(file), "utf8");

const client = new pg.Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log(`✓ applied ${file}`);
} catch (e) {
  await client.query("rollback");
  console.error(`✗ failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
