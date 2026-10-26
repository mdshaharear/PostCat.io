import { parseContaboStorageConfig } from "../src/storage/contabo-config.ts";

try {
  const config = parseContaboStorageConfig(process.env);
  console.log(JSON.stringify({
    status: "ok",
    endpoint: config.endpoint,
    region: config.region,
    privateBucket: config.privateBucket,
    publicBucketConfigured: Boolean(config.publicBucket),
    publicBaseUrlConfigured: Boolean(config.publicBaseUrl),
    signedGetTtlSeconds: config.signedGetTtlSeconds,
    signedPutTtlSeconds: config.signedPutTtlSeconds,
    maxUploadBytes: config.maxUploadBytes,
    forcePathStyle: config.forcePathStyle,
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Object Storage configuration is invalid");
  process.exitCode = 1;
}
