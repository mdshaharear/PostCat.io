export function parseJsonFeed(text: string, maxBytes = 10_000_000): unknown[] {
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new Error(`JSON feed exceeds ${maxBytes} byte limit`);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("feed must contain valid JSON"); }
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown }).records)) return (parsed as { records: unknown[] }).records;
  throw new Error("JSON feed must be an array or records envelope");
}
