import {
  ChecksumMode,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  buildPrivateUploadPolicy,
  parseContaboStorageConfig,
  validateMediaObjectKey,
  verifyPrivateObjectMetadata,
  type ContaboStorageEnvironment,
} from "./contabo-config.ts";

export function createContaboStorageCore(env: ContaboStorageEnvironment = process.env) {
  const config = parseContaboStorageConfig(env);
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  function requireKey(key: string): string {
    if (!validateMediaObjectKey(key)) throw new Error("media object key is invalid");
    return key;
  }

  return {
    config,
    client,
    async signPrivateGet(key: string): Promise<string> {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: config.privateBucket, Key: requireKey(key) }), {
        expiresIn: config.signedGetTtlSeconds,
      });
    },
    async signPrivatePut(input: { key: string; contentType: string; contentLength: number }): Promise<string> {
      const policy = buildPrivateUploadPolicy(input, config.maxUploadBytes);
      return getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.privateBucket,
          Key: policy.key,
          ContentType: policy.contentType,
          ContentLength: policy.contentLength,
          ChecksumSHA256: policy.checksumSha256Base64,
        }),
        { expiresIn: config.signedPutTtlSeconds },
      );
    },
    async verifyPrivateObject(expected: { key: string; contentType: string; contentLength: number }) {
      const result = await client.send(new HeadObjectCommand({
        Bucket: config.privateBucket,
        Key: requireKey(expected.key),
        ChecksumMode: ChecksumMode.ENABLED,
      }));
      const verified = verifyPrivateObjectMetadata(expected, {
        contentLength: result.ContentLength,
        contentType: result.ContentType,
        checksumSha256Base64: result.ChecksumSHA256,
      });
      return {
        ...verified,
        etag: result.ETag,
        lastModified: result.LastModified,
      };
    },
    publicMediaUrl(key: string): string {
      if (!config.publicBaseUrl || !config.publicBucket) throw new Error("public media delivery is not configured");
      return new URL(requireKey(key), `${config.publicBaseUrl}/`).toString();
    },
  };
}
