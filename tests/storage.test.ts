import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMediaObjectKey,
  buildPrivateUploadPolicy,
  parseContaboStorageConfig,
  validateMediaObjectKey,
  verifyPrivateObjectMetadata,
} from "../src/storage/contabo-config.ts";
import { createContaboStorageCore } from "../src/storage/contabo-s3-core.ts";

const validEnv = {
  CONTABO_S3_ENDPOINT: "https://sin1.contabostorage.com",
  CONTABO_S3_REGION: "default",
  CONTABO_S3_ACCESS_KEY_ID: "test-access-key",
  CONTABO_S3_SECRET_ACCESS_KEY: "test-secret-key",
  CONTABO_S3_PRIVATE_BUCKET: "postcat-prod-media-private-a1b2c3",
  CONTABO_S3_SIGNED_GET_TTL_SECONDS: "300",
  CONTABO_S3_SIGNED_PUT_TTL_SECONDS: "120",
  CONTABO_S3_MAX_UPLOAD_BYTES: "10485760",
};

test("Contabo storage config is server-only, allowlisted and path-style", () => {
  const config = parseContaboStorageConfig(validEnv);
  assert.equal(config.endpoint, "https://sin1.contabostorage.com");
  assert.equal(config.region, "default");
  assert.equal(config.forcePathStyle, true);
  assert.equal(config.privateBucket, "postcat-prod-media-private-a1b2c3");
  assert.equal(config.signedGetTtlSeconds, 300);
  assert.equal(config.signedPutTtlSeconds, 120);
  assert.equal(config.maxUploadBytes, 10_485_760);
});

test("Contabo storage config rejects missing secrets and unknown or insecure endpoints", () => {
  assert.throws(() => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_SECRET_ACCESS_KEY: "" }), /CONTABO_S3_SECRET_ACCESS_KEY/);
  assert.throws(() => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_ENDPOINT: "http://sin1.contabostorage.com" }), /approved Contabo endpoint/);
  assert.throws(() => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_ENDPOINT: "https://example.com" }), /approved Contabo endpoint/);
});

test("Contabo storage config bounds signed URL TTLs and upload sizes", () => {
  assert.throws(() => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_SIGNED_GET_TTL_SECONDS: "3601" }), /SIGNED_GET/);
  assert.throws(() => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_SIGNED_PUT_TTL_SECONDS: "601" }), /SIGNED_PUT/);
  assert.throws(() => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_MAX_UPLOAD_BYTES: "0" }), /MAX_UPLOAD/);
});

test("public media bucket and base URL must be configured together", () => {
  assert.throws(
    () => parseContaboStorageConfig({ ...validEnv, CONTABO_S3_PUBLIC_BUCKET: "postcat-public-media" }),
    /configured together/,
  );
  assert.throws(
    () => parseContaboStorageConfig({ ...validEnv, MEDIA_PUBLIC_BASE_URL: "https://media.postcat.io" }),
    /configured together/,
  );

  const config = parseContaboStorageConfig({
    ...validEnv,
    CONTABO_S3_PUBLIC_BUCKET: "postcat-public-media",
    MEDIA_PUBLIC_BASE_URL: "https://media.postcat.io",
  });
  assert.equal(config.publicBucket, "postcat-public-media");
  assert.equal(config.publicBaseUrl, "https://media.postcat.io");
});

test("media object keys are immutable, content-hashed and traversal-safe", () => {
  const key = buildMediaObjectKey({ assetId: "01JABCDEF0123456789", sha256: "a".repeat(64), variant: "width-1280", extension: "webp" });
  assert.equal(key, `media/01JABCDEF0123456789/${"a".repeat(64)}/width-1280.webp`);
  assert.equal(validateMediaObjectKey(key), true);
  for (const unsafe of ["/media/a", "media/../secret", "media\\secret", "media/a\u0000/b", "products/123/main.jpg"]) {
    assert.equal(validateMediaObjectKey(unsafe), false, unsafe);
  }
  assert.throws(() => buildMediaObjectKey({ assetId: "../escape", sha256: "b".repeat(64), variant: "original", extension: "jpg" }), /assetId/);
});

test("private upload policy binds the immutable key hash and upload constraints", () => {
  const sha256 = "c".repeat(64);
  const key = buildMediaObjectKey({ assetId: "01JABCDEF0123456789", sha256, variant: "original", extension: "webp" });
  assert.deepEqual(
    buildPrivateUploadPolicy({ key, contentType: "image/webp", contentLength: 1024 }, 2048),
    {
      key,
      sha256,
      checksumSha256Base64: Buffer.from(sha256, "hex").toString("base64"),
      contentType: "image/webp",
      contentLength: 1024,
    },
  );
  assert.throws(() => buildPrivateUploadPolicy({ key, contentType: "image/svg+xml", contentLength: 1024 }, 2048), /MIME/);
  assert.throws(() => buildPrivateUploadPolicy({ key, contentType: "image/webp", contentLength: 2049 }, 2048), /upload limit/);
});

test("private object verification requires matching length, type and signed hash metadata", () => {
  const sha256 = "d".repeat(64);
  const key = buildMediaObjectKey({ assetId: "01JABCDEF0123456789", sha256, variant: "width-1280", extension: "avif" });
  assert.deepEqual(
    verifyPrivateObjectMetadata(
      { key, contentType: "image/avif", contentLength: 4096 },
      { contentType: "image/avif", contentLength: 4096, checksumSha256Base64: Buffer.from(sha256, "hex").toString("base64") },
    ),
    {
      key,
      sha256,
      checksumSha256Base64: Buffer.from(sha256, "hex").toString("base64"),
      contentType: "image/avif",
      contentLength: 4096,
    },
  );
  assert.throws(
    () => verifyPrivateObjectMetadata(
      { key, contentType: "image/avif", contentLength: 4096 },
      { contentType: "image/avif", contentLength: 4096, checksumSha256Base64: Buffer.from("e".repeat(64), "hex").toString("base64") },
    ),
    /payload checksum/,
  );
});

test("presigned private PUT binds the real SHA-256 checksum and no empty-body CRC32", async () => {
  const sha256 = "f".repeat(64);
  const key = buildMediaObjectKey({ assetId: "01JABCDEF0123456789", sha256, variant: "original", extension: "webp" });
  const storage = createContaboStorageCore(validEnv);
  try {
    const signed = new URL(await storage.signPrivatePut({ key, contentType: "image/webp", contentLength: 2048 }));
    assert.equal(signed.searchParams.get("x-amz-checksum-sha256"), Buffer.from(sha256, "hex").toString("base64"));
    assert.equal(signed.searchParams.has("x-amz-checksum-crc32"), false);
  } finally {
    storage.client.destroy();
  }
});
