import { readFileSync, realpathSync, statSync } from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';

export const CAPTURE_SCHEMA_VERSION = 1;
const IMAGE_MIME_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
const REVIEW_STATUSES = new Set(['approved', 'rejected', 'unreviewed']);

export function htmlEscape(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  );
}

export function readCaptureManifest(manifestPath) {
  const absolutePath = resolve(manifestPath);
  let document;
  try {
    document = JSON.parse(readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Cannot read capture manifest ${absolutePath}: ${error.message}`,
    );
  }
  const errors = validateCaptureManifest(document);
  if (errors.length)
    throw new Error(`${absolutePath} is invalid:\n- ${errors.join('\n- ')}`);
  return { path: absolutePath, directory: dirname(absolutePath), document };
}

export function validateCaptureManifest(manifest) {
  const errors = [];
  const mustBeString = (value, label) => {
    if (typeof value !== 'string' || !value.trim())
      errors.push(`${label} must be a non-empty string`);
  };
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
    return ['manifest must be an object'];
  if (manifest.schemaVersion !== CAPTURE_SCHEMA_VERSION)
    errors.push(`schemaVersion must be ${CAPTURE_SCHEMA_VERSION}`);
  for (const key of ['runId', 'operation']) mustBeString(manifest[key], key);
  if (manifest.scenario === undefined || manifest.scenario === null)
    errors.push('scenario is required');
  mustBeString(manifest.captureRule, 'captureRule');
  if (manifest.status !== 'captured')
    errors.push(
      'status must be captured; incomplete or failed captures cannot compare',
    );
  if (!Array.isArray(manifest.errors)) errors.push('errors must be an array');
  else if (manifest.errors.length)
    errors.push('errors must be empty before comparison');
  if (!Array.isArray(manifest.console)) errors.push('console must be an array');
  else if (manifest.console.some((entry) => entry?.type === 'error'))
    errors.push('console must not contain error entries before comparison');
  const settings = manifest.settings;
  if (!settings || typeof settings !== 'object')
    errors.push('settings is required');
  else {
    const viewport = settings.viewport;
    if (
      !viewport ||
      !positiveNumber(viewport.width) ||
      !positiveNumber(viewport.height)
    ) {
      errors.push(
        'settings.viewport.width and settings.viewport.height must be positive numbers',
      );
    }
    if (!positiveNumber(settings.pixelRatio))
      errors.push('settings.pixelRatio must be a positive number');
    if (!('quality' in settings)) errors.push('settings.quality is required');
    if (!('seed' in settings)) errors.push('settings.seed is required');
  }
  if (!Array.isArray(manifest.frames) || manifest.frames.length === 0)
    errors.push('frames must be a non-empty array');
  else {
    const seenIds = new Set();
    manifest.frames.forEach((frame, index) => {
      const label = `frames[${index}]`;
      if (!frame || typeof frame !== 'object')
        return errors.push(`${label} must be an object`);
      mustBeString(frame.id, `${label}.id`);
      if (seenIds.has(frame.id))
        errors.push(`${label}.id duplicates ${frame.id}`);
      seenIds.add(frame.id);
      mustBeString(frame.image, `${label}.image`);
      if (isAbsolute(frame.image) || frame.image.split(/[\\/]/).includes('..'))
        errors.push(`${label}.image must be a local relative path without ..`);
      if (!Number.isFinite(frame.timestampMs) || frame.timestampMs < 0)
        errors.push(`${label}.timestampMs must be a non-negative number`);
      const metadata = frame.metadata;
      if (!metadata || typeof metadata !== 'object')
        return errors.push(`${label}.metadata is required`);
      const camera = metadata.camera;
      if (
        !camera ||
        !positiveNumber(camera.fov) ||
        !vector(camera.position) ||
        !vector(camera.rotation)
      ) {
        errors.push(
          `${label}.metadata.camera requires positive fov and 3-number position/rotation`,
        );
      }
      if (
        !metadata.renderer ||
        typeof metadata.renderer.route !== 'string' ||
        !metadata.renderer.route
      )
        errors.push(`${label}.metadata.renderer.route is required`);
      if (!('light' in metadata))
        errors.push(`${label}.metadata.light is required`);
      const frameViewport = metadata.viewport;
      if (
        !frameViewport ||
        !positiveNumber(frameViewport.width) ||
        !positiveNumber(frameViewport.height)
      ) {
        errors.push(
          `${label}.metadata.viewport.width and ${label}.metadata.viewport.height must be positive numbers`,
        );
      } else if ('pixelRatio' in frameViewport) {
        if (!positiveNumber(frameViewport.pixelRatio))
          errors.push(
            `${label}.metadata.viewport.pixelRatio must be a positive number when present`,
          );
        else if (settings && frameViewport.pixelRatio !== settings.pixelRatio)
          errors.push(
            `${label}.metadata.viewport.pixelRatio must match settings.pixelRatio`,
          );
      }
      const frameQuality = metadata.renderer?.quality ?? metadata.quality;
      if (
        frameQuality !== undefined &&
        settings &&
        frameQuality !== settings.quality
      ) {
        errors.push(
          `${label} renderer quality must match settings.quality when present`,
        );
      }
    });
  }
  if (manifest.annotations !== undefined) {
    if (
      !manifest.annotations ||
      typeof manifest.annotations !== 'object' ||
      Array.isArray(manifest.annotations)
    )
      errors.push('annotations must be an object keyed by frame id');
    else
      for (const [frameId, annotation] of Object.entries(
        manifest.annotations,
      )) {
        if (!annotation || typeof annotation !== 'object')
          errors.push(`annotations.${frameId} must be an object`);
        else {
          if (!REVIEW_STATUSES.has(annotation.status))
            errors.push(
              `annotations.${frameId}.status must be approved, rejected, or unreviewed`,
            );
          mustBeString(annotation.reason, `annotations.${frameId}.reason`);
          mustBeString(
            annotation.provenance,
            `annotations.${frameId}.provenance`,
          );
        }
      }
  }
  return errors;
}

export function resolveLocalImage(manifest, imagePath) {
  if (isAbsolute(imagePath) || imagePath.split(/[\\/]/).includes('..'))
    throw new Error(`Image path is not local to manifest: ${imagePath}`);
  const candidate = resolve(manifest.directory, imagePath);
  const manifestRoot = realpathSync(manifest.directory);
  let actualPath;
  try {
    actualPath = realpathSync(candidate);
  } catch {
    throw new Error(
      `Missing image ${imagePath} beside ${basename(manifest.path)}`,
    );
  }
  if (
    relative(manifestRoot, actualPath).startsWith('..') ||
    isAbsolute(relative(manifestRoot, actualPath))
  ) {
    throw new Error(`Image escapes manifest directory: ${imagePath}`);
  }
  if (!statSync(actualPath).isFile())
    throw new Error(`Image is not a file: ${imagePath}`);
  const mime = IMAGE_MIME_TYPES.get(extname(actualPath).toLowerCase());
  if (!mime) throw new Error(`Unsupported image type for ${imagePath}`);
  return {
    path: actualPath,
    mime,
    dataUrl: `data:${mime};base64,${readFileSync(actualPath).toString('base64')}`,
  };
}

export function normalized(value) {
  return JSON.stringify(value);
}
export function reviewAnnotation(manifest, frameId) {
  return (
    manifest.document.annotations?.[frameId] ?? {
      status: 'unreviewed',
      reason: 'No review decision recorded in this capture manifest.',
      provenance: 'manifest default',
    }
  );
}

export function compatibilityErrors(reference, previous, candidate) {
  const errors = [];
  const labeled = [
    ['reference', reference],
    ['previous', previous],
    ['candidate', candidate],
  ];
  for (const [label, manifest] of labeled.slice(1)) {
    for (const field of [
      'operation',
      'scenario',
      'captureRule',
      'settings.viewport',
      'settings.pixelRatio',
      'settings.quality',
      'settings.seed',
      'settings.skeleton',
    ]) {
      const referenceValue = field
        .split('.')
        .reduce((value, key) => value[key], reference.document);
      const candidateValue = field
        .split('.')
        .reduce((value, key) => value[key], manifest.document);
      if (normalized(referenceValue) !== normalized(candidateValue))
        errors.push(`${label} ${field} differs from reference`);
    }
  }
  const framesById = new Map(
    labeled.map(([label, manifest]) => [
      label,
      new Map(manifest.document.frames.map((frame) => [frame.id, frame])),
    ]),
  );
  const ids = [
    ...new Set(
      labeled.flatMap(([, manifest]) =>
        manifest.document.frames.map((frame) => frame.id),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
  for (const id of ids) {
    const frames = labeled.map(([label]) => [
      label,
      framesById.get(label).get(id),
    ]);
    if (frames.some(([, frame]) => !frame)) continue;
    for (const field of [
      'timestampMs',
      'metadata.camera',
      'metadata.light',
      'metadata.viewport',
      'metadata.renderer',
    ]) {
      const read = (frame) =>
        field.split('.').reduce((value, key) => value?.[key], frame);
      const first = read(frames[0][1]);
      for (const [label, frame] of frames.slice(1))
        if (normalized(first) !== normalized(read(frame)))
          errors.push(`frame ${id}: ${label} ${field} differs from reference`);
    }
  }
  return { errors, ids, framesById };
}

function positiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}
function vector(value) {
  return (
    Array.isArray(value) && value.length === 3 && value.every(Number.isFinite)
  );
}
