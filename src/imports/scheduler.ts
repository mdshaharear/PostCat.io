import type { ImportJob } from "./types.ts";

export function validateImportJob(job: ImportJob): string[] {
  const errors: string[] = [];
  if (!job.sourceId.trim()) errors.push("sourceId is required");
  if (!Number.isInteger(job.intervalMinutes) || job.intervalMinutes < 5) errors.push("intervalMinutes must be an integer of at least 5");
  if (Number.isNaN(Date.parse(job.nextRunAt))) errors.push("nextRunAt must be a valid timestamp");
  return errors;
}

export function getDueImportJobs(jobs: readonly ImportJob[], now = new Date()): ImportJob[] {
  return jobs.filter((job) => job.enabled && validateImportJob(job).length === 0 && Date.parse(job.nextRunAt) <= now.getTime()).sort((a, b) => Date.parse(a.nextRunAt) - Date.parse(b.nextRunAt));
}

export function nextImportRunAt(job: ImportJob, from = new Date()): Date {
  const errors = validateImportJob(job);
  if (errors.length) throw new Error(`Invalid import job: ${errors.join(", ")}`);
  const intervalMs = job.intervalMinutes * 60_000;
  let nextTime = Date.parse(job.nextRunAt) + intervalMs;
  while (nextTime <= from.getTime()) nextTime += intervalMs;
  return new Date(nextTime);
}
