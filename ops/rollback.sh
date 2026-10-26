#!/usr/bin/env bash
set -Eeuo pipefail

readonly ROOT=/opt/postcat
readonly RUNTIME_ENV=/etc/postcat/runtime.env
readonly HEALTH_URL=http://127.0.0.1:3300/api/health

fail() { printf 'rollback: %s\n' "$*" >&2; exit 1; }
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
activate() {
  local release=$1
  ensure_release_image "$release"
  compose "$release" config --quiet
  compose "$release" up -d --pull never --no-build --remove-orphans --wait
  health
}

[ -f "$RUNTIME_ENV" ] || fail "$RUNTIME_ENV is missing"
[ -L "$ROOT/current" ] || fail "current release is not set"
[ -L "$ROOT/previous" ] || fail "previous release is not set"

exec 9>"$ROOT/deploy.lock"
flock -n 9 || fail "another deployment or rollback is running"

current=$(readlink -f "$ROOT/current")
previous=$(readlink -f "$ROOT/previous")
[ -d "$current" ] || fail "current release directory is missing"
[ -d "$previous" ] || fail "previous release directory is missing"
[ "$current" != "$previous" ] || fail "current and previous releases are identical"

restore_current() {
  status=$?
  if [ "$status" -ne 0 ]; then
    printf 'rollback: previous release failed; restoring current release\n' >&2
    activate "$current" || printf 'rollback: current release restore also failed\n' >&2
  fi
  exit "$status"
}
trap restore_current ERR

activate "$previous"
ln -sfn "$current" "$ROOT/previous.new"
mv -Tf "$ROOT/previous.new" "$ROOT/previous"
ln -sfn "$previous" "$ROOT/current.new"
mv -Tf "$ROOT/current.new" "$ROOT/current"
trap - ERR
printf 'rollback: active release is now %s\n' "$previous"
