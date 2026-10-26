import { createHash } from "node:crypto";
import type { ImportedCatalogRecord, ImportMode, ImportPlan, ImportPlanOperation, NormalizedFeedRecord } from "./types.ts";

function stableValue(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (depth > 12) throw new Error("record nesting exceeds fingerprint limit");
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error("record array exceeds fingerprint limit");
    return value.map((item) => stableValue(item, seen, depth + 1));
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) throw new Error("cyclic record cannot be fingerprinted");
    seen.add(value);
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 100) throw new Error("record object exceeds fingerprint limit");
    const normalized = Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item, seen, depth + 1)]));
    seen.delete(value);
    return normalized;
  }
  return value;
}

export function importIdentityKey(record: Pick<NormalizedFeedRecord, "sourceId" | "externalOfferId">): string {
  return JSON.stringify([record.sourceId, record.externalOfferId]);
}

export function fingerprintRecord(record: NormalizedFeedRecord): string {
  const content = Object.fromEntries(Object.entries(record).filter(([key]) => key !== "observedAt"));
  return createHash("sha256").update(JSON.stringify(stableValue(content))).digest("hex");
}

export interface BuildImportPlanInput {
  sourceId: string;
  mode: ImportMode;
  records: readonly NormalizedFeedRecord[];
  existing: readonly ImportedCatalogRecord[];
  snapshotComplete?: boolean;
  maxMissingRatio?: number;
}

export function buildImportPlan(input: BuildImportPlanInput): ImportPlan {
  const maxMissingRatio = input.maxMissingRatio ?? 0.2;
  if (!Number.isFinite(maxMissingRatio)) throw new Error("maxMissingRatio must be a finite number");
  if (maxMissingRatio < 0 || maxMissingRatio > 1) throw new Error("maxMissingRatio must be between 0 and 1");
  if (input.mode === "full" && input.snapshotComplete !== true) throw new Error("full imports require a complete snapshot before reconciliation");

  const existing = input.existing.filter((item) => item.sourceId === input.sourceId && item.status === "active");
  const existingByKey = new Map(existing.map((item) => [item.identityKey, item]));
  const recordsByKey = new Map<string, NormalizedFeedRecord>();
  for (const record of input.records) {
    if (record.sourceId !== input.sourceId) throw new Error(`record source ${record.sourceId} does not match import source ${input.sourceId}`);
    const observedTime = Date.parse(record.observedAt);
    if (!Number.isFinite(observedTime)) throw new Error(`record observedAt is invalid: ${record.observedAt}`);
    const canonicalRecord = { ...record, observedAt: new Date(observedTime).toISOString() };
    const key = importIdentityKey(canonicalRecord);
    const previous = recordsByKey.get(key);
    if (!previous) { recordsByKey.set(key, canonicalRecord); continue; }
    const previousTime = Date.parse(previous.observedAt);
    if (observedTime === previousTime && fingerprintRecord(previous) !== fingerprintRecord(canonicalRecord)) throw new Error(`conflicting duplicate record at the same timestamp: ${key}`);
    if (observedTime > previousTime) recordsByKey.set(key, canonicalRecord);
  }

  const operations: ImportPlanOperation[] = [];
  const handledArchives = new Set<string>();
  const preservedExistingKeys = new Set<string>();
  for (const [identityKey, record] of recordsByKey) {
    const previous = existingByKey.get(identityKey);
    if (previous && Date.parse(record.observedAt) < Date.parse(previous.lastSeenAt)) {
      operations.push({ kind: "noop", identityKey, record, previous });
      preservedExistingKeys.add(identityKey);
      continue;
    }
    if (record.operation === "delete") {
      if (previous) {
        operations.push({ kind: "archive", identityKey, previous, reason: "explicit_delete" });
        handledArchives.add(identityKey);
      } else operations.push({ kind: "noop", identityKey, record });
      continue;
    }
    const fingerprint = fingerprintRecord(record);
    if (!previous) operations.push({ kind: "create", identityKey, record, fingerprint });
    else if (previous.fingerprint === fingerprint) operations.push({ kind: "noop", identityKey, record, previous });
    else operations.push({ kind: "update", identityKey, record, fingerprint, previous });
  }

  if (input.mode === "full") {
    const activeIncomingKeys = new Set([...recordsByKey].filter(([, record]) => record.operation === "upsert").map(([key]) => key));
    const missing = existing.filter((item) => !activeIncomingKeys.has(item.identityKey) && !handledArchives.has(item.identityKey) && !preservedExistingKeys.has(item.identityKey));
    const destructiveCount = missing.length + handledArchives.size;
    const destructiveRatio = existing.length ? destructiveCount / existing.length : 0;
    if (destructiveRatio > maxMissingRatio) throw new Error(`full snapshot destructive ratio ${destructiveRatio.toFixed(3)} exceeds guard ${maxMissingRatio.toFixed(3)}`);
    for (const previous of missing) operations.push({ kind: "archive", identityKey: previous.identityKey, previous, reason: "missing_from_full_snapshot" });
  }

  const summary = { create: 0, update: 0, archive: 0, noop: 0, rejected: 0 };
  for (const operation of operations) summary[operation.kind] += 1;
  return { sourceId: input.sourceId, mode: input.mode, operations, summary };
}
