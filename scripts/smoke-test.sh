#!/usr/bin/env bash
# Wait until an environment serves the expected version, then pass.
# Dokploy deploys asynchronously, so we poll /health.
#
# Usage: ./scripts/smoke-test.sh <base-url> <expected-env> <expected-version> [timeout-seconds]
set -euo pipefail

base_url="${1:?base URL required}"
expected_env="${2:?expected env required}"
expected_version="${3:?expected version required}"
timeout="${4:-300}"

deadline=$(( $(date +%s) + timeout ))
url="${base_url%/}/health"

echo "Waiting for ${url} to report env=${expected_env} version=${expected_version} (timeout ${timeout}s)"

while (( $(date +%s) < deadline )); do
  body=$(curl -fsS --max-time 5 "$url" 2>/dev/null || true)
  if [[ -n "$body" ]]; then
    env=$(sed -n 's/.*"env":"\([^"]*\)".*/\1/p' <<<"$body")
    version=$(sed -n 's/.*"version":"\([^"]*\)".*/\1/p' <<<"$body")
    echo "  got env=${env:-?} version=${version:-?}"
    if [[ "$env" == "$expected_env" && "$version" == "$expected_version" ]]; then
      echo "Smoke test passed."
      exit 0
    fi
  else
    echo "  not reachable yet"
  fi
  sleep 5
done

echo "Smoke test failed: ${expected_env} did not serve ${expected_version} within ${timeout}s" >&2
exit 1
