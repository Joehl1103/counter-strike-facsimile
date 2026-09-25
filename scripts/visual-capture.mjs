import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createServedAssetRecorder } from './visual-capture-assets.mjs';
import {
  closeCaptureResources,
  runCaptureAttempt,
} from './visual-capture-lifecycle.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    operation: { type: 'string', default: 'preview' },
    url: { type: 'string', default: 'http://localhost:3000' },
    mode: { type: 'string', default: 'primary' },
    weapon: { type: 'string', default: 'carbine' },
    action: { type: 'string', default: 'reload' },
    times: { type: 'string' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '720' },
    quality: { type: 'string', default: 'high' },
    seed: { type: 'string', default: '1947' },
    out: { type: 'string' },
    pose: { type: 'string', default: 'idle' },
    distance: { type: 'string', default: '3' },
    subject: { type: 'string', default: 'both' },
    angle: { type: 'string', default: 'front' },
    variant: { type: 'string', default: '0' },
    'ct-asset': { type: 'string' },
    'carbine-asset': { type: 'string' },
    'pistol-asset': { type: 'string' },
    skeleton: { type: 'boolean', default: false },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  console.log(
    'Candidate GLBs: --ct-asset FILE, --carbine-asset FILE or --pistol-asset FILE replaces only that request in the isolated capture context. Public files stay unchanged.',
  );
  console.log(
    `Capture actual game frames into a new evidence directory.\n  npm run visual:preview -- --url http://localhost:3000 --weapon carbine --action reload --times 0,250,500,1000,2000\n  npm run visual:replay -- --url http://localhost:3000\n  npm run visual:preview -- --mode character-close --pose walk --distance 6\nTimes are milliseconds. Outputs contain PNG originals, DOM, metadata, console errors and source hashes.\nA new directory is required: captures never overwrite prior evidence. --width/--height set the viewport.`,
  );
  process.exit(0);
}
const origin = new URL(values.url);
if (
  !['localhost', '127.0.0.1'].includes(origin.hostname) ||
  !['http:', 'https:'].includes(origin.protocol)
)
  throw new Error('Visual capture requires a localhost URL.');
if (!['preview', 'replay'].includes(values.operation))
  throw new Error('operation must be preview or replay');
if (!['high', 'performance'].includes(values.quality))
  throw new Error('quality must be high or performance');
const weaponModes = {
  primary: ['rifle', 'carbine', 'smg', 'shotgun', 'sniper'],
  pistol: ['glock18', 'usp', 'p228', 'deagle', 'elite', 'fiveseven'],
  equipment: ['knife', 'grenade', 'smoke', 'flash', 'bomb'],
};
const modes = [
  ...Object.keys(weaponModes),
  'secondary',
  'character-close',
  'locomotion',
  'movement',
  'character',
  'dust2-long-doors',
  'dust2-long',
  'dust2-a',
  'lane',
  'site-a',
  'site-b',
];
if (!modes.includes(values.mode))
  throw new Error('Unknown preview mode: ' + values.mode);
if (
  values.operation === 'preview' &&
  weaponModes[values.mode] &&
  !weaponModes[values.mode].includes(values.weapon)
)
  throw new Error('Weapon does not belong to selected preview mode');
if (!['idle', 'equip', 'fire', 'reload'].includes(values.action))
  throw new Error('Unknown action');
if (
  !['idle', 'walk', 'crouch', 'death'].includes(values.pose) ||
  !['1.5', '3', '6'].includes(values.distance) ||
  !['both', 'ct', 't'].includes(values.subject) ||
  !['front', 'three-quarter'].includes(values.angle) ||
  !['0', '1', '2', '3'].includes(values.variant)
)
  throw new Error('Invalid character pose or distance');
const viewport = { width: Number(values.width), height: Number(values.height) };
if (
  Object.values(viewport).some(
    (value) => !Number.isInteger(value) || value < 320 || value > 4096,
  )
)
  throw new Error('Viewport dimensions must be integers in 320..4096.');
const seed = Number(values.seed);
if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
  throw new Error('seed must be a uint32');
const times = (
  values.times ??
  (values.operation === 'replay'
    ? '0,6000,6370,6800,7200,7700,8210,9900,10050,11000,11500'
    : '0,250,500,1000,2000')
)
  .split(',')
  .map(Number);
if (
  !times.length ||
  times.length > 120 ||
  times.some(
    (time, index) =>
      !Number.isFinite(time) ||
      time < 0 ||
      time > 120000 ||
      (index > 0 && time <= times[index - 1]),
  )
)
  throw new Error(
    'times must be increasing, unique milliseconds in 0..120000, at most 120 frames',
  );
