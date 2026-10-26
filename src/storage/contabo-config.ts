export const CONTABO_S3_ENDPOINTS = [
  "https://eu2.contabostorage.com",
  "https://usc1.contabostorage.com",
  "https://sin1.contabostorage.com",
] as const;

export type ContaboStorageEnvironment = Record<string, string | undefined>;

export type ContaboStorageConfig = {
  endpoint: (typeof CONTABO_S3_ENDPOINTS)[number];
  region: string;
  forcePathStyle: true;
  accessKeyId: string;
  secretAccessKey: string;
  privateBucket: string;
  publicBucket?: string;
  publicBaseUrl?: string;
  signedGetTtlSeconds: number;
  signedPutTtlSeconds: number;
  maxUploadBytes: number;
};

function required(env: ContaboStorageEnvironment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function integer(env: ContaboStorageEnvironment, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function validateBucket(value: string, name: string): string {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(value)) {
    throw new Error(`${name} must use 3-63 lowercase letters, digits, or hyphens`);
  }
  return value;
}

function optionalHttpsOrigin(value: string | undefined, name: string): string | undefined {
  if (!value?.trim()) return undefined;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be a credential-free HTTPS origin`);
  }
  return url.origin;
}

export function parseContaboStorageConfig(env: ContaboStorageEnvironment): ContaboStorageConfig {
  const endpoint = required(env, "CONTABO_S3_ENDPOINT");
  if (!CONTABO_S3_ENDPOINTS.includes(endpoint as (typeof CONTABO_S3_ENDPOINTS)[number])) {
    throw new Error("CONTABO_S3_ENDPOINT must be an approved Contabo endpoint");
  }

  const publicBucketValue = env.CONTABO_S3_PUBLIC_BUCKET?.trim();
  const publicBaseUrl = optionalHttpsOrigin(env.MEDIA_PUBLIC_BASE_URL, "MEDIA_PUBLIC_BASE_URL");
  if (Boolean(publicBucketValue) !== Boolean(publicBaseUrl)) {
    throw new Error("CONTABO_S3_PUBLIC_BUCKET and MEDIA_PUBLIC_BASE_URL must be configured together");
  }
  return {
    endpoint: endpoint as ContaboStorageConfig["endpoint"],
    region: env.CONTABO_S3_REGION?.trim() || "default",
    forcePathStyle: true,
    accessKeyId: required(env, "CONTABO_S3_ACCESS_KEY_ID"),
    secretAccessKey: required(env, "CONTABO_S3_SECRET_ACCESS_KEY"),
    privateBucket: validateBucket(required(env, "CONTABO_S3_PRIVATE_BUCKET"), "CONTABO_S3_PRIVATE_BUCKET"),
    publicBucket: publicBucketValue ? validateBucket(publicBucketValue, "CONTABO_S3_PUBLIC_BUCKET") : undefined,
    publicBaseUrl,
    signedGetTtlSeconds: integer(env, "CONTABO_S3_SIGNED_GET_TTL_SECONDS", 300, 30, 3600),
    signedPutTtlSeconds: integer(env, "CONTABO_S3_SIGNED_PUT_TTL_SECONDS", 120, 30, 600),
    maxUploadBytes: integer(env, "CONTABO_S3_MAX_UPLOAD_BYTES", 10_485_760, 1, 100 * 1024 * 1024),
  };
}

const MEDIA_KEY_PATTERN = /^media\/[A-Za-z0-9_-]{8,80}\/[a-f0-9]{64}\/[a-z0-9][a-z0-9-]{0,63}\.[a-z0-9]{2,8}$/;

export function validateMediaObjectKey(key: string): boolean {
  return MEDIA_KEY_PATTERN.test(key) && !key.includes("..") && !key.includes("\\") && !/[\u0000-\u001f\u007f]/.test(key);
}

export type PrivateUploadPolicy = {
  key: string;
  sha256: string;
  checksumSha256Base64: string;
  contentType: string;
  contentLength: number;
};

export function mediaObjectSha256(key: string): string {
  if (!validateMediaObjectKey(key)) throw new Error("media object key is invalid");
  const sha256 = key.split("/")[2];
  if (!sha256) throw new Error("media object key hash is missing");
  return sha256;
}

export function buildPrivateUploadPolicy(
  input: { key: string; contentType: string; contentLength: number },
  maxUploadBytes: number,
): PrivateUploadPolicy {
  if (!/^image\/(?:avif|jpeg|png|webp)$/.test(input.contentType)) {
    throw new Error("contentType is not an approved image MIME type");
  }
  if (!Number.isSafeInteger(input.contentLength) || input.contentLength < 1 || input.contentLength > maxUploadBytes) {
    throw new Error("contentLength exceeds the configured upload limit");
  }
  const sha256 = mediaObjectSha256(input.key);
  return {
    key: input.key,
    sha256,
    checksumSha256Base64: Buffer.from(sha256, "hex").toString("base64"),
    contentType: input.contentType,
    contentLength: input.contentLength,
  };
}

export function verifyPrivateObjectMetadata(
  expected: { key: string; contentType: string; contentLength: number },
  actual: { contentType?: string; contentLength?: number; checksumSha256Base64?: string },
): PrivateUploadPolicy {
  const expectedPolicy = buildPrivateUploadPolicy(expected, expected.contentLength);
  if (actual.contentLength !== expectedPolicy.contentLength) throw new Error("uploaded object length does not match the signed upload");
  if (actual.contentType !== expectedPolicy.contentType) throw new Error("uploaded object type does not match the signed upload");
  if (actual.checksumSha256Base64 !== expectedPolicy.checksumSha256Base64) {
    throw new Error("uploaded object payload checksum does not match the immutable key");
  }
  return expectedPolicy;
}

export function buildMediaObjectKey(input: { assetId: string; sha256: string; variant: string; extension: string }): string {
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(input.assetId)) throw new Error("assetId is invalid");
  if (!/^[a-f0-9]{64}$/.test(input.sha256)) throw new Error("sha256 is invalid");
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(input.variant)) throw new Error("variant is invalid");
  if (!/^[a-z0-9]{2,8}$/.test(input.extension)) throw new Error("extension is invalid");
  const key = `media/${input.assetId}/${input.sha256}/${input.variant}.${input.extension}`;
  if (!validateMediaObjectKey(key)) throw new Error("generated media object key is invalid");
  return key;
}
