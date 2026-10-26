const secretKey = /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api[-_]?key|password|passwd|token|access[-_]?token|secret|signature)$/i;
const secretQueryKey = /^(token|access_token|api_key|key|secret|signature)$/i;

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (secretQueryKey.test(key)) url.searchParams.set(key, "[REDACTED]");
    url.username = "";
    url.password = "";
    return url.toString();
  } catch { return value; }
}

export function redactSecrets(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? redactUrl(value) : value;
  if (Array.isArray(value)) {
    if (seen.has(value)) return "[CIRCULAR]";
    const output: unknown[] = [];
    seen.set(value, output);
    for (const item of value) output.push(redactSecrets(item, seen));
    return output;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    const output: Record<string, unknown> = {};
    seen.set(value, output);
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) output[key] = secretKey.test(key) ? "[REDACTED]" : redactSecrets(item, seen);
    return output;
  }
  return value;
}
