#!/bin/bash
# Install example nginx configs for a self-hosted FestScout stack.
# Usage:
#   DOMAIN_FESTIVAL=fest.example.com DOMAIN_STREAMING=stream.example.com \
#     sudo bash scripts/deploy-nginx.sh
#
# Requires: nginx installed. TLS is left to you (certbot, etc.).

set -euo pipefail

NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NGINX_SRC="$SCRIPT_DIR/../nginx"

DOMAIN_FESTIVAL="${DOMAIN_FESTIVAL:-YOUR_DOMAIN}"
DOMAIN_STREAMING="${DOMAIN_STREAMING:-YOUR_DOMAIN}"

echo "=== FestScout Nginx example deploy ==="
echo "Festival domain:  $DOMAIN_FESTIVAL"
echo "Streaming domain: $DOMAIN_STREAMING"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

sed "s/YOUR_DOMAIN/$DOMAIN_FESTIVAL/g" "$NGINX_SRC/festival.example.conf" > "$tmpdir/festscout-festival"
sed "s/YOUR_DOMAIN/$DOMAIN_STREAMING/g" "$NGINX_SRC/streaming.example.conf" > "$tmpdir/festscout-streaming"

cp "$tmpdir/festscout-festival" "$NGINX_AVAILABLE/festscout-festival"
cp "$tmpdir/festscout-streaming" "$NGINX_AVAILABLE/festscout-streaming"
ln -sfn "$NGINX_AVAILABLE/festscout-festival" "$NGINX_ENABLED/festscout-festival"
ln -sfn "$NGINX_AVAILABLE/festscout-streaming" "$NGINX_ENABLED/festscout-streaming"

nginx -t
systemctl reload nginx

echo "Installed example HTTP configs. Add TLS before exposing publicly."
