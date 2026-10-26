#!/usr/bin/env bash
set -Eeuo pipefail

[ "$(id -u)" -eq 0 ] || { echo "Run as root" >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker Engine with Compose v2 is required" >&2; exit 1; }
command -v nginx >/dev/null || { echo "Nginx is required" >&2; exit 1; }
docker compose version >/dev/null

readonly DEPLOY_USER=${POSTCAT_DEPLOY_USER:-postcat-deploy}
readonly SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$DEPLOY_USER"
fi

install -d -o root -g root -m 0755 /opt/postcat /opt/postcat/bin /opt/postcat/releases
install -o root -g root -m 0755 "$SCRIPT_DIR/deploy.sh" /opt/postcat/bin/deploy
install -o root -g root -m 0755 "$SCRIPT_DIR/rollback.sh" /opt/postcat/bin/rollback
install -o root -g root -m 0755 "$SCRIPT_DIR/ssh-command.sh" /opt/postcat/bin/ssh-command
install -o root -g root -m 0440 "$SCRIPT_DIR/postcat-deploy.sudoers" /etc/sudoers.d/postcat-deploy
visudo -cf /etc/sudoers.d/postcat-deploy

install -d -o root -g root -m 0700 /etc/postcat
if [ ! -f /etc/postcat/runtime.env ]; then
  install -o root -g root -m 0600 "$SCRIPT_DIR/runtime.env.example" /etc/postcat/runtime.env
  echo "Edit /etc/postcat/runtime.env before enabling deployment." >&2
fi
install -o root -g root -m 0644 "$SCRIPT_DIR/../compose.production.yaml" /etc/postcat/compose.production.yaml

if [ -n "${POSTCAT_DEPLOY_PUBLIC_KEY:-}" ]; then
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "/home/$DEPLOY_USER/.ssh"
  printf 'restrict,command="/opt/postcat/bin/ssh-command" %s\n' "$POSTCAT_DEPLOY_PUBLIC_KEY" > "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
  chmod 0600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
else
  echo "POSTCAT_DEPLOY_PUBLIC_KEY is unset; no deployment key was installed." >&2
fi

if [ -f /etc/letsencrypt/live/postcat.io/fullchain.pem ] && [ -f /etc/letsencrypt/live/postcat.io/privkey.pem ]; then
  site_config="$SCRIPT_DIR/nginx/postcat.io.conf"
else
  site_config="$SCRIPT_DIR/nginx/postcat.io.http.conf"
  echo "Installing HTTP bootstrap config; issue the TLS certificate after the DNS cutover." >&2
fi
install -o root -g root -m 0644 "$site_config" /etc/nginx/sites-available/postcat.io.conf
ln -sfn /etc/nginx/sites-available/postcat.io.conf /etc/nginx/sites-enabled/postcat.io.conf
nginx -t
systemctl reload nginx

printf 'Provisioned PostCat release directories and the available Nginx configuration.\n'
printf 'Add the deployment public key to /home/%s/.ssh/authorized_keys, verify DNS/TLS, then enable the GitHub production gate.\n' "$DEPLOY_USER"
