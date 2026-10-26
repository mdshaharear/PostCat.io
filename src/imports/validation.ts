import type { FeedValidationError, FeedValidationResult, ImportAvailability, NormalizedFeedRecord } from "./types.ts";

const availabilityValues = new Set<ImportAvailability>(["in_stock", "limited", "out_of_stock", "unknown"]);
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nonBlank = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const addRequiredString = (input: Record<string, unknown>, path: string, errors: FeedValidationError[], maxLength = 128) => {
  const value = input[path];
  if (!nonBlank(value)) errors.push({ path, message: `${path} is required` });
  else if (value.length > maxLength) errors.push({ path, message: `${path} must be at most ${maxLength} characters` });
};
const isHttpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === "https:" && !url.username && !url.password && (url.port === "" || url.port === "443");
  } catch { return false; }
};
const isRfc3339 = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText);
  const hour = Number(hourText); const minute = Number(minuteText); const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText);
  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day >= 1 && day <= daysInMonth && Number.isFinite(Date.parse(value));
};

export function validateFeedRecord(input: unknown): FeedValidationResult {
  if (!isObject(input)) return { ok: false, errors: [{ path: "$", message: "record must be an object" }] };
  const errors: FeedValidationError[] = [];
  for (const field of ["sourceId", "externalProductId", "externalVariantId", "externalOfferId"]) addRequiredString(input, field, errors);
  addRequiredString(input, "observedAt", errors, 40);
  if (input.operation !== "upsert" && input.operation !== "delete") errors.push({ path: "operation", message: "operation must be upsert or delete" });
  if (nonBlank(input.observedAt) && !isRfc3339(input.observedAt)) errors.push({ path: "observedAt", message: "observedAt must be an RFC 3339 timestamp" });

  if (input.operation === "upsert") {
    addRequiredString(input, "title", errors, 300);
    addRequiredString(input, "description", errors, 5000);
    addRequiredString(input, "brandName", errors, 200);
    addRequiredString(input, "categorySlug", errors, 128);
    addRequiredString(input, "variantLabel", errors, 200);
    addRequiredString(input, "merchantName", errors, 200);
    addRequiredString(input, "currency", errors, 3);
    addRequiredString(input, "affiliateUrl", errors, 2048);
    if (!Number.isSafeInteger(input.priceAmountMinor) || (input.priceAmountMinor as number) < 0) errors.push({ path: "priceAmountMinor", message: "priceAmountMinor must be a non-negative safe integer" });
    if (nonBlank(input.currency) && !/^[A-Z]{3}$/.test(input.currency)) errors.push({ path: "currency", message: "currency must be a three-letter uppercase code" });
    if (!availabilityValues.has(input.availability as ImportAvailability)) errors.push({ path: "availability", message: "availability is unsupported" });
    if (nonBlank(input.affiliateUrl) && !isHttpsUrl(input.affiliateUrl)) errors.push({ path: "affiliateUrl", message: "affiliateUrl must be an HTTPS URL of at most 2048 characters" });
    if (!isObject(input.variantAttributes)) errors.push({ path: "variantAttributes", message: "variantAttributes must be an object" });
    else {
      const entries = Object.entries(input.variantAttributes);
      if (entries.length > 50) errors.push({ path: "variantAttributes", message: "variantAttributes must contain at most 50 entries" });
      for (const [key, value] of entries) if (!nonBlank(key) || key.length > 100 || !nonBlank(value) || value.length > 500) errors.push({ path: `variantAttributes.${key}`, message: "attribute keys and values must be bounded non-blank strings" });
    }
    if (!Array.isArray(input.imageUrls) || input.imageUrls.length === 0) errors.push({ path: "imageUrls", message: "at least one image URL is required" });
    else {
      if (input.imageUrls.length > 12) errors.push({ path: "imageUrls", message: "imageUrls must contain at most 12 entries" });
      input.imageUrls.forEach((url, index) => { if (!nonBlank(url) || !isHttpsUrl(url)) errors.push({ path: `imageUrls.${index}`, message: "image URL must be a bounded HTTPS URL" }); });
    }
    if (input.identifiers !== undefined) {
      if (!isObject(input.identifiers)) errors.push({ path: "identifiers", message: "identifiers must be an object" });
      else {
        for (const key of ["gtin", "mpn"] as const) {
          const value = input.identifiers[key];
          if (value !== undefined && (!nonBlank(value) || value.length > 64)) errors.push({ path: `identifiers.${key}`, message: `${key} must be a bounded non-blank string` });
        }
        if (nonBlank(input.identifiers.gtin) && !/^\d{8,14}$/.test(input.identifiers.gtin)) errors.push({ path: "identifiers.gtin", message: "gtin must contain 8 to 14 digits" });
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  const common = {
    sourceId: input.sourceId as string,
    externalProductId: input.externalProductId as string,
    externalVariantId: input.externalVariantId as string,
    externalOfferId: input.externalOfferId as string,
    operation: input.operation as "upsert" | "delete",
    observedAt: new Date(input.observedAt as string).toISOString(),
  };
  if (input.operation === "delete") return { ok: true, value: common };
  const identifiers = isObject(input.identifiers) ? { ...(nonBlank(input.identifiers.gtin) ? { gtin: input.identifiers.gtin } : {}), ...(nonBlank(input.identifiers.mpn) ? { mpn: input.identifiers.mpn } : {}) } : undefined;
  const value: NormalizedFeedRecord = {
    ...common,
    operation: "upsert",
    title: input.title as string,
    description: input.description as string,
    brandName: input.brandName as string,
    categorySlug: input.categorySlug as string,
    variantLabel: input.variantLabel as string,
    variantAttributes: { ...(input.variantAttributes as Record<string, string>) },
    merchantName: input.merchantName as string,
    priceAmountMinor: input.priceAmountMinor as number,
    currency: input.currency as string,
    availability: input.availability as ImportAvailability,
    affiliateUrl: input.affiliateUrl as string,
    imageUrls: [...(input.imageUrls as string[])],
    ...(identifiers && Object.keys(identifiers).length ? { identifiers } : {}),
  };
  return { ok: true, value };
}
