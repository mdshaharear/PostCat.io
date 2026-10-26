import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { PostgresImportRepository } from "../src/imports/postgres-repository.ts";
import { buildImportPlan } from "../src/imports/engine.ts";
import type { ImportRunReport, NormalizedFeedRecord } from "../src/imports/types.ts";

const record = (overrides: Partial<NormalizedFeedRecord> = {}): NormalizedFeedRecord => ({
  sourceId: "ebay-us",
  externalProductId: "product-1",
  externalVariantId: "variant-1",
  externalOfferId: "offer-1",
  operation: "upsert",
  observedAt: "2026-10-26T12:00:00.000Z",
  title: "Verified product",
  description: "Authorized source-backed description.",
  brandName: "Verified Brand",
  categorySlug: "processors-cpus",
  variantLabel: "Default",
  merchantName: "eBay",
  priceAmountMinor: 19999,
  currency: "USD",
  availability: "in_stock",
  affiliateUrl: "https://www.ebay.com/itm/1",
  imageUrls: ["https://i.ebayimg.com/images/1.webp"],
  identifiers: {},
  ...overrides,
});

const report = (overrides: Partial<ImportRunReport> = {}): ImportRunReport => ({
  schemaVersion: 1,
  runId: "11111111-1111-4111-8111-111111111111",
  sourceId: "ebay-us",
  mode: "incremental",
  dryRun: false,
  status: "succeeded",
  received: 1,
  accepted: 1,
  rejected: 0,
  planned: { create: 1, update: 0, archive: 0, noop: 0, rejected: 0 },
  applied: { create: 1, update: 0, archive: 0, noop: 0, rejected: 0 },
  errors: [],
  startedAt: "2026-10-26T12:00:00.000Z",
  finishedAt: "2026-10-26T12:00:01.000Z",
  durationMs: 1000,
  ...overrides,
});

async function repository() {
  const database = newDb();
  database.public.none(`
    CREATE TABLE catalog_source_records (
      identity_key TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      external_product_id TEXT NOT NULL,
      external_variant_id TEXT NOT NULL,
      external_offer_id TEXT NOT NULL,
      fingerprint CHAR(64) NOT NULL,
      normalized_record JSONB NOT NULL,
      status TEXT NOT NULL,
      first_seen_at TIMESTAMPTZ NOT NULL,
      last_seen_at TIMESTAMPTZ NOT NULL,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (source_id, external_offer_id)
    );
    CREATE TABLE catalog_import_runs (
      run_id UUID PRIMARY KEY,
      source_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      dry_run BOOLEAN NOT NULL,
      status TEXT NOT NULL,
      report JSONB NOT NULL,
      started_at TIMESTAMPTZ NOT NULL,
      finished_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const adapter = database.adapters.createPg();
  const pool = new adapter.Pool();
  return { repo: new PostgresImportRepository(pool), pool };
}

test("PostgreSQL import repository commits catalog changes and run report atomically", async () => {
  const { repo, pool } = await repository();
  const incoming = record();
  const plan = buildImportPlan({ sourceId: incoming.sourceId, mode: "incremental", records: [incoming], existing: [] });
  await repo.commitRun(plan, report(), "2026-10-26T12:00:01.000Z");

  const active = await repo.listActive("ebay-us");
  assert.equal(active.length, 1);
  assert.equal(active[0]?.record.title, "Verified product");
  assert.equal((await repo.listRuns()).length, 1);
  await pool.end();
});

test("PostgreSQL import repository updates freshness and archives without deleting provenance", async () => {
  const { repo, pool } = await repository();
  const first = record();
  await repo.applyPlan(buildImportPlan({ sourceId: first.sourceId, mode: "incremental", records: [first], existing: [] }), first.observedAt);

  const newer = record({ observedAt: "2026-10-26T13:00:00.000Z" });
  const existing = await repo.listActive("ebay-us");
  await repo.applyPlan(buildImportPlan({ sourceId: newer.sourceId, mode: "incremental", records: [newer], existing }), newer.observedAt);
  assert.equal((await repo.listActive("ebay-us"))[0]?.lastSeenAt, newer.observedAt);

  const deletion = record({ observedAt: "2026-10-26T14:00:00.000Z", operation: "delete", title: undefined, description: undefined, brandName: undefined, categorySlug: undefined, variantLabel: undefined, merchantName: undefined, priceAmountMinor: undefined, currency: undefined, availability: undefined, affiliateUrl: undefined, imageUrls: undefined, identifiers: undefined });
  await repo.applyPlan(buildImportPlan({ sourceId: deletion.sourceId, mode: "incremental", records: [deletion], existing: await repo.listActive("ebay-us") }), deletion.observedAt);
  assert.equal((await repo.listActive("ebay-us")).length, 0);
  await pool.end();
});
