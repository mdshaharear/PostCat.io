import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");

test("production Compose deploys an immutable loopback-only image", async () => {
  const compose = await read("compose.production.yaml");
  assert.match(compose, /image: \$\{POSTCAT_IMAGE:\?/);
  assert.doesNotMatch(compose, /^\s*build:/m);
  assert.match(compose, /127\.0\.0\.1:3300:3000/);
  assert.match(compose, /read_only: true/);
  assert.match(compose, /cap_drop:\s*\n\s*- ALL/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /max-size: "10m"/);
  assert.match(compose, /max-file: "5"/);
});

test("deployment workflow publishes the tested commit and uses production protection", async () => {
  const workflow = await read(".github/workflows/deploy.yml");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows: \["CI"\]/);
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/);
  assert.match(workflow, /PRODUCTION_DEPLOY_ENABLED == 'true'/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(workflow, /packages: write/);
  assert.match(workflow, /Smoke-test published image digest/);
  assert.match(workflow, /docker pull "\$image"/);
  assert.match(workflow, /docker run --detach --rm/);
  assert.match(workflow, /environment:\s*\n\s*name: Production/);
  assert.match(workflow, /VPS_SSH_PRIVATE_KEY/);
  assert.match(workflow, /VPS_SSH_KNOWN_HOSTS/);
  assert.doesNotMatch(workflow, /scp /);
  assert.match(workflow, /\/opt\/postcat\/bin\/deploy/);
  assert.match(workflow, /\/opt\/postcat\/bin\/rollback/);
});

test("VPS deployment scripts require digest-pinned images and provide rollback", async () => {
  const deploy = await read("ops/deploy.sh");
  const rollback = await read("ops/rollback.sh");
  assert.ok(deploy.includes("ghcr\\.io/mdshaharear/postcat\\.io@sha256:"));
  assert.match(deploy, /release_id="\$sha-\$digest"/);
  assert.match(deploy, /COMPOSE_TEMPLATE=\/etc\/postcat\/compose\.production\.yaml/);
  assert.match(deploy, /cmp --silent/);
  assert.match(deploy, /flock/);
  assert.match(deploy, /--no-build/);
  assert.match(deploy, /docker image inspect/);
  assert.match(deploy, /--pull never/);
  assert.match(deploy, /api\/health/);
  assert.doesNotMatch(deploy, /down\s+-v/);
  assert.match(rollback, /previous/);
  assert.match(rollback, /--no-build/);
  assert.match(rollback, /docker image inspect/);
  assert.match(rollback, /--pull never/);
  assert.doesNotMatch(rollback, /down\s+-v/);
});

test("the shared VPS deploy account is restricted to root-owned allowlisted commands", async () => {
  const provision = await read("ops/provision-vps.sh");
  const wrapper = await read("ops/ssh-command.sh");
  assert.doesNotMatch(provision, /usermod -aG docker/);
  assert.match(provision, /install -d -o root -g root/);
  assert.match(provision, /command="\/opt\/postcat\/bin\/ssh-command"/);
  assert.match(wrapper, /SSH_ORIGINAL_COMMAND/);
  assert.match(wrapper, /sudo -n \/opt\/postcat\/bin\/deploy/);
  assert.match(wrapper, /sudo -n \/opt\/postcat\/bin\/rollback/);
  assert.doesNotMatch(wrapper, /eval/);
});

test("production enablement is documented as a repository variable", async () => {
  const runbook = await read("ops/RUNBOOK.md");
  assert.match(runbook, /repository-level Actions variable/);
  assert.match(runbook, /Environment variables:[\s\S]*VPS_HOST/);
  assert.doesNotMatch(runbook, /Environment variables:[\s\S]*PRODUCTION_DEPLOY_ENABLED=true/);
});

test("the existing host Nginx proxies PostCat on a dedicated loopback port", async () => {
  const nginx = await read("ops/nginx/postcat.io.conf");
  assert.match(nginx, /server_name postcat\.io www\.postcat\.io/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3300/);
  assert.match(nginx, /proxy_set_header Host \$host/);
  assert.doesNotMatch(nginx, /listen 3300/);
});
