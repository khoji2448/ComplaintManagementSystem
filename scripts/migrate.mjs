// Simple, dependency-light migration runner.
//
//   npm run migrate          -> apply all pending migrations
//   npm run migrate:status   -> list applied / pending migrations
//
// Migrations live in /migrations as `NNNN_name.sql` and run in filename order.
// Each is applied once, inside a transaction, and recorded in schema_migrations.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Add it to your .env file.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}

async function appliedVersions(client) {
  const res = await client.query("SELECT version FROM schema_migrations");
  return new Set(res.rows.map((r) => r.version));
}

async function status() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const applied = await appliedVersions(client);
    console.log("Migrations:");
    for (const file of migrationFiles()) {
      console.log(`  ${applied.has(file) ? "✅ applied" : "⏳ pending"}  ${file}`);
    }
  } finally {
    client.release();
  }
}

async function migrate() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const applied = await appliedVersions(client);
    const pending = migrationFiles().filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log("✅ Database is up to date. No pending migrations.");
      return;
    }

    for (const file of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`▶ Applying ${file} ... `);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log("done");
      } catch (err) {
        await client.query("ROLLBACK");
        console.log("FAILED");
        throw err;
      }
    }
    console.log(`✅ Applied ${pending.length} migration(s).`);
  } finally {
    client.release();
  }
}

const cmd = process.argv[2] === "status" ? status : migrate;
cmd()
  .then(() => pool.end())
  .catch((err) => {
    console.error("❌ Migration error:", err.message);
    pool.end().finally(() => process.exit(1));
  });
