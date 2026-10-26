import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveDatabaseConfig } from "../src/database/config.ts";
import { categories } from "../src/data/catalog.ts";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("database configuration accepts only PostgreSQL URLs and hides credentials", () => {
  const config = resolveDatabaseConfig("postgresql://postcat:secret@database:5432/postcat", "production");
  assert.equal(config.host, "database");
  assert.equal(config.port, 5432);
  assert.equal(config.database, "postcat");
  assert.equal(config.safeLabel, "postgresql://database:5432/postcat");
  assert.equal(config.safeLabel.includes("secret"), false);
  assert.throws(() => resolveDatabaseConfig("mysql://database/postcat", "production"), /PostgreSQL/);
  assert.throws(() => resolveDatabaseConfig(undefined, "production"), /DATABASE_URL/);
});

test("catalog migration separates products, variants, offers and source provenance", async () => {
  const sql = await read("src/database/migrations/001_catalog.sql");
  for (const table of [
    "catalog_categories",
    "catalog_brands",
    "catalog_products",
    "catalog_variants",
    "catalog_merchants",
    "catalog_offers",
    "catalog_media_assets",
    "catalog_source_records",
    "catalog_import_runs",
    "catalog_outbox_events",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  }
  assert.match(sql, /UNIQUE \(source_id, external_offer_id\)/);
  assert.match(sql, /price_amount_minor BIGINT/);
  assert.match(sql, /affiliate_url TEXT/);
  assert.match(sql, /availability TEXT NOT NULL CHECK/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS catalog_products_search_idx[\s\S]*USING GIN/);
});

test("taxonomy seed migration contains every production category", async () => {
  const sql = await read("src/database/migrations/002_taxonomy.sql");
  assert.equal(categories.length, 347);
  for (const category of categories) {
    assert.match(sql, new RegExp(`'${category.id.replaceAll("'", "''")}'\\s*,\\s*'${category.slug.replaceAll("'", "''")}'`));
  }
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE/);
});

test("production image includes migration runtime dependencies and artifacts", async () => {
  const dockerfile = await read("Dockerfile");
  assert.match(dockerfile, /FROM dependencies AS production-dependencies/);
  assert.match(dockerfile, /npm prune --omit=dev/);
  assert.match(dockerfile, /COPY --from=production-dependencies[^\n]*\/app\/node_modules \.\/node_modules/);
  assert.match(dockerfile, /scripts\/db-migrate\.mjs/);
  assert.match(dockerfile, /src\/database\/migrations/);
});

test("production Compose provisions a private persistent PostgreSQL service", async () => {
  const compose = await read("compose.production.yaml");
  assert.match(compose, /database:\n[\s\S]*image: postgres:[^\n]+@sha256:[a-f0-9]{64}/);
  assert.match(compose, /POSTGRES_DB: postcat/);
  assert.match(compose, /POSTGRES_USER: postcat/);
  assert.match(compose, /POSTGRES_PASSWORD: \$\{POSTCAT_DB_PASSWORD:\?/);
  assert.match(compose, /pg_isready -U postcat -d postcat/);
  assert.match(compose, /postcat-db-data:\/var\/lib\/postgresql\/data/);
  assert.doesNotMatch(compose, /database:[\s\S]{0,500}\n\s+ports:/);
  assert.match(compose, /DATABASE_URL: postgresql:\/\/postcat:\$\{POSTCAT_DB_PASSWORD\}@database:5432\/postcat/);
  assert.match(compose, /migrate:\n[\s\S]*command: \["node", "scripts\/db-migrate\.mjs"\]/);
  assert.match(compose, /volumes:\n\s+postcat-db-data:/);
});

test("deployment applies migrations before starting the web service", async () => {
  const deploy = await read("ops/deploy.sh");
  assert.match(deploy, /pull database web migrate/);
  assert.match(deploy, /db_password.*POSTCAT_DB_PASSWORD/);
  assert.match(deploy, /A-Za-z0-9\._~-/);
  assert.match(deploy, /docker compose[\s\S]*run --rm migrate/);
  assert.match(deploy, /docker compose[\s\S]*up --detach --wait web/);
  assert.ok(deploy.indexOf("run --rm migrate") < deploy.indexOf("up --detach --wait web"));
});

test("migration runner serializes schema changes with a PostgreSQL advisory lock", async () => {
  const migrate = await read("scripts/db-migrate.mjs");
  assert.match(migrate, /pg_advisory_lock/);
  assert.match(migrate, /pg_advisory_unlock/);
});
