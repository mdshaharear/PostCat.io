import test from "node:test";
import assert from "node:assert/strict";
import { validateFeedRecord } from "../src/imports/validation.ts";
import { buildImportPlan, fingerprintRecord, importIdentityKey } from "../src/imports/engine.ts";
import { classifyImportError, computeRetryDelayMs } from "../src/imports/retry.ts";
import { getDueImportJobs, nextImportRunAt } from "../src/imports/scheduler.ts";
import type { ImportedCatalogRecord, NormalizedFeedRecord } from "../src/imports/types.ts";
import { MemoryImportRepository } from "../src/imports/memory-repository.ts";
import { ImportRunFailure, runCatalogImport } from "../src/imports/runner.ts";
import { parseJsonFeed } from "../src/imports/json-adapter.ts";
import { redactSecrets } from "../src/imports/redaction.ts";

const record = (overrides: Partial<NormalizedFeedRecord> = {}): NormalizedFeedRecord => ({
  sourceId: "approved-demo-source",
  externalProductId: "product-1",
  externalVariantId: "variant-1",
  externalOfferId: "offer-1",
  operation: "upsert",
  observedAt: "2026-10-25T10:00:00.000Z",
  title: "Authorized Test Product",
  description: "A source-backed product fixture used only for import-engine tests.",
  brandName: "Source Brand",
  categorySlug: "processors-cpus",
  variantLabel: "Default",
  variantAttributes: { Color: "Black" },
  merchantName: "Authorized Merchant",
  priceAmountMinor: 12999,
  currency: "USD",
  availability: "in_stock",
  affiliateUrl: "https://merchant.example/product-1",
  imageUrls: ["https://images.example/product-1.webp"],
  identifiers: {},
  ...overrides,
});

const stored = (input: NormalizedFeedRecord): ImportedCatalogRecord => ({
  identityKey: importIdentityKey(input),
  sourceId: input.sourceId,
  externalOfferId: input.externalOfferId,
  fingerprint: fingerprintRecord(input),
  record: input,
  status: "active",
  firstSeenAt: input.observedAt,
  lastSeenAt: input.observedAt,
});

test("feed validation accepts a complete authorized record", () => {
  const result = validateFeedRecord(record());
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value.externalOfferId, "offer-1");
});

test("feed validation rejects unknown availability and invented blank identifiers", () => {
  const invalid = { ...record(), availability: "available", identifiers: { gtin: "" } };
  const result = validateFeedRecord(invalid);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.errors.some((error) => error.path === "availability"));
  assert.ok(!result.ok && result.errors.some((error) => error.path === "identifiers.gtin"));
});

test("feed validation rejects URL credentials and non-default HTTPS ports", () => {
  for (const affiliateUrl of ["https://user:secret@merchant.example/item", "https://merchant.example:8443/item"]) {
    const result = validateFeedRecord(record({ affiliateUrl }));
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.errors.some((error) => error.path === "affiliateUrl"));
  }
  const imageResult = validateFeedRecord(record({ imageUrls: ["https://user:secret@images.example/item.webp"] }));
  assert.equal(imageResult.ok, false);
  assert.ok(!imageResult.ok && imageResult.errors.some((error) => error.path === "imageUrls.0"));
});

test("replaying an unchanged feed produces no writes", () => {
  const input = record();
  const plan = buildImportPlan({ sourceId: input.sourceId, mode: "incremental", records: [input], existing: [stored(input)] });
  assert.deepEqual(plan.summary, { create: 0, update: 0, archive: 0, noop: 1, rejected: 0 });
  assert.equal(plan.operations[0]?.kind, "noop");
});

test("changed source data creates a deterministic update", () => {
  const before = record();
  const after = record({ priceAmountMinor: 11999, observedAt: "2026-10-25T11:00:00.000Z" });
  const plan = buildImportPlan({ sourceId: before.sourceId, mode: "incremental", records: [after], existing: [stored(before)] });
  assert.equal(plan.operations[0]?.kind, "update");
  assert.deepEqual(plan.summary, { create: 0, update: 1, archive: 0, noop: 0, rejected: 0 });
});