const runId = new Date().toISOString().replaceAll(':', '-');
// Request routing is confined to this fresh test context. A candidate can be
// inspected by the real game without replacing the asset served to the user.
const output = resolve(
  values.out ??
    join(projectRoot, 'outputs/visual-tools', `${runId}-${values.operation}`),
);
await mkdir(dirname(output), { recursive: true });
await mkdir(output); // Preserve earlier runs, including failed runs.
const manifest = {
  schemaVersion: 1,
  runId,
  operation: values.operation,
  scenario:
    values.operation === 'replay'
      ? 'equip-fire-reload-move-pause'
      : `${values.mode}:${values.weapon}:${values.action}:${values.pose}:${values.distance}:${values.subject}:${values.angle}:${values.variant}`,
  source: {
    revision: null,
    sha256: null,
    files: [],
    integratedAssets: [],
    overriddenAssets: [],
    assetCandidates: [],
  },
  settings: {
    viewport,
    pixelRatio: 1,
    quality: values.quality,
    seed,
    skeleton: values.skeleton,
  },
  captureRule:
    'same-page fixed sample, PNG canvas screenshot, actual snapshot metadata',
  frames: [],
  errors: [],
  console: [],
  status: 'incomplete',
  stage: 'created',
};
const writeManifest = async () => {
  await writeFile(
    join(output, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
};

let browser;
let context;
let page;
let assetRecorder;
const assetCandidates = [];

await runCaptureAttempt({
  manifest,
  writeManifest,
  cleanup: async () => {
    await closeCaptureResources({
      page,
      context,
      browser,
      onCleanupError: (message) => manifest.errors.push(message),
    });
  },
  run: async () => {
    manifest.stage = 'candidate-assets';
    for (const [option, requestPath] of [
      ['ct-asset', '/assets/characters/ct-mpfb.glb'],
      ['carbine-asset', '/assets/viewmodels/m4a1.glb'],
      ['pistol-asset', '/assets/viewmodels/glock18.glb'],
    ]) {
      if (!values[option]) {
        continue;
      }

      const path = resolve(values[option]);
      const bytes = await readFile(path);
      const isCompleteGlb =
        bytes.length >= 20 &&
        bytes.readUInt32LE(0) === 0x46546c67 &&
        bytes.readUInt32LE(4) === 2 &&
        bytes.readUInt32LE(8) === bytes.length;

      if (!isCompleteGlb) {
        throw new Error(
          `${option} must be a complete glTF 2 GLB file: ${path}`,
        );
      }

      assetCandidates.push({
        bytes,
        record: {
          requestPath,
          captureUrl: new URL(requestPath, origin).href,
          path,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          requestsServed: 0,
        },
      });
    }

    manifest.stage = 'source-hash';
    const sourceFiles = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { cwd: projectRoot, encoding: 'utf8' },
    )
      .split('\0')
      .filter(
        (path) =>
          /^(app|scripts)\//.test(path) ||
          ['package.json', 'package-lock.json'].includes(path),
      )
      .sort();
    const sourceHash = createHash('sha256');

    for (const path of sourceFiles) {
      sourceHash.update(path).update(await readFile(join(projectRoot, path)));
    }

    manifest.source.revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();
    manifest.source.sha256 = sourceHash.digest('hex');
    manifest.source.files = sourceFiles;
    manifest.source.assetCandidates = assetCandidates.map(
      (candidate) => candidate.record,
    );

    manifest.stage = 'browser-launch';
    browser = await chromium.launch({
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist'],
    });

    manifest.stage = 'context-setup';
    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });

    for (const candidate of assetCandidates) {
      await context.route(candidate.record.captureUrl, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'model/gltf-binary',
          body: candidate.bytes,
        });
        candidate.record.requestsServed += 1;
      });
    }

    // Seed before page initialization so reloads repeat material/content random choices.
    manifest.stage = 'context-initialization';
    await context.addInitScript(
      ({ seed, quality }) => {
        let state = seed >>> 0;
        Math.random = () => {
          state += 0x6d2b79f5;
          let value = state;
          value = Math.imul(value ^ (value >>> 15), value | 1);
          value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
          return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
        localStorage.setItem('dustline-settings', JSON.stringify({ quality }));
        window.__dustlineCapture = {
          audioEvents: [],
          frameIntervalsMs: [],
          previousFrame: null,
        };
        const observeFrame = (timestamp) => {
          const trace = window.__dustlineCapture;
          if (
            trace.previousFrame !== null &&
            trace.frameIntervalsMs.length < 2000
          ) {
            trace.frameIntervalsMs.push(timestamp - trace.previousFrame);
          }
          trace.previousFrame = timestamp;
          requestAnimationFrame(observeFrame);
        };
        requestAnimationFrame(observeFrame);
        for (const nodeType of [
          window.AudioBufferSourceNode,
          window.OscillatorNode,
        ]) {
          if (!nodeType) {
            continue;
          }
          const original = nodeType.prototype.start;
          nodeType.prototype.start = function (...args) {
            const trace = window.__dustlineCapture;
            if (trace.audioEvents.length < 1000) {
              trace.audioEvents.push({
                nodeType: nodeType.name,
                wallTimeMs: performance.now(),
                audioTimeSeconds: this.context.currentTime,
                scheduledSeconds: args[0] ?? 0,
                contextState: this.context.state,
              });
            }
            return original.apply(this, args);
          };
        }
      },
      { seed, quality: values.quality },
    );

    manifest.stage = 'page-setup';
    page = await context.newPage();
    assetRecorder = createServedAssetRecorder({ origin, assetCandidates });
    page.on('pageerror', (error) => manifest.errors.push(error.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        manifest.console.push({ type: message.type(), text: message.text() });
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        manifest.errors.push(`HTTP ${response.status()} ${response.url()}`);
      }

      assetRecorder.observe(response);
    });

    async function navigate(timeMs) {
      const url = new URL(origin);
      url.searchParams.set('visual-tools', '1');
      url.searchParams.set('keyboard-playtest', '1');
      if (values.operation === 'preview') {
        for (const [key, value] of Object.entries({
          'visual-qa': values.mode,
          weapon: values.weapon,
          action: values.action,
          time: String(timeMs / 1000),
          pose: values.pose,
          distance: values.distance,
          subject: values.subject,
          angle: values.angle,
          variant: values.variant,
        })) {
          url.searchParams.set(key, value);
        }
      }
      await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForFunction(
        () => Boolean(window.dustlineVisualTools),
        null,
        {
          timeout: 60000,
        },
      );
      await page.evaluate(async (skeleton) => {
        await window.dustlineVisualTools.previewAsset({ skeleton });
      }, values.skeleton);
      return url.href;
    }

    try {
      manifest.stage = 'capture';
      let route;
      if (values.operation === 'replay') {
        route = await navigate(0);
        await page.evaluate(
          (seed) => window.dustlineVisualTools.prepareReplay({ seed }),
          seed,
        );
      }
      for (const timestampMs of times) {
        if (values.operation === 'preview') {
          route = await navigate(timestampMs);
        }
        const started = performance.now();
        const metadata = await page.evaluate(
          ({ operation, timestampMs }) =>
            operation === 'replay'
              ? window.dustlineVisualTools.advanceReplayTo(timestampMs)
              : window.dustlineVisualTools.snapshot(),
          { operation: values.operation, timestampMs },
        );
        const id = `${String(timestampMs).padStart(5, '0')}ms`;
        await page
          .locator('canvas')
          .first()
          .screenshot({
            path: join(output, `${id}.png`),
            animations: 'disabled',
          });
        await writeFile(
          join(output, `${id}.dom.txt`),
          await page.locator('body').innerText(),
        );
        manifest.frames.push({
          id,
          image: `${id}.png`,
          timestampMs,
          route,
          metadata,
          captureElapsedMs: performance.now() - started,
        });
        manifest.observations = await page.evaluate(
          () => window.__dustlineCapture,
        );
        manifest.observations.scope =
          'Observed wall-frame intervals include tool and screenshot overhead; accelerated replay audio scheduling is not a real-time listening test.';
        await writeFile(
          join(output, 'manifest.json'),
          JSON.stringify(manifest, null, 2),
        );
      }
      for (const { record } of assetCandidates) {
        if (record.requestsServed === 0) {
          manifest.errors.push(
            `Candidate was not requested by the renderer: ${record.requestPath}`,
          );
        }
      }
      manifest.status =
        manifest.errors.length ||
        manifest.console.some((entry) => entry.type === 'error')
          ? 'failed'
          : 'captured';
    } finally {
      await assetRecorder.settle();
      manifest.source.integratedAssets = assetRecorder.integratedAssets;
      manifest.source.overriddenAssets = assetRecorder.overriddenAssets;
      manifest.errors.push(...assetRecorder.errors);

      if (manifest.errors.length) {
        manifest.status = 'failed';
      }
    }
  },
});
console.log(join(output, 'manifest.json'));
if (manifest.status === 'failed') {
  console.error(manifest.errors.join('\n'));
  process.exitCode = 1;
}
