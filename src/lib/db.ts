import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined in .env.local");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Surface unexpected pool-level errors (e.g. a backend dropping an idle client)
// without holding a connection open. Do NOT eagerly pool.connect() here — the
// previous code never released that client, permanently leaking one connection.
pool.on("error", (err) => {
  console.error("❌ Unexpected database pool error", err);
});
