#!/usr/bin/env bash
set -euo pipefail

# The Codex Action calls this after installing both packages. Its stdin holds
# the real provider key, but the package proxy will receive only a local token.
if [[ -z "${NPM_CONFIG_PREFIX:-}" || -z "${RUNNER_TEMP:-}" ]]; then
  echo 'Ollama proxy adapter is missing its trusted runner paths.' >&2
  exit 1
fi

real_proxy="$NPM_CONFIG_PREFIX/bin/codex-responses-api-proxy"
if [[ ! -x "$real_proxy" ]]; then
  echo 'Installed Codex Responses proxy is missing.' >&2
  exit 1
fi

IFS= read -r provider_key
if [[ -z "$provider_key" ]]; then
  echo 'Ollama key is missing.' >&2
  exit 1
fi

# The Action supplies one terminating newline. A second line cannot be part of
# an HTTP bearer token, and must never be silently dropped.
if IFS= read -r _; then
  echo 'Ollama key contains an invalid newline.' >&2
  exit 1
fi

proxy_arguments=()
configured_upstream=''
while (( $# > 0 )); do
  if [[ "$1" == '--upstream-url' ]]; then
    if (( $# < 2 )) || [[ -n "$configured_upstream" ]]; then
      echo 'Codex proxy upstream arguments are invalid.' >&2
      exit 1
    fi

    configured_upstream="$2"
    shift 2
  else
    proxy_arguments+=("$1")
    shift
  fi
done

if [[ "$configured_upstream" != 'https://ollama.com/v1/responses' ]]; then
  echo 'Codex proxy upstream changed unexpectedly.' >&2
  exit 1
fi

relay_info="$RUNNER_TEMP/ollama-relay-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}.json"
node_binary="$(command -v node)"
(
  exec env -u PROXY_API_KEY -u NODE_OPTIONS sudo -n \
    env NODE_OPTIONS=--disable-sigusr1 "$node_binary" \
    "$GITHUB_WORKSPACE/.github/scripts/ollama-relay.mjs" "$relay_info" \
    < <(printf '%s' "$provider_key")
) &

for _ in {1..10}; do
  if [[ -s "$relay_info" ]]; then
    break
  fi
  sleep 1
done

if [[ ! -s "$relay_info" ]]; then
  echo 'Trusted Ollama relay did not start.' >&2
  exit 1
fi

relay_port="$(node -e '
  const fs = require("node:fs");
  const info = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (!Number.isInteger(info.port) || info.port < 1 || info.port > 65535) {
    process.exit(1);
  }
  process.stdout.write(String(info.port));
' "$relay_info")"
unset provider_key

relay_endpoint="http://127.0.0.1:${relay_port}/v1/responses"
exec "$real_proxy" "${proxy_arguments[@]}" \
  --upstream-url "$relay_endpoint" <<< 'local-review-relay'
