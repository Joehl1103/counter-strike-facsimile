import assert from 'node:assert/strict';
import test from 'node:test';
import { withBrowserPage } from '../scripts/live-skeleton-capture-lifecycle.mjs';

void test('browser setup failure closes every resource allocated before the failure', async () => {
  const closed: string[] = [];
  const browser = { close: async () => closed.push('browser') };
  const context = { close: async () => closed.push('context') };
  const cleanupErrors: string[] = [];

  await assert.rejects(
    withBrowserPage({
      launchBrowser: async () => browser,
      createContext: async () => context,
      createPage: async () => {
        throw new Error('injected page setup failure');
      },
      run: async () => assert.fail('run must not start after page setup failure'),
      onCleanupError: (message: string) => cleanupErrors.push(message),
    }),
    /injected page setup failure/,
  );

  assert.deepEqual(closed, ['context', 'browser']);
  assert.deepEqual(cleanupErrors, []);
});
