import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { afterEach, test } from 'node:test';

import { readBearerKey, startRelay } from './ollama-relay.mjs';

const servers = [];

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise((resolve) => server.close(resolve));
  }
});

async function listenLocally(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const port = server.address().port;
  return new URL(`http://127.0.0.1:${port}/v1/responses`);
}

test('keeps provider punctuation unchanged while rejecting invalid header bytes', async () => {
  const validInput = Readable.from([Buffer.from('ollama.part+one/two==')]);
  const bearerKey = await readBearerKey(validInput);
  assert.equal(bearerKey, 'ollama.part+one/two==');

  const invalidInput = Readable.from([Buffer.from('ollama-key\n')]);
  await assert.rejects(readBearerKey(invalidInput), /cannot appear in a header/);
});

test('forwards only a local Responses request with the unchanged provider key', async () => {
  const upstreamRequests = [];
  const upstreamServer = createServer(async (request, response) => {
    const requestChunks = [];
    for await (const chunk of request) {
      requestChunks.push(chunk);
    }

    upstreamRequests.push({
      method: request.method,
      path: request.url,
      authorization: request.headers.authorization,
      body: Buffer.concat(requestChunks).toString('utf8'),
    });

    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.end('data: {"ok":true}\n\n');
  });

  const upstreamUrl = await listenLocally(upstreamServer);
  const relayServer = await startRelay({
    bearerKey: 'ollama.part+one/two==',
    upstreamUrl,
  });
  servers.push(relayServer);

  const relayPort = relayServer.address().port;
  const relayUrl = `http://127.0.0.1:${relayPort}/v1/responses`;
  const response = await fetch(relayUrl, {
    method: 'POST',
    headers: {
      authorization: 'Bearer local-review-relay',
      'content-type': 'application/json',
      accept: 'text/event-stream',
    },
    body: JSON.stringify({ model: 'gpt-oss:120b' }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  assert.equal(await response.text(), 'data: {"ok":true}\n\n');
  assert.deepEqual(upstreamRequests, [{
    method: 'POST',
    path: '/v1/responses',
    authorization: 'Bearer ollama.part+one/two==',
    body: JSON.stringify({ model: 'gpt-oss:120b' }),
  }]);
});

test('rejects other paths, methods, and local credentials before contacting upstream', async () => {
  let upstreamCalls = 0;
  const upstreamServer = createServer((_request, response) => {
    upstreamCalls += 1;
    response.end('unexpected');
  });

  const upstreamUrl = await listenLocally(upstreamServer);
  const relayServer = await startRelay({ bearerKey: 'fake.provider.key', upstreamUrl });
  servers.push(relayServer);

  const relayBase = `http://127.0.0.1:${relayServer.address().port}`;
  const requests = [
    { url: `${relayBase}/v1/models`, method: 'POST', authorization: 'Bearer local-review-relay' },
    { url: `${relayBase}/v1/responses`, method: 'GET', authorization: 'Bearer local-review-relay' },
    { url: `${relayBase}/v1/responses`, method: 'POST', authorization: 'Bearer wrong-token' },
  ];

  for (const request of requests) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: { authorization: request.authorization },
    });
    assert.equal(response.status, 403);
    await response.text();
  }

  assert.equal(upstreamCalls, 0);
});

test('preserves an upstream authorization failure without exposing the key', async () => {
  const upstreamServer = createServer((_request, response) => {
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end('{"error":"unauthorized"}');
  });

  const upstreamUrl = await listenLocally(upstreamServer);
  const relayServer = await startRelay({ bearerKey: 'fake.provider.key', upstreamUrl });
  servers.push(relayServer);

  const relayUrl = `http://127.0.0.1:${relayServer.address().port}/v1/responses`;
  const response = await fetch(relayUrl, {
    method: 'POST',
    headers: { authorization: 'Bearer local-review-relay' },
    body: '{}',
  });

  assert.equal(response.status, 401);
  assert.equal(await response.text(), '{"error":"unauthorized"}');
});
