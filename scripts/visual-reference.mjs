#!/usr/bin/env node
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  htmlEscape,
  readCaptureManifest,
  resolveLocalImage,
  reviewAnnotation,
  validateCaptureManifest,
} from './visual-toolkit-common.mjs';

const HELP = `Usage:
  node scripts/visual-reference.mjs --manifest capture.json --out reference.html
  node scripts/visual-reference.mjs --library visual-tools/reference-library.json --out references.html
  node scripts/visual-reference.mjs --manifest capture.json --annotate frame-id --status approved|rejected|unreviewed --reason "..." --provenance "..." --write-manifest

The manifest operation builds a portable contact sheet. The library operation
embeds supported local raster references and lists non-raster source assets.
Library localPath values are resolved under library assetRoot. Annotation writes
only occur with --write-manifest and require an explicit status, reason, and provenance.`;
const IMAGE_MIME_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
const REVIEW_STATUSES = new Set(['approved', 'rejected', 'unreviewed']);

export function main(argumentsList) {
  const options = parseOptions(argumentsList);
  if (options.help) return { text: HELP, exitCode: 0 };
  if (options.annotate) return annotateManifest(options);
  if (options.library) return renderReferenceLibrary(options);
  if (!options.manifest || !options.out)
    throw new Error(
      'Both --manifest and --out are required. Use --help for usage.',
    );
  return renderCaptureManifest(options);
}

function renderCaptureManifest(options) {
  const manifest = readCaptureManifest(options.manifest);
  const body = manifest.document.frames
    .map((frame) => {
      const image = resolveLocalImage(manifest, frame.image);
      const annotation = reviewAnnotation(manifest, frame.id);
      return `<article><img src="${image.dataUrl}" alt="${htmlEscape(frame.id)}"><h2>${htmlEscape(frame.id)}</h2><p>${htmlEscape(annotation.status)} — ${htmlEscape(annotation.reason)}</p><p class="provenance">${htmlEscape(annotation.provenance)}</p><details><summary>Capture metadata</summary><pre>${htmlEscape(JSON.stringify(frame.metadata, null, 2))}</pre></details></article>`;
    })
    .join('\n');
  writeFileSync(
    resolve(options.out),
    page(
      `Reference contact sheet: ${manifest.document.runId}`,
      `<p>${htmlEscape(manifest.document.operation)} · scenario ${htmlEscape(JSON.stringify(manifest.document.scenario))}</p><section>${body}</section>`,
    ),
  );
  return { text: `Wrote ${resolve(options.out)}`, exitCode: 0 };
}

function renderReferenceLibrary(options) {
  if (!options.out)
    throw new Error('--library requires --out. Use --help for usage.');
  const library = readReferenceLibrary(options.library);
  const errors = [];
  const cards = library.document.entries
    .map((entry) => renderLibraryEntry(entry, library, errors))
    .join('\n');
  const errorList = errors.length
    ? `<aside class="errors"><h2>Reference-library failures</h2><ul>${errors.map((error) => `<li>${htmlEscape(error)}</li>`).join('')}</ul></aside>`
    : '';
  writeFileSync(
    resolve(options.out),
    page('Visual reference library', `${errorList}<section>${cards}</section>`),
  );
  return {
    text: `Wrote ${resolve(options.out)}${errors.length ? ` with ${errors.length} failure(s)` : ''}`,
    exitCode: errors.length ? 1 : 0,
  };
}

function renderLibraryEntry(entry, library, errors) {
  let preview =
    '<p class="missing">No embeddable raster preview for this source asset.</p>';
  try {
    const image = resolveLibraryImage(library, entry.localPath);
    if (image)
      preview = `<img src="${image.dataUrl}" alt="${htmlEscape(entry.id)}">`;
  } catch (error) {
    errors.push(`${entry.id}: ${error.message}`);
    preview = `<p class="missing">${htmlEscape(error.message)}</p>`;
  }
  const decision = entry.approval ?? 'unreviewed';
  const reason = entry.reason ?? entry.use ?? 'No review decision recorded.';
  return `<article>${preview}<h2>${htmlEscape(entry.id)}</h2><p>${htmlEscape(decision)} — ${htmlEscape(reason)}</p><p class="provenance">${htmlEscape(entry.provenance)}</p><details><summary>Source record</summary><pre>${htmlEscape(JSON.stringify(entry, null, 2))}</pre></details></article>`;
}

