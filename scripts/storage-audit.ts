import {
  GetBucketLifecycleConfigurationCommand,
  GetBucketVersioningCommand,
  GetObjectLockConfigurationCommand,
  HeadBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { parseContaboStorageConfig } from "../src/storage/contabo-config.ts";

if (process.env.CONTABO_S3_AUDIT !== "1") {
  console.error("Set CONTABO_S3_AUDIT=1 to run the read-only Contabo bucket audit.");
  process.exit(2);
}

const config = parseContaboStorageConfig(process.env);
const client = new S3Client({
  endpoint: config.endpoint,
  region: config.region,
  forcePathStyle: true,
  credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
});

async function optional<T>(operation: () => Promise<T>): Promise<T | { status: "not-configured" }> {
  try {
    return await operation();
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    if (["NoSuchLifecycleConfiguration", "ObjectLockConfigurationNotFoundError", "NoSuchConfiguration"].includes(name)) {
      return { status: "not-configured" };
    }
    throw error;
  }
}

try {
  await client.send(new HeadBucketCommand({ Bucket: config.privateBucket }));
  const [versioning, lifecycle, objectLock] = await Promise.all([
    optional(() => client.send(new GetBucketVersioningCommand({ Bucket: config.privateBucket }))),
    optional(() => client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: config.privateBucket }))),
    optional(() => client.send(new GetObjectLockConfigurationCommand({ Bucket: config.privateBucket }))),
  ]);
  console.log(JSON.stringify({
    status: "reachable",
    endpoint: config.endpoint,
    bucket: config.privateBucket,
    versioning,
    lifecycle,
    objectLock,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    status: "failed",
    error: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message.replace(/[A-Za-z0-9+/=_-]{20,}/g, "[REDACTED]") : "Bucket audit failed",
  }));
  process.exitCode = 1;
} finally {
  client.destroy();
}
