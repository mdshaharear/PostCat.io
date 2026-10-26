export type ImportMode = "full" | "incremental";
export type ImportOperation = "upsert" | "delete";
export type ImportAvailability = "in_stock" | "limited" | "out_of_stock" | "unknown";

export interface ProductIdentifiers {
  gtin?: string;
  mpn?: string;
}

export interface NormalizedFeedRecord {
  sourceId: string;
  externalProductId: string;
  externalVariantId: string;
  externalOfferId: string;
  operation: ImportOperation;
  observedAt: string;
  title?: string;
  description?: string;
  brandName?: string;
  categorySlug?: string;
  variantLabel?: string;
  variantAttributes?: Readonly<Record<string, string>>;
  merchantName?: string;
  priceAmountMinor?: number;
  currency?: string;
  availability?: ImportAvailability;
  affiliateUrl?: string;
  imageUrls?: readonly string[];
  identifiers?: ProductIdentifiers;
}

export interface ImportedCatalogRecord {
  identityKey: string;
  sourceId: string;
  externalOfferId: string;
  fingerprint: string;
  record: NormalizedFeedRecord;
  status: "active" | "archived";
  firstSeenAt: string;
  lastSeenAt: string;
  archivedAt?: string;
}

export type ImportPlanOperation =
  | { kind: "create"; identityKey: string; record: NormalizedFeedRecord; fingerprint: string }
  | { kind: "update"; identityKey: string; record: NormalizedFeedRecord; fingerprint: string; previous: ImportedCatalogRecord }
  | { kind: "archive"; identityKey: string; previous: ImportedCatalogRecord; reason: "explicit_delete" | "missing_from_full_snapshot" }
  | { kind: "noop"; identityKey: string; record?: NormalizedFeedRecord; previous?: ImportedCatalogRecord };

export interface ImportPlanSummary {
  create: number;
  update: number;
  archive: number;
  noop: number;
  rejected: number;
}

export interface ImportPlan {
  sourceId: string;
  mode: ImportMode;
  operations: ImportPlanOperation[];
  summary: ImportPlanSummary;
}

export interface ImportJob {
  sourceId: string;
  enabled: boolean;
  intervalMinutes: number;
  nextRunAt: string;
}

export interface FeedValidationError {
  path: string;
  message: string;
}

export type FeedValidationResult =
  | { ok: true; value: NormalizedFeedRecord }
  | { ok: false; errors: FeedValidationError[] };

export interface ImportRunError { code: string; path?: string; message: string }
export interface ImportRunReport {
  schemaVersion: 1;
  runId: string;
  sourceId: string;
  mode: ImportMode;
  dryRun: boolean;
  status: "succeeded" | "rejected" | "failed";
  received: number;
  accepted: number;
  rejected: number;
  planned: ImportPlanSummary;
  applied: ImportPlanSummary;
  errors: ImportRunError[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ImportRepository {
  acquireLease(sourceId: string, runId: string): Promise<boolean>;
  releaseLease(sourceId: string, runId: string): Promise<void>;
  listActive(sourceId: string): Promise<ImportedCatalogRecord[]>;
  applyPlan(plan: ImportPlan, appliedAt: string): Promise<ImportPlanSummary>;
  commitRun(plan: ImportPlan, report: ImportRunReport, appliedAt: string): Promise<void>;
  saveRun(report: ImportRunReport): Promise<void>;
  listRuns(): Promise<ImportRunReport[]>;
}
