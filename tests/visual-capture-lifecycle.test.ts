import assert from 'node:assert/strict';
import test from 'node:test';
import {
  closeCaptureResources,
  runCaptureAttempt,
} from '../scripts/visual-capture-lifecycle.mjs';

void test('launch failure retains the initial manifest without attempting unavailable cleanup', async () => {
  const writes: { stage: string; status: string; errors: string[] }[] = [];
  const closed: string[] = [];
  const manifest = {
    stage: 'browser-launch',
    status: 'incomplete',
    errors: [] as string[],
  };

  await runCaptureAttempt({
    manifest,
    writeManifest: async () => {
      writes.push({ ...manifest, errors: [...manifest.errors] });
    },
    run: async () => {
      throw new Error('injected launch failure');
    },
    cleanup: async () => {
      await closeCaptureResources({
        browser: undefined,
        context: undefined,
        page: undefined,
        onCleanupError: (message: string) => manifest.errors.push(message),
      });
    },
  });

  assert.deepEqual(writes[0], {
    stage: 'browser-launch',
    status: 'incomplete',
    errors: [],
  });
  assert.equal(manifest.status, 'failed');
  assert.equal(manifest.stage, 'browser-launch');
  assert.match(manifest.errors.join('\n'), /injected launch failure/);
  assert.deepEqual(closed, []);
  assert.deepEqual(writes.at(-1), {
    stage: 'browser-launch',
    status: 'failed',
    errors: ['Error: injected launch failure'],
  });
});

void test('context setup failure closes only the allocated browser', async () => {
  const closed: string[] = [];
  const manifest = {
    stage: 'context-setup',
    status: 'incomplete',
    errors: [] as string[],
  };

  await runCaptureAttempt({
    manifest,
    writeManifest: async () => undefined,
    run: async () => {
      throw new Error('injected context failure');
    },
    cleanup: async () => {
      await closeCaptureResources({
        browser: { close: async () => closed.push('browser') },
        context: undefined,
        page: undefined,
        onCleanupError: (message: string) => manifest.errors.push(message),
      });
    },
  });

  assert.match(manifest.errors.join('\n'), /injected context failure/);
  assert.deepEqual(closed, ['browser']);
});

void test('page setup failure closes the allocated context and browser', async () => {
  const closed: string[] = [];
  const manifest = {
    stage: 'page-setup',
    status: 'incomplete',
    errors: [] as string[],
  };

  await runCaptureAttempt({
    manifest,
    writeManifest: async () => undefined,
    run: async () => {
      throw new Error('injected page failure');
    },
    cleanup: async () => {
      await closeCaptureResources({
        browser: { close: async () => closed.push('browser') },
        context: { close: async () => closed.push('context') },
        page: undefined,
        onCleanupError: (message: string) => manifest.errors.push(message),
      });
    },
  });

  assert.match(manifest.errors.join('\n'), /injected page failure/);
  assert.deepEqual(closed, ['context', 'browser']);
});

void test('cleanup failure is recorded without replacing the original capture error', async () => {
  const manifest = {
    stage: 'page-setup',
    status: 'incomplete',
    errors: [] as string[],
  };

  await runCaptureAttempt({
    manifest,
    writeManifest: async () => undefined,
    run: async () => {
      throw new Error('original page setup failure');
    },
    cleanup: async () => {
      await closeCaptureResources({
        browser: {
          close: async () => {
            throw new Error('injected browser cleanup failure');
          },
        },
        context: undefined,
        page: undefined,
        onCleanupError: (message: string) => manifest.errors.push(message),
      });
    },
  });

  assert.equal(manifest.status, 'failed');
  assert.match(manifest.errors[0], /original page setup failure/);
  assert.match(manifest.errors[1], /browser cleanup failed/);
});

void test('cleanup failure changes an otherwise captured attempt to failed', async () => {
  const manifest = {
    stage: 'capture',
    status: 'incomplete',
    errors: [] as string[],
  };

  await runCaptureAttempt({
    manifest,
    writeManifest: async () => undefined,
    run: async () => {
      manifest.status = 'captured';
    },
    cleanup: async () => {
      await closeCaptureResources({
        browser: {
          close: async () => {
            throw new Error('injected browser cleanup failure');
          },
        },
        context: undefined,
        page: undefined,
        onCleanupError: (message: string) => manifest.errors.push(message),
      });
    },
  });

  assert.equal(manifest.status, 'failed');
  assert.match(manifest.errors.join('\n'), /browser cleanup failed/);
});
