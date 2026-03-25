#!/usr/bin/env bash
# Purge Cloudflare CDN cache for sessionsgarden.app
# Usage: ./scripts/cf-purge-cache.sh
# Requires: CF_ZONE_ID and CF_PURGE_TOKEN in .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  echo "Copy .env.example to .env and fill in CF_ZONE_ID and CF_PURGE_TOKEN"
  exit 1
fi

# Source .env (handle quoted values)
CF_ZONE_ID=$(grep '^CF_ZONE_ID=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
CF_PURGE_TOKEN=$(grep '^CF_PURGE_TOKEN=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")

if [ -z "$CF_ZONE_ID" ] || [ -z "$CF_PURGE_TOKEN" ]; then
  echo "Error: CF_ZONE_ID and CF_PURGE_TOKEN must be set in .env"
  exit 1
fi

echo "Purging Cloudflare cache for zone $CF_ZONE_ID..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_PURGE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  SUCCESS=$(echo "$BODY" | grep -o '"success":true' || true)
  if [ -n "$SUCCESS" ]; then
    echo "Cache purged successfully."
  else
    echo "Request returned 200 but success was not true:"
    echo "$BODY"
    exit 1
  fi
else
  echo "Error: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
