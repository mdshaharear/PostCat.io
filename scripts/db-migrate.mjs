import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const appPassword = process.env.POSTCAT_DB_APP_PASSWORD;
if (!appPassword || !/^[A-Za-z0-9._~-]{32,128}$/.test(appPassword)) throw new Error("POSTCAT_DB_APP_PASSWORD must be 32-128 URL-safe characters");

const migrationsDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "database", "migrations");
const files = (await readdir(migrationsDirectory)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
const client = new Client({ connectionString: databaseUrl });
await client.connect();
let migrationLockHeld = false;

async function formattedStatement(format, values) {
  const result = await client.query("SELECT format($1, VARIADIC $2::text[]) AS statement", [format, values]);
  await client.query(result.rows[0].statement);
}

async function ensureApplicationRole() {
  const role = "postcat_app";
  const existing = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
  if (existing.rowCount) {
    await formattedStatement("ALTER ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION", [role, appPassword]);
  } else {
    await formattedStatement("CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION", [role, appPassword]);
  }
}

async function grantApplicationPrivileges() {
  await formattedStatement("GRANT CONNECT ON DATABASE %I TO postcat_app", [(await client.query("SELECT current_database() AS name")).rows[0].name]);
  await client.query("GRANT USAGE ON SCHEMA public TO postcat_app");
  await client.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postcat_app");
  await client.query("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postcat_app");
  await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postcat_app");
  await client.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO postcat_app");
}

try {
  await client.query("SELECT pg_advisory_lock(hashtextextended('postcat-schema-migrations', 0))");
  migrationLockHeld = true;
  await ensureApplicationRole();
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
  await grantApplicationPrivileges();
} finally {
  try {
    if (migrationLockHeld) await client.query("SELECT pg_advisory_unlock(hashtextextended('postcat-schema-migrations', 0))");
  } finally {
    await client.end();
  }
}
