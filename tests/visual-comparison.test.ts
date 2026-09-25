import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main as compare } from '../scripts/visual-compare.mjs';
import { main as reference } from '../scripts/visual-reference.mjs';
import { validateCaptureManifest } from '../scripts/visual-toolkit-common.mjs';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLx8QAAAABJRU5ErkJggg==',
  'base64',
);
function fixture(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    runId: 'run-safe',
    operation: 'idle',
    scenario: { map: 'dustline', pose: 'idle' },
    settings: {
      viewport: { width: 960, height: 720 },
      pixelRatio: 1,
      quality: 'high',
      seed: 7,
    },
    captureRule: 'same-page fixed sample',
    status: 'captured',
    errors: [],
    console: [],
    frames: [
      {
        id: 'rifle-idle',
        image: 'image.png',
        timestampMs: 1000,
        metadata: {
          camera: { fov: 74, position: [0, 0, 0], rotation: [0, 0, 0] },
          light: { preset: 'sunset' },
          viewport: { width: 960, height: 720, pixelRatio: 1 },
          renderer: { quality: 'high', route: 'primary' },
        },
      },
    ],
    annotations: {
      'rifle-idle': {
        status: 'unreviewed',
        reason: 'Awaiting human review.',
        provenance: 'local capture',
      },
    },
    ...overrides,
  };
}
function writeManifest(directory: string, name: string, document: unknown) {
  writeFileSync(join(directory, name), JSON.stringify(document));
  return join(directory, name);
}

void test('contact sheet embeds local images and escapes annotation text', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-reference-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const input = writeManifest(
    directory,
    'capture.json',
    fixture({
      annotations: {
        'rifle-idle': {
          status: 'rejected',
          reason: '<script>no</script>',
          provenance: 'reviewer & capture',
        },
      },
    }),
  );
  const output = join(directory, 'sheet.html');
  assert.equal(reference(['--manifest', input, '--out', output]).exitCode, 0);
  const html = readFileSync(output, 'utf8');
  assert.match(html, /data:image\/png;base64/);
  assert.match(html, /&lt;script&gt;no&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>no<\/script>/);
});

void test('comparison fails while retaining a board for incompatible camera metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-compare-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const referencePath = writeManifest(directory, 'reference.json', fixture());
  const previousPath = writeManifest(
    directory,
    'previous.json',
    fixture({ runId: 'previous' }),
  );
  const candidate = fixture({ runId: 'candidate' });
  candidate.frames[0].metadata.camera.fov = 80;
  const candidatePath = writeManifest(directory, 'candidate.json', candidate);
  const output = join(directory, 'comparison.html');
  const result = compare([
    '--reference',
    referencePath,
    '--previous',
    previousPath,
    '--candidate',
    candidatePath,
    '--out',
    output,
  ]);
  assert.equal(result.exitCode, 1);
  const html = readFileSync(output, 'utf8');
  assert.match(html, /candidate metadata\.camera differs from reference/);
  assert.match(html, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(
    html,
    /@media\(max-width:780px\)\{body\{margin:12px\}\.columns\{grid-template-columns:1fr\}/,
  );
});

void test('comparison reports a missing synchronized frame in the portable board', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-missing-frame-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const referencePath = writeManifest(directory, 'reference.json', fixture());
  const previousPath = writeManifest(
    directory,
    'previous.json',
    fixture({ runId: 'previous' }),
  );
  const candidate = fixture({ runId: 'candidate' });
  candidate.frames.push({
    id: 'rifle-fire',
    image: 'image.png',
    timestampMs: 1100,
    metadata: {
      camera: { fov: 74, position: [0, 0, 0], rotation: [0, 0, 0] },
      light: { preset: 'sunset' },
      viewport: { width: 960, height: 720, pixelRatio: 1 },
      renderer: { quality: 'high', route: 'primary' },
    },
  });
  const candidatePath = writeManifest(directory, 'candidate.json', candidate);
  const output = join(directory, 'comparison.html');
  assert.equal(
    compare([
      '--reference',
      referencePath,
      '--previous',
      previousPath,
      '--candidate',
      candidatePath,
      '--out',
      output,
    ]).exitCode,
    1,
  );
  assert.match(
    readFileSync(output, 'utf8'),
    /frame rifle-fire: missing from reference/,
  );
});

void test('schema rejects path escapes and cannot invent an approval', () => {
  const manifest = fixture({
    frames: [
      {
        id: 'frame',
        image: '../outside.png',
        timestampMs: 0,
        metadata: {
          camera: { fov: 74, position: [0, 0, 0], rotation: [0, 0, 0] },
          light: 'fixed',
          viewport: { width: 960, height: 720 },
        },
      },
    ],
  });
  assert.match(
    validateCaptureManifest(manifest).join('\n'),
    /local relative path/,
  );
  assert.equal(fixture().annotations['rifle-idle'].status, 'unreviewed');
});

