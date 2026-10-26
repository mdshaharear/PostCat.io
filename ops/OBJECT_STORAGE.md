# Contabo Object Storage setup for PostCat

## Baseline

Use a private bucket by default. PostCat's current fictional SVG files remain local; no real product media is uploaded by this setup. The code adds a server-only S3-compatible client foundation, immutable object-key policy, short-lived signed URL helpers and read-only audit tooling. It is not connected to a public upload API or CMS yet.

Supported Contabo endpoints:

```text
EU:         https://eu2.contabostorage.com
US Central: https://usc1.contabostorage.com
Singapore:  https://sin1.contabostorage.com
```

Use `CONTABO_S3_REGION=default` and path-style addressing. Select the endpoint that matches the bucket's actual location.

## Provisioning decisions required

Before creating the bucket, choose:

- bucket location: EU, US Central or Singapore
- globally unique private bucket name, e.g. `postcat-prod-media-private-<suffix>`
- whether private originals need versioning
- retention, backup and deletion policy
- future public media strategy: signed URLs or a separate public derivatives bucket/CDN

Do not enable Object Lock for the normal media bucket. Object Lock must be chosen when a bucket is created and can obstruct deletion/retention operations. Use a separate archive bucket only when immutable retention is explicitly required.

## Control Panel setup

1. Create an Object Storage instance/bucket in the chosen location.
2. Keep public sharing disabled for the private bucket.
3. Create a dedicated Object Storage user/access key for PostCat.
4. Grant only the required bucket scope; do not reuse Contabo management API credentials.
5. Record the Access Key ID and Secret Access Key in `/etc/postcat/runtime.env` on the VPS.
6. If versioning is enabled, document noncurrent-version retention and monitor storage growth.
7. Apply lifecycle expiration only to reviewed disposable prefixes such as `tmp/`; never apply an empty-prefix delete rule to production media.

## Runtime values

Start from `ops/runtime.env.example`. Real values stay only on the VPS secret file:

```dotenv
CONTABO_S3_ENDPOINT=https://sin1.contabostorage.com
CONTABO_S3_REGION=default
CONTABO_S3_ACCESS_KEY_ID=<secret>
CONTABO_S3_SECRET_ACCESS_KEY=<secret>
CONTABO_S3_PRIVATE_BUCKET=postcat-prod-media-private-<suffix>
CONTABO_S3_SIGNED_GET_TTL_SECONDS=300
CONTABO_S3_SIGNED_PUT_TTL_SECONDS=120
CONTABO_S3_MAX_UPLOAD_BYTES=10485760
```

`CONTABO_S3_PUBLIC_BUCKET` and `MEDIA_PUBLIC_BASE_URL` remain blank until a separate rights-approved public derivatives architecture is enabled.

## Offline validation

Load the protected environment without printing credentials and run:

```bash
set -a
. /etc/postcat/runtime.env
set +a
npm run storage:check-env
```

The output contains endpoint, bucket and limits only; it never returns credential values.

## Read-only live audit

This does not create, upload, change ACLs, apply lifecycle rules or delete objects:

```bash
set -a
. /etc/postcat/runtime.env
set +a
CONTABO_S3_AUDIT=1 npm run storage:audit
```

It checks bucket reachability, versioning, lifecycle and Object Lock configuration. Run it initially from a protected operator environment; the production standalone image does not include project scripts.

## Object keys

Application-generated keys follow:

```text
media/<asset-id>/<sha256>/<variant>.<ext>
```

Example:

```text
media/01JABCDEF0123456789/8f91.../width-1280.webp
```

Raw filenames, `..`, backslashes, control characters, mutable `main.jpg` keys, emails, credentials and private source URLs are rejected. The upload signature binds approved MIME type, content length and the SHA-256 embedded in the object key as S3 metadata. Confirmation must HEAD the object and match all three values before an asset is accepted. Because Contabo overwrite-precondition support is not assumed, the application must treat an already-confirmed content-hash key as immutable and never issue a second upload authorization for it.

## Public media later

For indexable product images, use a separate derivatives-only bucket after image rights, sanitation/re-encoding and revocation behavior are approved. Keep originals, imports, quarantine and rejected assets private. Contabo public-to-private changes may remain cached temporarily, so sensitive media must never enter a public bucket.

A custom `media.postcat.io` hostname requires a TLS/CDN or reverse-proxy design and explicit DNS setup. Do not broadly allow raw S3 endpoints in Next.js image configuration.
