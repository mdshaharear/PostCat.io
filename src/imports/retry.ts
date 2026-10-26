export type ImportErrorClass = "permanent" | "authentication" | "authorization" | "conflict" | "rate_limit" | "transient" | "unknown";

export function classifyImportError(error: { status?: number; code?: string }): ImportErrorClass {
  if (error.status === 401) return "authentication";
  if (error.status === 403) return "authorization";
  if (error.status === 409) return "conflict";
  if (error.status === 429) return "rate_limit";
  if (error.status !== undefined && error.status >= 400 && error.status < 500) return "permanent";
  if (error.status !== undefined && error.status >= 500) return "transient";
  if (["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(error.code ?? "")) return "transient";
  return "unknown";
}

export interface RetryDelayInput {
  attempt: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryAfterMs?: number;
  jitter?: number;
}

export function computeRetryDelayMs(input: RetryDelayInput): number {
  if (!Number.isInteger(input.attempt) || input.attempt < 1) throw new Error("attempt must be a positive integer");
  if (!Number.isFinite(input.baseDelayMs) || input.baseDelayMs < 0) throw new Error("baseDelayMs must be a finite non-negative number");
  if (!Number.isFinite(input.maxDelayMs) || input.maxDelayMs < input.baseDelayMs) throw new Error("maxDelayMs must be finite and at least baseDelayMs");
  if (input.retryAfterMs !== undefined && (!Number.isFinite(input.retryAfterMs) || input.retryAfterMs < 0)) throw new Error("retryAfterMs must be a finite non-negative number");
  const jitter = input.jitter ?? 0.2;
  if (!Number.isFinite(jitter) || jitter < 0 || jitter > 1) throw new Error("jitter must be a finite number between 0 and 1");
  const exponential = Math.min(input.maxDelayMs, input.baseDelayMs * 2 ** (input.attempt - 1));
  const requested = input.retryAfterMs === undefined ? exponential : Math.min(input.maxDelayMs, Math.max(exponential, input.retryAfterMs));
  return Math.round(requested * (1 - jitter * Math.random()));
}

export function shouldRetryImport(errorClass: ImportErrorClass, attempt: number, maxAttempts: number): boolean {
  return attempt < maxAttempts && (errorClass === "rate_limit" || errorClass === "transient" || errorClass === "unknown");
}