function annotateManifest(options) {
  if (!options.manifest || !options.writeManifest)
    throw new Error('--annotate requires --manifest and --write-manifest.');
  if (!REVIEW_STATUSES.has(options.status))
    throw new Error('--status must be approved, rejected, or unreviewed.');
  if (!options.reason?.trim() || !options.provenance?.trim())
    throw new Error('--annotate requires non-empty --reason and --provenance.');
  const manifest = readCaptureManifest(options.manifest);
  if (!manifest.document.frames.some((frame) => frame.id === options.annotate))
    throw new Error(`Unknown frame id: ${options.annotate}`);
  manifest.document.annotations ??= {};
  manifest.document.annotations[options.annotate] = {
    status: options.status,
    reason: options.reason,
    provenance: options.provenance,
  };
  const errors = validateCaptureManifest(manifest.document);
  if (errors.length)
    throw new Error(
      `Refusing to write invalid manifest:\n- ${errors.join('\n- ')}`,
    );
  writeFileSync(
    manifest.path,
    `${JSON.stringify(manifest.document, null, 2)}\n`,
  );
  return {
    text: `Recorded ${options.status} annotation for ${options.annotate} in ${manifest.path}`,
    exitCode: 0,
  };
}

function readReferenceLibrary(libraryPath) {
  const path = resolve(libraryPath);
  let document;
  try {
    document = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read reference library ${path}: ${error.message}`);
  }
  if (
    !document ||
    typeof document !== 'object' ||
    document.schemaVersion !== 1 ||
    !Array.isArray(document.entries)
  ) {
    throw new Error(
      `${path} must contain schemaVersion 1 and an entries array.`,
    );
  }
  if (typeof document.assetRoot !== 'string' || !document.assetRoot)
    throw new Error(`${path} must define a relative assetRoot.`);
  if (isAbsolute(document.assetRoot))
    throw new Error(`${path} assetRoot must be a relative path.`);
  return {
    path,
    directory: dirname(path),
    assetRoot: resolve(dirname(path), document.assetRoot),
    document,
  };
}

function resolveLibraryImage(library, localPath) {
  if (typeof localPath !== 'string' || !localPath)
    throw new Error('localPath must be a non-empty string');
  if (isAbsolute(localPath) || localPath.split(/[\\/]/).includes('..'))
    throw new Error(
      `localPath must be local and must not contain ..: ${localPath}`,
    );
  const libraryRoot = realpathSync(library.assetRoot);
  let path;
  try {
    path = realpathSync(resolve(libraryRoot, localPath));
  } catch {
    throw new Error(`Missing local source: ${localPath}`);
  }
  if (
    relative(libraryRoot, path).startsWith('..') ||
    isAbsolute(relative(libraryRoot, path)) ||
    !statSync(path).isFile()
  ) {
    throw new Error(`localPath escapes assetRoot: ${localPath}`);
  }
  const mime = IMAGE_MIME_TYPES.get(extname(localPath).toLowerCase());
  if (!mime) return null;
  return {
    dataUrl: `data:${mime};base64,${readFileSync(path).toString('base64')}`,
  };
}

function parseOptions(argumentsList) {
  const options = {};
  const optionsWithValue = new Set([
    '--manifest',
    '--library',
    '--out',
    '--annotate',
    '--status',
    '--reason',
    '--provenance',
  ]);
  for (let index = 0; index < argumentsList.length; index++) {
    const option = argumentsList[index];
    if (option === '--help' || option === '-h') options.help = true;
    else if (option === '--write-manifest') options.writeManifest = true;
    else if (optionsWithValue.has(option)) {
      const value = argumentsList[++index];
      if (!value || value.startsWith('--'))
        throw new Error(`${option} requires a value.`);
      options[
        option
          .slice(2)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      ] = value;
    } else throw new Error(`Unknown option: ${option}`);
  }
  return options;
}

export function page(title, content) {
  return `<!doctype html><meta charset="utf-8"><title>${htmlEscape(title)}</title><style>body{font:15px system-ui;margin:24px;background:#151515;color:#eee}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}article{background:#222;padding:12px;border-radius:8px}img{max-width:100%;height:auto;background:#000}h1,h2,p{margin:8px 0}.provenance{color:#b9c9d8}pre{white-space:pre-wrap;overflow-wrap:anywhere}.errors{margin:16px 0;padding:12px;border:1px solid #d66;background:#351b1b}.ok{color:#bfe7c2}.missing{color:#ffc98f}.comparison{display:grid;grid-template-columns:1fr;gap:20px}.comparison>article{min-width:0}.columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.columns>div{min-width:0;padding:10px;border-radius:6px;background:#191919}@media(max-width:780px){body{margin:12px}.columns{grid-template-columns:1fr}}</style><h1>${htmlEscape(title)}</h1>${content}`;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = main(process.argv.slice(2));
    process.stdout.write(`${result.text}\n`);
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
