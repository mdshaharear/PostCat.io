import type { Pool, PoolClient } from "pg";
import type { ImportedCatalogRecord, ImportPlan, ImportPlanOperation, ImportPlanSummary, ImportRepository, ImportRunReport, NormalizedFeedRecord } from "./types.ts";

const emptySummary = (): ImportPlanSummary => ({ create: 0, update: 0, archive: 0, noop: 0, rejected: 0 });

interface Queryable {
  query(text: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
}

function toImported(row: Record<string, unknown>): ImportedCatalogRecord {
  return {
    identityKey: String(row.identity_key),
    sourceId: String(row.source_id),
    externalOfferId: String(row.external_offer_id),
    fingerprint: String(row.fingerprint),
    record: row.normalized_record as unknown as NormalizedFeedRecord,
    status: row.status as "active" | "archived",
    firstSeenAt: new Date(String(row.first_seen_at)).toISOString(),
    lastSeenAt: new Date(String(row.last_seen_at)).toISOString(),
    archivedAt: row.archived_at ? new Date(String(row.archived_at)).toISOString() : undefined,
  };
}

async function writeUpsert(client: Queryable, operation: Extract<ImportPlanOperation, { kind: "create" | "update" }>): Promise<void> {
  const { record } = operation;
  await client.query(
    `INSERT INTO catalog_source_records (
      identity_key, source_id, external_product_id, external_variant_id, external_offer_id,
      fingerprint, normalized_record, status, first_seen_at, last_seen_at, archived_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'active',$8,$8,NULL)
    ON CONFLICT (identity_key) DO UPDATE SET
      external_product_id = EXCLUDED.external_product_id,
      external_variant_id = EXCLUDED.external_variant_id,
      external_offer_id = EXCLUDED.external_offer_id,
      fingerprint = EXCLUDED.fingerprint,
      normalized_record = EXCLUDED.normalized_record,
      status = 'active',
      last_seen_at = EXCLUDED.last_seen_at,
      archived_at = NULL,
      updated_at = now()`,
    [operation.identityKey, record.sourceId, record.externalProductId, record.externalVariantId, record.externalOfferId, operation.fingerprint, JSON.stringify(record), record.observedAt],
  );
}

async function applyOperations(client: Queryable, plan: ImportPlan, appliedAt: string): Promise<ImportPlanSummary> {
  const applied = emptySummary();
  for (const operation of plan.operations) {
    if (operation.kind === "create" || operation.kind === "update") {
      await writeUpsert(client, operation);
    } else if (operation.kind === "archive") {
      await client.query(
        `UPDATE catalog_source_records
         SET status = 'archived', archived_at = $2, updated_at = now()
         WHERE identity_key = $1`,
        [operation.identityKey, appliedAt],
      );
    } else if (operation.record && operation.previous && Date.parse(operation.record.observedAt) > Date.parse(operation.previous.lastSeenAt)) {
      await client.query(
        `UPDATE catalog_source_records
         SET last_seen_at = $2, normalized_record = $3::jsonb, updated_at = now()
         WHERE identity_key = $1 AND last_seen_at < $2`,
        [operation.identityKey, operation.record.observedAt, JSON.stringify(operation.record)],
      );
    }
    applied[operation.kind] += 1;
  }
  return applied;
}

export class PostgresImportRepository implements ImportRepository {
  private readonly leaseClients = new Map<string, PoolClient>();
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async acquireLease(sourceId: string, runId: string): Promise<boolean> {
    if (this.leaseClients.has(sourceId)) return false;
    const client = await this.pool.connect();
    try {
      const result = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired", [`postcat-import:${sourceId}`]);
      if (!result.rows[0]?.acquired) {
        client.release();
        return false;
      }
      this.leaseClients.set(`${sourceId}:${runId}`, client);
      this.leaseClients.set(sourceId, client);
      return true;
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async releaseLease(sourceId: string, runId: string): Promise<void> {
    const key = `${sourceId}:${runId}`;
    const client = this.leaseClients.get(key);
    if (!client) return;
    try {
      await client.query("SELECT pg_advisory_unlock(hashtextextended($1, 0))", [`postcat-import:${sourceId}`]);
    } finally {
      client.release();
      this.leaseClients.delete(key);
      if (this.leaseClients.get(sourceId) === client) this.leaseClients.delete(sourceId);
    }
  }

  async listActive(sourceId: string): Promise<ImportedCatalogRecord[]> {
    const result = await this.pool.query(
      `SELECT identity_key, source_id, external_offer_id, fingerprint, normalized_record,
              status, first_seen_at, last_seen_at, archived_at
       FROM catalog_source_records
       WHERE source_id = $1 AND status = 'active'
       ORDER BY identity_key`,
      [sourceId],
    );
    return result.rows.map((row) => toImported(row));
  }

  async applyPlan(plan: ImportPlan, appliedAt: string): Promise<ImportPlanSummary> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const applied = await applyOperations(client, plan, appliedAt);
      await client.query("COMMIT");
      return applied;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async commitRun(plan: ImportPlan, report: ImportRunReport, appliedAt: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await this.insertRun(client, report);
      await applyOperations(client, plan, appliedAt);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async saveRun(report: ImportRunReport): Promise<void> {
    await this.insertRun(this.pool, report);
  }

  private async insertRun(client: Queryable, report: ImportRunReport): Promise<void> {
    await client.query(
      `INSERT INTO catalog_import_runs (
        run_id, source_id, mode, dry_run, status, report, started_at, finished_at
      ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
      [report.runId, report.sourceId, report.mode, report.dryRun, report.status, JSON.stringify(report), report.startedAt, report.finishedAt],
    );
  }

  async listRuns(): Promise<ImportRunReport[]> {
    const result = await this.pool.query("SELECT report FROM catalog_import_runs ORDER BY started_at, run_id");
    return result.rows.map((row) => row.report as unknown as ImportRunReport);
  }
}