test("full snapshot removal requires completeness and respects the missing-ratio guard", () => {
  const existing = [stored(record()), stored(record({ externalOfferId: "offer-2" }))];
  assert.throws(() => buildImportPlan({ sourceId: "approved-demo-source", mode: "full", records: [record()], existing, snapshotComplete: false }), /complete snapshot/);
  assert.throws(() => buildImportPlan({ sourceId: "approved-demo-source", mode: "full", records: [record()], existing, snapshotComplete: true, maxMissingRatio: 0.2 }), /destructive ratio/);
  const safe = buildImportPlan({ sourceId: "approved-demo-source", mode: "full", records: [record()], existing, snapshotComplete: true, maxMissingRatio: 0.6 });
  assert.equal(safe.summary.archive, 1);
});

test("incremental feeds archive only explicit delete records", () => {
  const active = record();
  const deletion = record({ operation: "delete", title: undefined, description: undefined, brandName: undefined, categorySlug: undefined, variantLabel: undefined, variantAttributes: undefined, merchantName: undefined, priceAmountMinor: undefined, currency: undefined, availability: undefined, affiliateUrl: undefined, imageUrls: undefined, identifiers: undefined });
  const plan = buildImportPlan({ sourceId: active.sourceId, mode: "incremental", records: [deletion], existing: [stored(active)] });
  assert.equal(plan.summary.archive, 1);
});

test("retry policy distinguishes permanent, rate-limit and transient failures", () => {
  assert.equal(classifyImportError({ status: 400 }), "permanent");
  assert.equal(classifyImportError({ status: 429 }), "rate_limit");
  assert.equal(classifyImportError({ status: 503 }), "transient");
  assert.equal(computeRetryDelayMs({ attempt: 3, baseDelayMs: 1000, maxDelayMs: 60000, jitter: 0 }), 4000);
});

test("scheduler returns only enabled due jobs and advances from the previous schedule", () => {
  const now = new Date("2026-10-25T12:00:00.000Z");
  const jobs = [
    { sourceId: "due", enabled: true, intervalMinutes: 60, nextRunAt: "2026-10-25T11:59:00.000Z" },
    { sourceId: "future", enabled: true, intervalMinutes: 60, nextRunAt: "2026-10-25T12:30:00.000Z" },
    { sourceId: "disabled", enabled: false, intervalMinutes: 60, nextRunAt: "2026-10-25T11:00:00.000Z" },
  ];
  assert.deepEqual(getDueImportJobs(jobs, now).map((job) => job.sourceId), ["due"]);
  assert.equal(nextImportRunAt(jobs[0], now).toISOString(), "2026-10-25T12:59:00.000Z");
});


test("validation strips unknown fields and rejects bounded oversized inputs", () => {
  const withUnknown = { ...record(), injected: "ignored" } as Record<string, unknown>;
  withUnknown.self = withUnknown;
  const normalized = validateFeedRecord(withUnknown);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.ok && "injected" in normalized.value, false);
  assert.equal(normalized.ok && "self" in normalized.value, false);
  const oversized = validateFeedRecord(record({ title: "x".repeat(301), imageUrls: Array.from({ length: 13 }, (_, index) => `https://images.example/${index}.webp`) }));
  assert.equal(oversized.ok, false);
  assert.ok(!oversized.ok && oversized.errors.some((error) => error.path === "title"));
  assert.ok(!oversized.ok && oversized.errors.some((error) => error.path === "imageUrls"));
});

test("full reconciliation guard counts explicit deletes and rejects non-finite ratios", () => {
  const active = record();
  const deletion = record({ operation: "delete", title: undefined, description: undefined, brandName: undefined, categorySlug: undefined, variantLabel: undefined, variantAttributes: undefined, merchantName: undefined, priceAmountMinor: undefined, currency: undefined, availability: undefined, affiliateUrl: undefined, imageUrls: undefined, identifiers: undefined });
  assert.throws(() => buildImportPlan({ sourceId: active.sourceId, mode: "full", records: [deletion], existing: [stored(active)], snapshotComplete: true, maxMissingRatio: 0 }), /destructive ratio/);
  assert.throws(() => buildImportPlan({ sourceId: active.sourceId, mode: "full", records: [], existing: [stored(active)], snapshotComplete: true, maxMissingRatio: Number.NaN }), /finite number/);
});

