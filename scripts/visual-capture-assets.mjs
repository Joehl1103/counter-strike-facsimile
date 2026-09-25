import { createHash } from 'node:crypto';

function isAssetResponse(response, origin) {
  if (!response.ok()) {
    return false;
  }

  const url = new URL(response.url());
  const resourceType = response.request().resourceType();
  const servedFromPublicAssets =
    url.origin === origin.origin && url.pathname.startsWith('/assets/');
  const assetExtension =
    /\.(avif|basis|dds|gif|gltf|glb|jpeg|jpg|ktx2|png|webp)$/i;
  const responseMimeType = response.headers()['content-type'] ?? '';
  const renderableMimeType = /^(image\/|model\/)/i.test(responseMimeType);
  const externalRenderableAsset =
    resourceType === 'image' ||
    resourceType === 'font' ||
    assetExtension.test(url.pathname) ||
    renderableMimeType;

  return servedFromPublicAssets || externalRenderableAsset;
}

function getOverrideCandidate(response, assetCandidates) {
  return (
    assetCandidates.find(
      (candidate) => candidate.record.captureUrl === response.url(),
    ) ?? null
  );
}

function createAssetRecord(response, bytes) {
  return {
    url: response.url(),
    resourceType: response.request().resourceType(),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

export function createServedAssetRecorder({ origin, assetCandidates }) {
  const pendingRecords = new Set();
  const integratedRecords = new Map();
  const overriddenRecords = new Map();
  const errors = [];

  const observe = (response) => {
    if (!isAssetResponse(response, origin)) {
      return;
    }

    const recordPromise = response
      .body()
      .then((bytes) => {
        const assetRecord = createAssetRecord(response, bytes);
        const override = getOverrideCandidate(response, assetCandidates);

        if (override) {
          const recordKey = `${assetRecord.url}\u0000${assetRecord.sha256}`;
          overriddenRecords.set(recordKey, {
            ...assetRecord,
            requestPath: override.record.requestPath,
          });
          return;
        }

        const recordKey = `${assetRecord.url}\u0000${assetRecord.sha256}`;
        integratedRecords.set(recordKey, assetRecord);
      })
      .catch((error) => {
        errors.push(
          `Unable to record served asset ${response.url()}: ${String(error)}`,
        );
      })
      .finally(() => {
        pendingRecords.delete(recordPromise);
      });

    pendingRecords.add(recordPromise);
  };

  const settle = async () => {
    while (pendingRecords.size) {
      await Promise.all(pendingRecords);
    }
  };

  return {
    observe,
    settle,
    errors,
    get integratedAssets() {
      return [...integratedRecords.values()].sort(
        (left, right) =>
          left.url.localeCompare(right.url) ||
          left.sha256.localeCompare(right.sha256),
      );
    },
    get overriddenAssets() {
      return [...overriddenRecords.values()].sort(
        (left, right) =>
          left.url.localeCompare(right.url) ||
          left.sha256.localeCompare(right.sha256),
      );
    },
  };
}
