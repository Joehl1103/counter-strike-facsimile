import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const validatorScript = fileURLToPath(new URL('../scripts/validate-gltf.mjs', import.meta.url));

void test('glTF validation rejects malformed arguments without writing a report', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'gltf-cli-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'asset.gltf'), JSON.stringify({ asset: { version: '2.0' } }));

  for (const argumentsList of [
    [],
    ['asset.gltf'],
    ['asset.gltf', '--report'],
    ['asset.gltf', '--report', 'report.json'],
    ['asset.gltf', 'report.json', 'extra.json'],
    ['--asset', 'report.json'],
  ]) {
    const result = spawnSync(process.execPath, [validatorScript, ...argumentsList], {
      cwd: directory,
      encoding: 'utf8',
    });
    assert.equal(result.status, 2, JSON.stringify(argumentsList));
    assert.match(result.stderr, /Usage:/);
    assert.deepEqual(readdirSync(directory), ['asset.gltf']);
  }
});

void test('glTF validation still writes a report for a valid positional invocation', (context) => {
  const directory = mkdtempSync(join(tmpdir(), 'gltf-cli-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'asset.gltf'), JSON.stringify({ asset: { version: '2.0' } }));

  const result = spawnSync(process.execPath, [validatorScript, 'asset.gltf', 'reports/asset.json'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(readFileSync(join(directory, 'reports/asset.json'), 'utf8'));
  assert.equal(report.uri, 'asset.gltf');
  assert.equal(report.issues.numErrors, 0);
});