test("out-of-order records cannot overwrite newer stored state", () => {
  const current = record({ observedAt: "2026-10-25T12:00:00.000Z", priceAmountMinor: 12999 });
  const stale = record({ observedAt: "2026-10-25T11:00:00.000Z", priceAmountMinor: 9999 });
  const plan = buildImportPlan({ sourceId: current.sourceId, mode: "incremental", records: [stale], existing: [stored(current)] });
  assert.equal(plan.operations[0]?.kind, "noop");
  assert.deepEqual(plan.summary, { create: 0, update: 0, archive: 0, noop: 1, rejected: 0 });
});

test("retry delays reject invalid timing configuration", () => {
  assert.throws(() => computeRetryDelayMs({ attempt: 1, baseDelayMs: -1, maxDelayMs: 1000 }), /baseDelayMs/);
  assert.throws(() => computeRetryDelayMs({ attempt: 1, baseDelayMs: 1000, maxDelayMs: 500 }), /maxDelayMs/);
  assert.throws(() => computeRetryDelayMs({ attempt: 1, baseDelayMs: 1000, maxDelayMs: 2000, retryAfterMs: Number.POSITIVE_INFINITY }), /retryAfterMs/);
});

test("scheduler preserves cadence from the previous scheduled run", () => {
  const job = { sourceId: "cadence", enabled: true, intervalMinutes: 60, nextRunAt: "2026-10-25T11:59:00.000Z" };
  assert.equal(nextImportRunAt(job, new Date("2026-10-25T12:00:00.000Z")).toISOString(), "2026-10-25T12:59:00.000Z");
});


test("stale explicit deletes cannot archive newer state during full reconciliation", () => {
  const current = record({ observedAt: "2026-10-25T12:00:00.000Z" });
  const staleDelete = record({ observedAt: "2026-10-25T11:00:00.000Z", operation: "delete", title: undefined, description: undefined, brandName: undefined, categorySlug: undefined, variantLabel: undefined, variantAttributes: undefined, merchantName: undefined, priceAmountMinor: undefined, currency: undefined, availability: undefined, affiliateUrl: undefined, imageUrls: undefined, identifiers: undefined });
  const plan = buildImportPlan({ sourceId: current.sourceId, mode: "full", records: [staleDelete], existing: [stored(current)], snapshotComplete: true, maxMissingRatio: 0 });
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0]?.kind, "noop");
  assert.equal(plan.summary.archive, 0);
});

test("duplicate identities deterministically keep the newest observation", () => {
  const existing = record({ observedAt: "2026-10-25T10:00:00.000Z", priceAmountMinor: 12999 });
  const newer = record({ observedAt: "2026-10-25T12:00:00.000Z", priceAmountMinor: 10999 });
  const older = record({ observedAt: "2026-10-25T11:00:00.000Z", priceAmountMinor: 11999 });
  for (const records of [[newer, older], [older, newer]]) {
    const plan = buildImportPlan({ sourceId: existing.sourceId, mode: "incremental", records, existing: [stored(existing)] });
    assert.equal(plan.operations[0]?.kind, "update");
    assert.equal(plan.operations[0]?.kind === "update" && plan.operations[0].record.observedAt, newer.observedAt);
    assert.equal(plan.operations[0]?.kind === "update" && plan.operations[0].record.priceAmountMinor, newer.priceAmountMinor);
  }
});

test("timestamp validation rejects normalized but impossible dates and times", () => {
  for (const observedAt of ["2026-02-30T10:00:00Z", "2026-01-01T24:00:00Z", "2026-13-01T10:00:00Z", "2026-01-01T10:61:00Z"]) {
    const result = validateFeedRecord(record({ observedAt }));
    assert.equal(result.ok, false, observedAt);
    assert.ok(!result.ok && result.errors.some((error) => error.path === "observedAt"));
  }
});


