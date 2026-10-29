#!/usr/bin/env bash
# Ask Dokploy to (re)deploy one application.
# Dokploy pulls the image tag configured on that application (:staging or
# :production) and restarts it with that environment's variables.
#
# Usage: DOKPLOY_URL=... DOKPLOY_TOKEN=... APP_ID=... ./scripts/dokploy-deploy.sh
set -euo pipefail

: "${DOKPLOY_URL:?DOKPLOY_URL is required (e.g. https://dokploy.example.com)}"
: "${DOKPLOY_TOKEN:?DOKPLOY_TOKEN is required (Dokploy API key)}"
: "${APP_ID:?APP_ID is required (Dokploy applicationId)}"

echo "Triggering Dokploy deployment for application ${APP_ID} ..."

http_code=$(curl -sS -o /tmp/dokploy-response.json -w '%{http_code}' \
  -X POST "${DOKPLOY_URL%/}/api/application.deploy" \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "x-api-key: ${DOKPLOY_TOKEN}" \
  -d "{\"applicationId\": \"${APP_ID}\"}")

if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
  echo "Dokploy returned HTTP ${http_code}:" >&2
  cat /tmp/dokploy-response.json >&2 || true
  exit 1
fi

echo "Deployment queued (HTTP ${http_code})."
