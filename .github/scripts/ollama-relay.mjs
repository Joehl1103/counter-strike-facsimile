import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { chmodSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OLLAMA_RESPONSES_URL = new URL('https://ollama.com/v1/responses');
const LOCAL_AUTHORIZATION = 'Bearer local-review-relay';
const MAX_KEY_BYTES = 8192;
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 15 * 60 * 1000;

// The key is delivered on stdin, then held only by this root-owned process.
export async function readBearerKey(input) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of input) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_KEY_BYTES) {
      throw new Error('Ollama key exceeds the relay input limit.');
    }

    chunks.push(chunk);
  }

  const keyBytes = Buffer.concat(chunks);
  if (keyBytes.length === 0) {
    throw new Error('Ollama key is missing.');
  }

  // HTTP headers cannot contain control bytes. Do not constrain the provider's
  // punctuation or transform a valid key to satisfy the Codex proxy's format.
  const containsInvalidHeaderByte = keyBytes.some((byte) => byte < 33 || byte > 126);
  if (containsInvalidHeaderByte) {
    keyBytes.fill(0);
    throw new Error('Ollama key contains a byte that cannot appear in a header.');
  }

  const bearerKey = keyBytes.toString('ascii');
  keyBytes.fill(0);
  return bearerKey;
}

// Bound requests before forwarding; the reviewer never needs arbitrary paths.
async function readRequestBody(incomingRequest) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of incomingRequest) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new Error('request-too-large');
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

function sendError(response, statusCode, message) {
  if (response.destroyed) {
    return;
  }

  if (!response.headersSent) {
    response.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  }

  response.end(message);
}

// Forward only the request body and safe protocol headers to the fixed upstream.
async function forwardResponsesRequest(incomingRequest, outgoingResponse, bearerKey, upstreamUrl) {
  let requestBody;
  try {
    requestBody = await readRequestBody(incomingRequest);
  } catch (error) {
    if (error.message === 'request-too-large') {
      sendError(outgoingResponse, 413, 'Responses request is too large.');
      return;
    }

    sendError(outgoingResponse, 400, 'Could not read Responses request.');
    return;
  }

  const requestHeaders = {
    authorization: `Bearer ${bearerKey}`,
    'content-type': incomingRequest.headers['content-type'] || 'application/json',
    'content-length': requestBody.length,
  };

  if (incomingRequest.headers.accept) {
    requestHeaders.accept = incomingRequest.headers.accept;
  }

  const sendUpstream = upstreamUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstreamRequest = sendUpstream(upstreamUrl, {
    method: 'POST',
    headers: requestHeaders,
  }, (upstreamResponse) => {
    const responseHeaders = {};
    for (const headerName of ['content-type', 'content-encoding', 'cache-control']) {
      const headerValue = upstreamResponse.headers[headerName];
      if (headerValue) {
        responseHeaders[headerName] = headerValue;
      }
    }

    outgoingResponse.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
    upstreamResponse.on('error', () => {
      console.error('Ollama relay upstream response failed.');
      outgoingResponse.destroy();
    });
    upstreamResponse.pipe(outgoingResponse);
  });

  upstreamRequest.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstreamRequest.destroy(new Error('upstream-timeout'));
  });

  upstreamRequest.on('error', (error) => {
    const timedOut = error.message === 'upstream-timeout';
    const statusCode = timedOut ? 504 : 502;
    console.error(`Ollama relay upstream request failed: ${statusCode}`);

    if (outgoingResponse.headersSent) {
      outgoingResponse.destroy();
      return;
    }

    sendError(outgoingResponse, statusCode, 'Ollama Responses request failed.');
  });

  outgoingResponse.on('close', () => {
    if (!outgoingResponse.writableFinished) {
      upstreamRequest.destroy();
    }
  });

  upstreamRequest.end(requestBody);
}

// Tests may supply a local upstream; the CLI always uses OLLAMA_RESPONSES_URL.
export async function startRelay({ bearerKey, upstreamUrl = OLLAMA_RESPONSES_URL }) {
  const server = createServer((incomingRequest, outgoingResponse) => {
    const allowedPath = incomingRequest.method === 'POST' &&
      incomingRequest.url === '/v1/responses';
    const authorizedLocally = incomingRequest.headers.authorization === LOCAL_AUTHORIZATION;

    if (!allowedPath || !authorizedLocally) {
      sendError(outgoingResponse, 403, 'Request forbidden.');
      return;
    }

    void forwardResponsesRequest(incomingRequest, outgoingResponse, bearerKey, upstreamUrl);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const serverInfoPath = process.argv[2];
  if (!serverInfoPath || process.getuid?.() !== 0) {
    throw new Error('The Ollama relay needs a server-info path and root ownership.');
  }

  const bearerKey = await readBearerKey(process.stdin);
  const server = await startRelay({ bearerKey });
  const serverPort = server.address().port;

  writeFileSync(serverInfoPath, JSON.stringify({ port: serverPort }), {
    flag: 'wx',
    mode: 0o444,
  });
  chmodSync(serverInfoPath, 0o444);
  console.error(`Ollama review relay listening on 127.0.0.1:${serverPort}`);
}
