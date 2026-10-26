import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { MemoryImportRepository } from "./memory-repository.ts";
import { parseJsonFeed } from "./json-adapter.ts";
import { runCatalogImport } from "./runner.ts";
import type { ImportMode } from "./types.ts";

interface CliOptions { sourceId: string; file: string; mode: ImportMode; snapshotComplete: boolean; maxMissingRatio?: number }

function parseArgs(args: readonly string[]): CliOptions {
  const value = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
  const sourceId = value("--source");
  const file = value("--file");
  const modeValue = value("--mode") ?? "incremental";
  if (!sourceId) throw new Error("--source is required");
  if (!file) throw new Error("--file is required");
  if (modeValue !== "full" && modeValue !== "incremental") throw new Error("--mode must be full or incremental");
  const ratioText = value("--max-missing-ratio");
  const maxMissingRatio = ratioText === undefined ? undefined : Number(ratioText);
  if (maxMissingRatio !== undefined && !Number.isFinite(maxMissingRatio)) throw new Error("--max-missing-ratio must be numeric");
  return { sourceId, file, mode: modeValue, snapshotComplete: args.includes("--snapshot-complete"), maxMissingRatio };
}

export async function runDryRunCli(args = process.argv.slice(2)): Promise<number> {
  try {
    const options = parseArgs(args);
    const rawRecords = parseJsonFeed(await readFile(options.file, "utf8"));
    const report = await runCatalogImport({ sourceId: options.sourceId, mode: options.mode, dryRun: true, rawRecords, snapshotComplete: options.snapshotComplete, maxMissingRatio: options.maxMissingRatio }, { repository: new MemoryImportRepository() });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.status === "succeeded" ? 0 : 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown CLI failure";
    process.stderr.write(`${JSON.stringify({ status: "failed", error: message })}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await runDryRunCli();
