import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const wrapperPath = fileURLToPath(new URL('./ollama-proxy-wrapper.sh', import.meta.url));

function prepareFakeRunner() {
  const runnerDirectory = mkdtempSync(join(tmpdir(), 'ollama-proxy-wrapper-'));
  const npmPrefix = join(runnerDirectory, 'npm');
  const fakeBin = join(runnerDirectory, 'fake-bin');
  mkdirSync(join(npmPrefix, 'bin'), { recursive: true });
  mkdirSync(fakeBin);

  const fakeSudo = join(fakeBin, 'sudo');
  writeFileSync(fakeSudo, `#!/usr/bin/env bash
set -euo pipefail
relay_info="\${@: -1}"
IFS= read -r provider_key || true
printf '%s' "$provider_key" > "$RUNNER_TEMP/provider-key-seen-by-relay"
printf '{"port":43210}' > "$relay_info"
`);
  chmodSync(fakeSudo, 0o755);

  const fakeProxy = join(npmPrefix, 'bin', 'codex-responses-api-proxy');
  writeFileSync(fakeProxy, `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$RUNNER_TEMP/proxy-arguments"
IFS= read -r proxy_key
printf '%s' "$proxy_key" > "$RUNNER_TEMP/proxy-key"
`);
  chmodSync(fakeProxy, 0o755);

  const environment = {
    ...process.env,
    GITHUB_RUN_ID: 'fake-run',
    GITHUB_RUN_ATTEMPT: '1',
    GITHUB_WORKSPACE: runnerDirectory,
    NPM_CONFIG_PREFIX: npmPrefix,
    RUNNER_TEMP: runnerDirectory,
    PATH: `${fakeBin}:${process.env.PATH}`,
  };

  return { environment, runnerDirectory };
}

test('starts the relay with the real key after install and gives the package proxy only a placeholder', () => {
  const { environment, runnerDirectory } = prepareFakeRunner();

  try {
    execFileSync(wrapperPath, [
      '--http-shutdown',
      '--server-info',
      join(runnerDirectory, 'codex-proxy-info.json'),
      '--upstream-url',
      'https://ollama.com/v1/responses',
    ], {
      env: environment,
      input: 'fake.provider-key==\n',
      timeout: 5000,
    });

    const relayKey = readFileSync(join(runnerDirectory, 'provider-key-seen-by-relay'), 'utf8');
    const proxyKey = readFileSync(join(runnerDirectory, 'proxy-key'), 'utf8');
    const proxyArguments = readFileSync(join(runnerDirectory, 'proxy-arguments'), 'utf8');

    assert.equal(relayKey, 'fake.provider-key==');
    assert.equal(proxyKey, 'local-review-relay');
    assert.match(proxyArguments, /http:\/\/127\.0\.0\.1:43210\/v1\/responses/);
    assert.doesNotMatch(proxyArguments, /fake\.provider-key/);
  } finally {
    rmSync(runnerDirectory, { recursive: true, force: true });
  }
});

test('refuses an unexpected provider endpoint before launching the relay', () => {
  const { environment, runnerDirectory } = prepareFakeRunner();

  try {
    assert.throws(() => {
      execFileSync(wrapperPath, ['--upstream-url', 'https://example.com/v1/responses'], {
        env: environment,
        input: 'fake.provider-key==\n',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      });
    });

    assert.throws(() => {
      readFileSync(join(runnerDirectory, 'provider-key-seen-by-relay'));
    }, { code: 'ENOENT' });
  } finally {
    rmSync(runnerDirectory, { recursive: true, force: true });
  }
});
