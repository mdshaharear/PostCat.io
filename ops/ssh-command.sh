#!/usr/bin/env bash
set -Eeuo pipefail

command=${SSH_ORIGINAL_COMMAND:-}

if [[ "$command" =~ ^/opt/postcat/bin/deploy[[:space:]]+(ghcr\.io/mdshaharear/postcat\.io@sha256:[a-f0-9]{64})[[:space:]]+([a-f0-9]{40})$ ]]; then
  exec sudo -n /opt/postcat/bin/deploy "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi

if [ "$command" = "/opt/postcat/bin/rollback" ]; then
  exec sudo -n /opt/postcat/bin/rollback
fi

printf 'postcat deploy key: command denied\n' >&2
exit 126
