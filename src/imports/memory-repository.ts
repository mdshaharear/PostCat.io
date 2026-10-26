import type { ImportedCatalogRecord, ImportPlan, ImportPlanSummary, ImportRepository, ImportRunReport } from "./types.ts";

const emptySummary = (): ImportPlanSummary => ({ create: 0, update: 0, archive: 0, noop: 0, rejected: 0 });

export class MemoryImportRepository implements ImportRepository {
  private records = new Map<string, ImportedCatalogRecord>();
  private runs: ImportRunReport[] = [];
  private leases = new Map<string, string>();
  private readonly failAfterOperations?: number;
  private readonly failureMessage: string;

  constructor(options: { initialRecords?: readonly ImportedCatalogRecord[]; failAfterOperations?: number; failureMessage?: string } = {}) {
    for (const record of options.initialRecords ?? []) this.records.set(record.identityKey, structuredClone(record));
    this.failAfterOperations = options.failAfterOperations;
    this.failureMessage = options.failureMessage ?? "simulated apply failure";
  }

  async acquireLease(sourceId: string, runId: string): Promise<boolean> {
    if (this.leases.has(sourceId)) return false;
    this.leases.set(sourceId, runId);
    return true;
  }

  async releaseLease(sourceId: string, runId: string): Promise<void> {
    if (this.leases.get(sourceId) === runId) this.leases.delete(sourceId);
  }

  async listActive(sourceId: string): Promise<ImportedCatalogRecord[]> {
    return [...this.records.values()].filter((record) => record.sourceId === sourceId && record.status === "active").map((record) => structuredClone(record));
  }

  async listAll(sourceId: string): Promise<ImportedCatalogRecord[]> {
    return [...this.records.values()].filter((record) => record.sourceId === sourceId).map((record) => structuredClone(record));
  }

  private applyTo(records: Map<string, ImportedCatalogRecord>, plan: ImportPlan, appliedAt: string): ImportPlanSummary {
    const applied = emptySummary();
    let completed = 0;
    for (const operation of plan.operations) {
      if (this.failAfterOperations !== undefined && completed >= this.failAfterOperations) throw new Error(this.failureMessage);
      if (operation.kind === "create") {
        records.set(operation.identityKey, { identityKey: operation.identityKey, sourceId: operation.record.sourceId, externalOfferId: operation.record.externalOfferId, fingerprint: operation.fingerprint, record: structuredClone(operation.record), status: "active", firstSeenAt: operation.record.observedAt, lastSeenAt: operation.record.observedAt });
      } else if (operation.kind === "update") {
        records.set(operation.identityKey, { ...structuredClone(operation.previous), fingerprint: operation.fingerprint, record: structuredClone(operation.record), status: "active", lastSeenAt: operation.record.observedAt, archivedAt: undefined });
      } else if (operation.kind === "archive") {
        records.set(operation.identityKey, { ...structuredClone(operation.previous), status: "archived", archivedAt: appliedAt });
      } else if (operation.record && operation.previous && Date.parse(operation.record.observedAt) > Date.parse(operation.previous.lastSeenAt)) {
        records.set(operation.identityKey, { ...structuredClone(operation.previous), lastSeenAt: operation.record.observedAt });
      }
      applied[operation.kind] += 1;
      completed += 1;
    }
    return applied;
  }

  async applyPlan(plan: ImportPlan, appliedAt: string): Promise<ImportPlanSummary> {
    const next = new Map([...this.records].map(([key, value]) => [key, structuredClone(value)]));
    const applied = this.applyTo(next, plan, appliedAt);
    this.records = next;
    return applied;
  }

  async commitRun(plan: ImportPlan, report: ImportRunReport, appliedAt: string): Promise<void> {
    const nextRecords = new Map([...this.records].map(([key, value]) => [key, structuredClone(value)]));
    const nextRuns = structuredClone(this.runs);
    this.applyTo(nextRecords, plan, appliedAt);
    nextRuns.push(structuredClone(report));
    this.records = nextRecords;
    this.runs = nextRuns;
  }

  async saveRun(report: ImportRunReport): Promise<void> { this.runs.push(structuredClone(report)); }
  async listRuns(): Promise<ImportRunReport[]> { return structuredClone(this.runs); }
}
