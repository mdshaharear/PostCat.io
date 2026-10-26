#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT=/opt/postcat
readonly RELEASES="$ROOT/releases"
readonly RUNTIME_ENV=/etc/postcat/runtime.env
readonly COMPOSE_TEMPLATE=/etc/postcat/compose.production.yaml
readonly HEALTH_URL=http://127.0.0.1:3300/api/health

fail() { printf 'deploy: %s\n' "$*" >&2; exit 1; }
health() { curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 2 "$HEALTH_URL" | grep --quiet '"status":"ok"'; }
compose() {
  local release=$1
  docker compose --env-file "$RUNTIME_ENV" --env-file "$release/.env" -f "$release/compose.production.yaml" "${@:2}"
}
release_image() {
  local release=$1
  local image
  [ -f "$release/.env" ] || return 1
  image=$(sed -n 's/^POSTCAT_IMAGE=//p' "$release/.env")
  [[ "$image" =~ ^ghcr\.io/mdshaharear/postcat\.io@sha256:[a-f0-9]{64}$ ]] || return 1
  printf '%s\n' "$image"
}
ensure_release_image() {
  local release=$1
  local image
  image=$(release_image "$release") || return 1
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    docker pull "$image"
  fi
}
restore_release() {
  local release=$1
  [ -d "$release" ] || return 1
  ensure_release_image "$release"
  compose "$release" config --quiet
  compose "$release" up -d --pull never --no-build --remove-orphans --wait
  health
}

[ "$#" -eq 2 ] || fail "usage: deploy <image@sha256:digest> <git-sha>"
image=$1
sha=$2

[[ "$image" =~ ^ghcr\.io/mdshaharear/postcat\.io@sha256:[a-f0-9]{64}$ ]] || fail "image must be the PostCat GHCR image pinned by sha256 digest"
[[ "$sha" =~ ^[a-f0-9]{40}$ ]] || fail "git SHA must contain exactly 40 lowercase hexadecimal characters"
[ -f "$RUNTIME_ENV" ] || fail "$RUNTIME_ENV is missing"
[ -f "$COMPOSE_TEMPLATE" ] || fail "$COMPOSE_TEMPLATE is missing"

install -d -m 0750 "$RELEASES"
exec 9>"$ROOT/deploy.lock"
flock -n 9 || fail "another deployment or rollback is running"

digest=${image##*@sha256:}
release_id="$sha-$digest"
release="$RELEASES/$release_id"
expected_env=$(mktemp "$ROOT/release-env.XXXXXX")
trap 'rm -f "$expected_env"' EXIT
printf 'POSTCAT_IMAGE=%s\n' "$image" > "$expected_env"
chmod 0600 "$expected_env"

if [ -d "$release" ]; then
  [ -f "$release/compose.production.yaml" ] || fail "existing release is incomplete"
  [ -f "$release/.env" ] || fail "existing release environment is incomplete"
  cmp --silent "$COMPOSE_TEMPLATE" "$release/compose.production.yaml" || fail "existing release Compose file is immutable"
  cmp --silent "$expected_env" "$release/.env" || fail "existing release image reference is immutable"
else
  install -d -m 0750 "$release"
  install -m 0644 "$COMPOSE_TEMPLATE" "$release/compose.production.yaml"
  install -m 0600 "$expected_env" "$release/.env"
fi

old_current=""
if [ -L "$ROOT/current" ]; then old_current=$(readlink -f "$ROOT/current"); fi
if [ "$old_current" = "$release" ]; then
  ensure_release_image "$release"
  health
  printf 'deploy: release %s is already active\n' "$release_id"
  exit 0
fi

rollback_on_error() {
  status=$?
  if [ "$status" -ne 0 ] && [ -n "$old_current" ]; then
    printf 'deploy: new release failed; restoring %s\n' "$old_current" >&2
    restore_release "$old_current" || printf 'deploy: automatic restore also failed\n' >&2
  fi
  exit "$status"
}
trap rollback_on_error ERR

compose "$release" config --quiet
compose "$release" pull web
compose "$release" up -d --pull never --no-build --remove-orphans --wait
health

if [ -n "$old_current" ] && [ "$old_current" != "$release" ]; then
  ln -sfn "$old_current" "$ROOT/previous.new"
  mv -Tf "$ROOT/previous.new" "$ROOT/previous"
fi
ln -sfn "$release" "$ROOT/current.new"
mv -Tf "$ROOT/current.new" "$ROOT/current"
trap - ERR
printf 'deploy: active release %s using %s\n' "$sha" "$image"
