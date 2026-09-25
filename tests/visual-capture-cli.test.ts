import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const candidateRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const captureScript = join(candidateRoot, 'scripts', 'visual-capture.mjs');

void test('capture CLI retains a failed manifest when browser launch rejects', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-capture-cli-'));
  context.after(() => {
    rmSync(directory, { recursive: true, force: true });
  });
  const loaderPath = join(directory, 'reject-playwright-loader.mjs');
  const output = join(directory, 'capture');
  const loader = [
    'export async function resolve(specifier, context, nextResolve) {',
    "  if (specifier === 'playwright') {",
    '    const source = "export const chromium = { launch: async () => { throw new Error(\'INJECTED_LAUNCH_FAILURE\'); } };";',
    "    return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true };",
    '  }',
    '  return nextResolve(specifier, context);',
    '}',
  ].join('\n');
  writeFileSync(loaderPath, loader);

  const result = spawnSync(
    process.execPath,
    ['--experimental-loader', loaderPath, captureScript, '--out', output],
    { cwd: candidateRoot, encoding: 'utf8' },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /INJECTED_LAUNCH_FAILURE/);
  const manifest = JSON.parse(
    readFileSync(join(output, 'manifest.json'), 'utf8'),
  );
  assert.equal(manifest.status, 'failed');
  assert.equal(manifest.stage, 'browser-launch');
  assert.match(manifest.errors.join('\n'), /INJECTED_LAUNCH_FAILURE/);
});