void test('reference library board embeds existing raster entries and retains source assets as records', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-library-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  writeFileSync(join(directory, 'source.glb'), 'not a raster preview');
  const library = writeManifest(directory, 'library.json', {
    schemaVersion: 1,
    assetRoot: '.',
    entries: [
      {
        id: 'reference',
        localPath: 'image.png',
        approval: 'unreviewed',
        use: 'Awaiting review.',
        provenance: 'local fixture',
      },
      {
        id: 'source',
        localPath: 'source.glb',
        approval: 'rejected',
        reason: 'Known broken source.',
        provenance: 'local fixture',
      },
    ],
  });
  const output = join(directory, 'library.html');
  const result = reference(['--library', library, '--out', output]);
  assert.equal(result.exitCode, 0);
  const html = readFileSync(output, 'utf8');
  assert.match(html, /data:image\/png;base64/);
  assert.match(html, /No embeddable raster preview for this source asset/);
  assert.match(html, /Known broken source/);
});

void test('annotation requires explicit values and write acknowledgement', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-annotation-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const input = writeManifest(directory, 'capture.json', fixture());
  assert.throws(
    () =>
      reference([
        '--manifest',
        input,
        '--annotate',
        'rifle-idle',
        '--status',
        'approved',
        '--reason',
        'Reviewed',
        '--provenance',
        'reviewer',
      ]),
    /--write-manifest/,
  );
  assert.equal(
    reference([
      '--manifest',
      input,
      '--annotate',
      'rifle-idle',
      '--status',
      'rejected',
      '--reason',
      'Grip separates from receiver.',
      '--provenance',
      'Jordan, frame review',
      '--write-manifest',
    ]).exitCode,
    0,
  );
  assert.equal(
    JSON.parse(readFileSync(input, 'utf8')).annotations['rifle-idle'].status,
    'rejected',
  );
});

void test('comparison rejects a candidate with a different synchronized timestamp', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-timestamp-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const referencePath = writeManifest(directory, 'reference.json', fixture());
  const previousPath = writeManifest(
    directory,
    'previous.json',
    fixture({ runId: 'previous' }),
  );
  const candidate = fixture({ runId: 'candidate' });
  candidate.frames[0].timestampMs = 1001;
  const candidatePath = writeManifest(directory, 'candidate.json', candidate);
  const output = join(directory, 'comparison.html');
  assert.equal(
    compare([
      '--reference',
      referencePath,
      '--previous',
      previousPath,
      '--candidate',
      candidatePath,
      '--out',
      output,
    ]).exitCode,
    1,
  );
  assert.match(
    readFileSync(output, 'utf8'),
    /candidate timestampMs differs from reference/,
  );
});

void test('schema rejects a frame missing its actual viewport metadata', () => {
  const manifest = fixture();
  Reflect.deleteProperty(manifest.frames[0].metadata, 'viewport');
  assert.match(
    validateCaptureManifest(manifest).join('\n'),
    /metadata\.viewport\.width/,
  );
});

void test('comparison rejects a failed capture and its recorded errors', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-failed-capture-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const manifest = fixture({
    status: 'failed',
    errors: ['canvas lost'],
    console: [{ type: 'error', text: 'WebGL context lost' }],
  });
  const errors = validateCaptureManifest(manifest).join('\n');
  assert.match(errors, /status must be captured/);
  assert.match(errors, /errors must be empty/);
  assert.match(errors, /console must not contain error/);
  const referencePath = writeManifest(directory, 'reference.json', fixture());
  const previousPath = writeManifest(
    directory,
    'previous.json',
    fixture({ runId: 'previous' }),
  );
  const failedPath = writeManifest(directory, 'failed.json', manifest);
  assert.throws(
    () =>
      compare([
        '--reference',
        referencePath,
        '--previous',
        previousPath,
        '--candidate',
        failedPath,
        '--out',
        join(directory, 'comparison.html'),
      ]),
    /status must be captured/,
  );
});

void test('schema rejects actual pixel ratio and quality that contradict capture settings', () => {
  const manifest = fixture();
  manifest.frames[0].metadata.viewport.pixelRatio = 2;
  manifest.frames[0].metadata.renderer.quality = 'performance';
  const errors = validateCaptureManifest(manifest).join('\n');
  assert.match(errors, /pixelRatio must match settings\.pixelRatio/);
  assert.match(errors, /renderer quality must match settings\.quality/);
});

void test('comparison rejects frames rendered through different QA routes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'visual-route-'));
  writeFileSync(join(directory, 'image.png'), PIXEL);
  const original = writeManifest(directory, 'reference.json', fixture());
  const candidate = fixture();
  candidate.frames[0].metadata.renderer.route = 'pistol';
  const changed = writeManifest(directory, 'candidate.json', candidate);
  assert.equal(
    compare([
      '--reference',
      original,
      '--previous',
      original,
      '--candidate',
      changed,
      '--out',
      join(directory, 'comparison.html'),
    ]).exitCode,
    1,
  );
});