test("equivalent RFC3339 instants produce order-independent canonical plans", () => {
  const existing = record({ observedAt: "2026-10-25T10:00:00.000Z", priceAmountMinor: 12999 });
  const utc = record({ observedAt: "2026-10-25T12:00:00Z", priceAmountMinor: 10999 });
  const offset = record({ observedAt: "2026-10-25T14:00:00+02:00", priceAmountMinor: 10999 });
  const first = buildImportPlan({ sourceId: existing.sourceId, mode: "incremental", records: [utc, offset], existing: [stored(existing)] });
  const second = buildImportPlan({ sourceId: existing.sourceId, mode: "incremental", records: [offset, utc], existing: [stored(existing)] });
  assert.deepEqual(first, second);
  assert.equal(first.operations[0]?.kind === "update" && first.operations[0].record.observedAt, "2026-10-25T12:00:00.000Z");
});

test("same-instant duplicate content conflicts are rejected", () => {
  const one = record({ observedAt: "2026-10-25T12:00:00Z", priceAmountMinor: 10999 });
  const conflicting = record({ observedAt: "2026-10-25T14:00:00+02:00", priceAmountMinor: 9999 });
  assert.throws(() => buildImportPlan({ sourceId: one.sourceId, mode: "incremental", records: [one, conflicting], existing: [] }), /conflicting duplicate record at the same timestamp/);
});

test("dry-run reports planned operations without changing repository state", async () => {
  const repository = new MemoryImportRepository();
  const report = await runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: true, rawRecords: [record()] }, { repository, now: () => new Date("2026-10-25T12:00:00.000Z") });
  assert.equal(report.status, "succeeded");
  assert.equal(report.dryRun, true);
  assert.equal(report.planned.create, 1);
  assert.equal(report.applied.create, 0);
  assert.equal((await repository.listActive("approved-demo-source")).length, 0);
  assert.equal((await repository.listRuns()).length, 1);
});

test("real import applies atomically and replay becomes a noop", async () => {
  const repository = new MemoryImportRepository();
  const dependencies = { repository, now: () => new Date("2026-10-25T12:00:00.000Z") };
  const first = await runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: false, rawRecords: [record()] }, dependencies);
  const second = await runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: false, rawRecords: [record()] }, dependencies);
  assert.equal(first.applied.create, 1);
  assert.equal(second.planned.noop, 1);
  assert.equal((await repository.listActive("approved-demo-source")).length, 1);
});

test("source lease prevents overlapping import runs", async () => {
  const repository = new MemoryImportRepository();
  assert.equal(await repository.acquireLease("approved-demo-source", "held-run"), true);
  await assert.rejects(() => runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: true, rawRecords: [record()] }, { repository }), /already running/);
});

test("validation failures produce a safe rejected report and no catalog writes", async () => {
  const repository = new MemoryImportRepository();
  const report = await runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: false, rawRecords: [{ ...record(), affiliateUrl: "http://unsafe.example/item" }] }, { repository });
  assert.equal(report.status, "rejected");
  assert.equal(report.received, 1);
  assert.equal(report.rejected, 1);
  assert.equal(report.errors[0]?.code, "VALIDATION_FAILED");
  assert.equal(JSON.stringify(report).includes("unsafe.example"), false);
  assert.equal((await repository.listActive("approved-demo-source")).length, 0);
});

test("repository apply is atomic when an operation fails", async () => {
  const repository = new MemoryImportRepository({ failAfterOperations: 1 });
  const records = [record(), record({ externalOfferId: "offer-2", externalVariantId: "variant-2" })];
  await assert.rejects(() => runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: false, rawRecords: records }, { repository }), ImportRunFailure);
  assert.equal((await repository.listActive("approved-demo-source")).length, 0);
});

test("JSON adapter accepts an array or records envelope and rejects invalid JSON", () => {
  assert.equal(parseJsonFeed(JSON.stringify([record()])).length, 1);
  assert.equal(parseJsonFeed(JSON.stringify({ records: [record()] })).length, 1);
  assert.throws(() => parseJsonFeed("not-json"), /valid JSON/);
  assert.throws(() => parseJsonFeed(JSON.stringify({ rows: [] })), /array or records envelope/);
});

