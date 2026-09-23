#!/usr/bin/env bash
set -euo pipefail

# Codex is installed in an isolated prefix so the trusted proxy adapter keeps
# precedence over the package's proxy binary on PATH.
exec "$NPM_CONFIG_PREFIX/bin/codex" "$@"
