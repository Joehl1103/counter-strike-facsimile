import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createServedAssetRecorder } from '../scripts/visual-capture-assets.mjs';

function response({
  url,
  resourceType,
  body,
}: {
  url: string;
  resourceType: string;
  body: Buffer | Promise<Buffer>;
}) {
  return {
    url: () => url,
    ok: () => true,
    request: () => ({ resourceType: () => resourceType }),
    headers: () => ({}),
    body: async () => await body,
  };
}

void test('served asset records hash the response bytes and distinguish an override', async () => {
  const overrideBytes = Buffer.from('candidate glb');
  const recorder = createServedAssetRecorder({
    origin: new URL('http://localhost:3040'),
    assetCandidates: [
      {
        record: {
          requestPath: '/assets/viewmodels/glock18.glb',
          captureUrl: 'http://localhost:3040/assets/viewmodels/glock18.glb',
          sha256: createHash('sha256').update(overrideBytes).digest('hex'),
          requestsServed: 1,
        },
      },
    ],
  });

  recorder.observe(
    response({
      url: 'http://localhost:3040/assets/viewmodels/glock18.glb',
      resourceType: 'fetch',
      body: overrideBytes,
    }),
  );
  recorder.observe(
    response({
      url: 'https://textures.example.test/dust.png',
      resourceType: 'image',
      body: Buffer.from('served texture'),
    }),
  );

  await recorder.settle();

  assert.deepEqual(recorder.integratedAssets, [
    {
      url: 'https://textures.example.test/dust.png',
      resourceType: 'image',
      bytes: 14,
      sha256: createHash('sha256').update('served texture').digest('hex'),
    },
  ]);
  assert.deepEqual(recorder.overriddenAssets, [
    {
      url: 'http://localhost:3040/assets/viewmodels/glock18.glb',
      requestPath: '/assets/viewmodels/glock18.glb',
      resourceType: 'fetch',
      bytes: 13,
      sha256: createHash('sha256').update(overrideBytes).digest('hex'),
    },
  ]);
  assert.deepEqual(recorder.errors, []);
});

void test('served asset response-body failures become manifest errors before finalization', async () => {
  const recorder = createServedAssetRecorder({
    origin: new URL('http://localhost:3040'),
    assetCandidates: [],
  });
  recorder.observe({
    url: () => 'http://localhost:3040/assets/characters/ct-mpfb.glb',
    ok: () => true,
    request: () => ({ resourceType: () => 'fetch' }),
    headers: () => ({}),
    body: async () => {
      throw new Error('body read failed');
    },
  });

  await recorder.settle();

  assert.deepEqual(recorder.integratedAssets, []);
  assert.match(recorder.errors.join('\n'), /body read failed/);
});

void test('a changed response at the same served URL changes the recorded hash', async () => {
  const recorder = createServedAssetRecorder({
    origin: new URL('http://localhost:3040'),
    assetCandidates: [],
  });
  const url = 'http://localhost:3040/assets/textures/dust.png';

  recorder.observe(
    response({
      url,
      resourceType: 'image',
      body: Buffer.from('first served texture'),
    }),
  );
  await recorder.settle();
  const firstHash = recorder.integratedAssets[0].sha256;

  recorder.observe(
    response({
      url,
      resourceType: 'image',
      body: Buffer.from('second served texture'),
    }),
  );
  await recorder.settle();

  assert.equal(recorder.integratedAssets.length, 2);
  assert.ok(
    recorder.integratedAssets.some((asset) => asset.sha256 === firstHash),
  );
  assert.ok(recorder.integratedAssets.some((asset) => asset.bytes === 21));
});

void test('settling waits for repeated asynchronous asset responses', async () => {
  let releaseFirstResponse: (bytes: Buffer) => void = () => undefined;
  let releaseSecondResponse: (bytes: Buffer) => void = () => undefined;
  const firstBody = new Promise<Buffer>((resolve) => {
    releaseFirstResponse = resolve;
  });
  const secondBody = new Promise<Buffer>((resolve) => {
    releaseSecondResponse = resolve;
  });
  const recorder = createServedAssetRecorder({
    origin: new URL('http://localhost:3040'),
    assetCandidates: [],
  });

  recorder.observe(
    response({
      url: 'http://localhost:3040/assets/characters/ct-mpfb.glb',
      resourceType: 'fetch',
      body: firstBody,
    }),
  );
  recorder.observe(
    response({
      url: 'http://localhost:3040/assets/viewmodels/m4a1.glb',
      resourceType: 'fetch',
      body: secondBody,
    }),
  );
  const settled = recorder.settle();
  releaseFirstResponse(Buffer.from('first response'));
  releaseSecondResponse(Buffer.from('second response'));

  await settled;

  assert.deepEqual(recorder.errors, []);
  assert.deepEqual(
    recorder.integratedAssets.map((asset) => asset.url),
    [
      'http://localhost:3040/assets/characters/ct-mpfb.glb',
      'http://localhost:3040/assets/viewmodels/m4a1.glb',
    ],
  );
});

void test('a texture loaded through fetch is recorded from its served response bytes', async () => {
  const recorder = createServedAssetRecorder({
    origin: new URL('http://localhost:3040'),
    assetCandidates: [],
  });

  recorder.observe(
    response({
      url: 'https://textures.example.test/sandstone.ktx2',
      resourceType: 'fetch',
      body: Buffer.from('external texture bytes'),
    }),
  );
  await recorder.settle();

  assert.equal(recorder.integratedAssets.length, 1);
  assert.equal(recorder.integratedAssets[0].resourceType, 'fetch');
});

void test('an override label requires the route URL including its query string', async () => {
  const recorder = createServedAssetRecorder({
    origin: new URL('http://localhost:3040'),
    assetCandidates: [
      {
        record: {
          requestPath: '/assets/viewmodels/glock18.glb',
          captureUrl: 'http://localhost:3040/assets/viewmodels/glock18.glb',
        },
      },
    ],
  });

  recorder.observe(
    response({
      url: 'http://localhost:3040/assets/viewmodels/glock18.glb?revision=2',
      resourceType: 'fetch',
      body: Buffer.from('different served request'),
    }),
  );
  await recorder.settle();

  assert.equal(recorder.overriddenAssets.length, 0);
  assert.equal(recorder.integratedAssets.length, 1);
});