test("secret redaction removes nested credentials without mutating input", () => {
  const input = { headers: { Authorization: "Bearer super-secret-token", "X-API-Key": "key-123" }, url: "https://merchant.example/item?access_token=secret&campaign=safe", nested: [{ password: "hidden" }] };
  const redacted = redactSecrets(input) as typeof input;
  assert.equal(JSON.stringify(redacted).includes("super-secret-token"), false);
  assert.equal(JSON.stringify(redacted).includes("key-123"), false);
  assert.equal(JSON.stringify(redacted).includes("secret"), false);
  assert.equal(input.headers.Authorization, "Bearer super-secret-token");
  assert.match(redacted.url, /campaign=safe/);
});

test("newer identical observations advance freshness without a content update", async () => {
  const first = record({ observedAt: "2026-10-25T10:00:00.000Z" });
  const newer = record({ observedAt: "2026-10-25T11:00:00.000Z" });
  const repository = new MemoryImportRepository();
  await runCatalogImport({ sourceId: first.sourceId, mode: "incremental", dryRun: false, rawRecords: [first] }, { repository });
  const report = await runCatalogImport({ sourceId: first.sourceId, mode: "incremental", dryRun: false, rawRecords: [newer] }, { repository });
  assert.equal(report.planned.noop, 1);
  assert.equal((await repository.listActive(first.sourceId))[0]?.lastSeenAt, newer.observedAt);
});

test("archive preserves last seen freshness and records a separate archive timestamp", async () => {
  const active = record({ observedAt: "2026-10-25T10:00:00.000Z" });
  const deletion = record({ observedAt: "2026-10-25T11:00:00.000Z", operation: "delete", title: undefined, description: undefined, brandName: undefined, categorySlug: undefined, variantLabel: undefined, variantAttributes: undefined, merchantName: undefined, priceAmountMinor: undefined, currency: undefined, availability: undefined, affiliateUrl: undefined, imageUrls: undefined, identifiers: undefined });
  const repository = new MemoryImportRepository({ initialRecords: [stored(active)] });
  await runCatalogImport({ sourceId: active.sourceId, mode: "incremental", dryRun: false, rawRecords: [deletion] }, { repository, now: () => new Date("2026-10-25T12:00:00.000Z") });
  const archived = (await repository.listAll(active.sourceId))[0];
  assert.equal(archived?.status, "archived");
  assert.equal(archived?.lastSeenAt, active.observedAt);
  assert.equal(archived?.archivedAt, "2026-10-25T12:00:00.000Z");
});

test("failed atomic apply retains accepted and planned counts in a safe typed failure", async () => {
  const repository = new MemoryImportRepository({ failAfterOperations: 1, failureMessage: "token=super-secret https://unsafe.example/item" });
  const records = [record(), record({ externalOfferId: "offer-2", externalVariantId: "variant-2" })];
  await assert.rejects(async () => {
    try {
      await runCatalogImport({ sourceId: "approved-demo-source", mode: "incremental", dryRun: false, rawRecords: records }, { repository });
    } catch (error) {
      if (!(error instanceof ImportRunFailure)) throw error;
      assert.equal(error.report.accepted, 2);
      assert.equal(error.report.planned.create, 2);
      assert.equal(error.report.applied.create, 0);
      assert.equal(JSON.stringify(error.report).includes("super-secret"), false);
      assert.equal(JSON.stringify(error.report).includes("unsafe.example"), false);
      throw error;
    }
  }, ImportRunFailure);
});

test("source policy caps caller-provided destructive full-snapshot ratios", async () => {
  const existing = Array.from({ length: 5 }, (_, index) => stored(record({ externalOfferId: `offer-${index + 1}`, externalVariantId: `variant-${index + 1}` })));
  const repository = new MemoryImportRepository({ initialRecords: existing });
  await assert.rejects(() => runCatalogImport({ sourceId: "approved-demo-source", mode: "full", dryRun: false, rawRecords: [record()], snapshotComplete: true, maxMissingRatio: 1 }, { repository }), ImportRunFailure);
  assert.equal((await repository.listActive("approved-demo-source")).length, 5);
});

test("identity keys cannot collide when source or offer identifiers contain separators", () => {
  assert.notEqual(importIdentityKey({ sourceId: "a:b", externalOfferId: "c" }), importIdentityKey({ sourceId: "a", externalOfferId: "b:c" }));
});
