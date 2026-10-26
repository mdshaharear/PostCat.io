# PostCat production operations runbook

## Architecture

```text
GitHub main
  -> CI (unit, Playwright, typecheck, lint, build, hardened container)
  -> GHCR image tagged with the tested commit and pinned by digest
  -> GitHub Production environment approval
  -> SSH deployment to Contabo VPS
  -> Docker Compose binds Next.js to dedicated loopback port 127.0.0.1:3300
  -> the existing host Nginx terminates TLS for postcat.io
  -> Contabo Object Storage remains private and is accessed server-side
```

This is a single-host deployment. Restart policies recover a process, not a lost VPS. Keep provider snapshots/backups and a documented rebuild path.

## Required DNS

Create DNS records only after the VPS public IP is known:

- `A postcat.io -> <VPS IPv4>`
- `AAAA postcat.io -> <VPS IPv6>` only when IPv6 routing/firewall is verified
- `CNAME www -> postcat.io`
- Optional later: `media.postcat.io` only after a public derivatives/CDN design is approved

Issue and renew the `postcat.io`/`www.postcat.io` certificate with the host's existing ACME/Certbot process after ports 80 and 443 reach the VPS. Keep Next.js port 3300 private/loopback-only.

## VPS prerequisites

- Supported Ubuntu/Debian release with security updates
- Docker Engine and Compose v2 from Docker's official repository
- Existing Nginx and Certbot installation; provisioning starts with HTTP when the certificate is not issued yet
- Firewall: SSH from approved operator sources; public TCP 80/443; no public 3300
- Provider console access retained while changing SSH/firewall
- Dedicated locked `postcat-deploy` user and forced-command SSH key; never root SSH or Docker-group access for CI

From a checked-out release on the VPS:

```bash
sudo bash ops/provision-vps.sh
```

The deploy user is not a Docker-group member. Its key is restricted to a root-owned command wrapper which accepts only a digest-pinned PostCat deploy or rollback. The production Compose template is root-owned under `/etc/postcat` and cannot be replaced by GitHub Actions.

Run provisioning with the dedicated public key:

```bash
sudo POSTCAT_DEPLOY_PUBLIC_KEY='ssh-ed25519 AAAA... github-actions-postcat-deploy' bash ops/provision-vps.sh
```

Verify the host key fingerprint through the Contabo console or another trusted channel. Do not generate `known_hosts` dynamically inside CI.

## Runtime configuration

Edit `/etc/postcat/runtime.env` as root. It must be owned by `root:postcat-deploy` and mode `0640`.

```bash
sudoedit /etc/postcat/runtime.env
sudo chown root:postcat-deploy /etc/postcat/runtime.env
sudo chmod 0640 /etc/postcat/runtime.env
```

Do not commit the real file, paste it into tickets, or pass secrets as Docker build arguments.

If the GHCR package is private, perform a one-time VPS login using a read-only package token supplied through a protected prompt:

```bash
docker login ghcr.io -u mdshaharear
```

Do not place the token in the repository or deployment command.

## GitHub Production environment

GHCR image publication runs after successful CI. The VPS deployment job stays disabled until the repository-level Actions variable is exactly:

```text
PRODUCTION_DEPLOY_ENABLED=true
```

Set it only after VPS, DNS, TLS, runtime secrets and rollback are verified.
It must be stored under repository **Settings → Secrets and variables → Actions → Variables**, because the image-publishing job intentionally runs before the protected `Production` environment job.

Environment secret:

```text
VPS_SSH_PRIVATE_KEY
```

Environment variables:

```text
VPS_HOST=<verified VPS hostname or IP>
VPS_PORT=22
VPS_USER=postcat-deploy
VPS_SSH_KNOWN_HOSTS=<verified complete known_hosts line>
PRODUCTION_HEALTH_URL=https://postcat.io/api/health
```

Recommended GitHub settings:

- Protect `main`; require pull requests and `CI / quality` plus `CI / container`
- Block force pushes and branch deletion
- Require a reviewer on the `Production` environment and prevent self-review
- Restrict environment deployments to protected `main`
- Require third-party actions to be pinned to full commit SHAs
- Enable dependency graph, Dependabot alerts and security updates

## Deployment behavior

A successful push CI builds `ghcr.io/mdshaharear/postcat.io`, records its digest, attests provenance and calls:

```bash
/opt/postcat/bin/deploy <image@sha256:digest> <40-character-git-sha> <staged-compose>
```

The script validates inputs, serializes changes with `flock`, saves a release under `/opt/postcat/releases`, starts only the exact digest, checks local health and updates `current`/`previous` symlinks. Failed deployments attempt to restore the old release.

## Routine checks

```bash
readlink -f /opt/postcat/current
cat /opt/postcat/current/.env
curl -fsS http://127.0.0.1:3300/api/health
curl -fsS https://postcat.io/api/health

docker compose \
  --env-file /etc/postcat/runtime.env \
  --env-file /opt/postcat/current/.env \
  -f /opt/postcat/current/compose.production.yaml ps

docker compose \
  --env-file /etc/postcat/runtime.env \
  --env-file /opt/postcat/current/.env \
  -f /opt/postcat/current/compose.production.yaml logs --since=30m
```

Never run `docker compose down -v` during deployment or rollback.

## Manual rollback

Use the GitHub `Deploy production` workflow with `rollback`, or on the VPS:

```bash
/opt/postcat/bin/rollback
```

Then verify both local and public health. Image rollback cannot safely undo a future backward-incompatible database migration; database changes must use an expand/migrate/contract policy.

## Backup and recovery baseline

- Preserve this GitHub repository and GHCR image digests
- Back up `/etc/postcat/runtime.env` through an encrypted secret escrow, not ordinary Git
- Keep Contabo Object Storage versioning/retention decisions documented separately
- Keep an off-host copy of future PostgreSQL backups
- Test rebuilding a fresh VPS from this runbook before calling recovery complete
