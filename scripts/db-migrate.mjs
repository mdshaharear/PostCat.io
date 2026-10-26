import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "database", "migrations");
const files = (await readdir(migrationsDirectory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(`CREATE TABLE IF NOT EXISTS catalog_schema_migrations (
    version TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  for (const file of files) {
    const sql = await readFile(join(migrationsDirectory, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query("SELECT checksum FROM catalog_schema_migrations WHERE version = $1", [file]);
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) throw new Error(`migration checksum changed: ${file}`);
      continue;
    }
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO catalog_schema_migrations(version, checksum) VALUES ($1, $2)", [file, checksum]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
