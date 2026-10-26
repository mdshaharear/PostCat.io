import { randomUUID } from "node:crypto";
import { buildImportPlan } from "./engine.ts";
import { validateFeedRecord } from "./validation.ts";
import type { ImportMode, ImportPlanSummary, ImportRepository, ImportRunError, ImportRunReport, NormalizedFeedRecord } from "./types.ts";
import { getImportSource } from "./source-registry.ts";

const emptySummary = (): ImportPlanSummary => ({ create: 0, update: 0, archive: 0, noop: 0, rejected: 0 });

export interface RunCatalogImportCommand {
  sourceId: string;
  mode: ImportMode;
  dryRun: boolean;
  rawRecords: readonly unknown[];
  snapshotComplete?: boolean;
  maxMissingRatio?: number;
}

export interface RunCatalogImportDependencies {
  repository: ImportRepository;
  now?: () => Date;
  createRunId?: () => string;
}

export class ImportRunFailure extends Error {
  readonly report: ImportRunReport;

  constructor(report: ImportRunReport, options?: ErrorOptions) {
    super("Import run failed", options);
    this.name = "ImportRunFailure";
    this.report = report;
  }
}

export async function runCatalogImport(command: RunCatalogImportCommand, dependencies: RunCatalogImportDependencies): Promise<ImportRunReport> {
  if (!command.sourceId.trim()) throw new Error("sourceId is required");
  const source = getImportSource(command.sourceId);
  if (!source?.enabled) throw new Error(`import source ${command.sourceId} is not authorized or enabled`);
  const now = dependencies.now ?? (() => new Date());
  const runId = dependencies.createRunId?.() ?? randomUUID();
  const started = now();
  if (!await dependencies.repository.acquireLease(command.sourceId, runId)) throw new Error(`import source ${command.sourceId} is already running`);

  const accepted: NormalizedFeedRecord[] = [];
  let planned = emptySummary();
  try {
    const errors: ImportRunError[] = [];
    for (const rawRecord of command.rawRecords) {
      const result = validateFeedRecord(rawRecord);
      if (!result.ok) {
        for (const error of result.errors) errors.push({ code: "VALIDATION_FAILED", path: error.path, message: error.message });
        continue;
      }
      if (result.value.sourceId !== command.sourceId) {
        errors.push({ code: "SOURCE_MISMATCH", path: "sourceId", message: "record source does not match the configured import source" });
        continue;
      }
      if (result.value.operation === "upsert" && !source.allowedCurrencies.includes(result.value.currency ?? "")) {
        errors.push({ code: "CURRENCY_NOT_ALLOWED", path: "currency", message: "record currency is not allowed for this source" });
        continue;
      }
      if (result.value.affiliateUrl && !source.allowedAffiliateHosts.includes(new URL(result.value.affiliateUrl).hostname)) {
        errors.push({ code: "AFFILIATE_HOST_NOT_ALLOWED", path: "affiliateUrl", message: "affiliate URL host is not allowed for this source" });
        continue;
      }
      if (result.value.imageUrls?.some((url) => !source.allowedImageHosts.includes(new URL(url).hostname))) {
        errors.push({ code: "IMAGE_HOST_NOT_ALLOWED", path: "imageUrls", message: "an image URL host is not allowed for this source" });
        continue;
      }
      accepted.push(result.value);
    }

    if (errors.length) {
      const finished = now();
      const report: ImportRunReport = { schemaVersion: 1, runId, sourceId: command.sourceId, mode: command.mode, dryRun: command.dryRun, status: "rejected", received: command.rawRecords.length, accepted: accepted.length, rejected: command.rawRecords.length - accepted.length, planned, applied: emptySummary(), errors, startedAt: started.toISOString(), finishedAt: finished.toISOString(), durationMs: Math.max(0, finished.getTime() - started.getTime()) };
      await dependencies.repository.saveRun(report);
      return report;
    }

    const existing = await dependencies.repository.listActive(command.sourceId);
    const maxMissingRatio = Math.min(command.maxMissingRatio ?? source.maxMissingRatio, source.maxMissingRatio);
    const plan = buildImportPlan({ sourceId: command.sourceId, mode: command.mode, records: accepted, existing, snapshotComplete: command.snapshotComplete, maxMissingRatio });
    planned = plan.summary;
    const finished = now();
    const applied = command.dryRun ? emptySummary() : { ...plan.summary };
    const report: ImportRunReport = { schemaVersion: 1, runId, sourceId: command.sourceId, mode: command.mode, dryRun: command.dryRun, status: "succeeded", received: command.rawRecords.length, accepted: accepted.length, rejected: 0, planned, applied, errors: [], startedAt: started.toISOString(), finishedAt: finished.toISOString(), durationMs: Math.max(0, finished.getTime() - started.getTime()) };
    if (command.dryRun) await dependencies.repository.saveRun(report);
    else await dependencies.repository.commitRun(plan, report, finished.toISOString());
    return report;
  } catch (error) {
    const finished = now();
    const report: ImportRunReport = { schemaVersion: 1, runId, sourceId: command.sourceId, mode: command.mode, dryRun: command.dryRun, status: "failed", received: command.rawRecords.length, accepted: accepted.length, rejected: 0, planned, applied: emptySummary(), errors: [{ code: "IMPORT_FAILED", message: "The import could not be applied atomically." }], startedAt: started.toISOString(), finishedAt: finished.toISOString(), durationMs: Math.max(0, finished.getTime() - started.getTime()) };
    await dependencies.repository.saveRun(report);
    throw new ImportRunFailure(report, { cause: error });
  } finally {
    await dependencies.repository.releaseLease(command.sourceId, runId);
  }
}
