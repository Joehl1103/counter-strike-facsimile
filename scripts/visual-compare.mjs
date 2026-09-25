#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compatibilityErrors,
  htmlEscape,
  readCaptureManifest,
  resolveLocalImage,
  reviewAnnotation,
} from './visual-toolkit-common.mjs';
import { page } from './visual-reference.mjs';

const HELP = `Usage: node scripts/visual-compare.mjs --reference reference.json --previous previous.json --candidate candidate.json --out comparison.html

Builds a portable three-column comparison board. It exits 1 if scenario, capture
settings, camera, light, or per-frame viewport metadata differ. Missing frames and
image read failures are shown in the HTML and also produce exit 1. Image similarity
is evidence only; this tool never converts it into an approval decision.`;

export function main(argumentsList) {
  const options = parseOptions(argumentsList);
  if (options.help) return { text: HELP, exitCode: 0 };
  for (const key of ['reference', 'previous', 'candidate', 'out'])
    if (!options[key])
      throw new Error(`--${key} is required. Use --help for usage.`);
  const manifests = {
    reference: readCaptureManifest(options.reference),
    previous: readCaptureManifest(options.previous),
    candidate: readCaptureManifest(options.candidate),
  };
  const comparison = compatibilityErrors(
    manifests.reference,
    manifests.previous,
    manifests.candidate,
  );
  const errors = [...comparison.errors];
  const cards = comparison.ids
    .map((id) => frameCard(id, manifests, errors))
    .join('\n');
  const errorList = errors.length
    ? `<aside class="errors"><h2>Comparison failures</h2><ul>${errors.map((error) => `<li>${htmlEscape(error)}</li>`).join('')}</ul></aside>`
    : '<p class="ok">Capture metadata is compatible. Review decisions below remain human decisions.</p>';
  writeFileSync(
    resolve(options.out),
    page(
      'Visual comparison board',
      `${errorList}<section class="comparison">${cards}</section>`,
    ),
  );
  return {
    text: `Wrote ${resolve(options.out)}${errors.length ? ` with ${errors.length} failure(s)` : ''}`,
    exitCode: errors.length ? 1 : 0,
  };
}

function frameCard(id, manifests, errors) {
  const columns = Object.entries(manifests)
    .map(([label, manifest]) => {
      const frame = manifest.document.frames.find((item) => item.id === id);
      if (!frame) {
        errors.push(`frame ${id}: missing from ${label}`);
        return `<div><h2>${label}</h2><p class="missing">Missing frame</p></div>`;
      }
      try {
        const image = resolveLocalImage(manifest, frame.image);
        const annotation = reviewAnnotation(manifest, id);
        return `<div><h2>${htmlEscape(label)}</h2><img src="${image.dataUrl}" alt="${htmlEscape(`${label} ${id}`)}"><p>${htmlEscape(annotation.status)} — ${htmlEscape(annotation.reason)}</p><p class="provenance">${htmlEscape(annotation.provenance)}</p></div>`;
      } catch (error) {
        errors.push(`frame ${id}: ${label}: ${error.message}`);
        return `<div><h2>${htmlEscape(label)}</h2><p class="missing">${htmlEscape(error.message)}</p></div>`;
      }
    })
    .join('');
  return `<article><h1>${htmlEscape(id)}</h1><div class="columns">${columns}</div></article>`;
}

function parseOptions(argumentsList) {
  const options = {};
  const optionsWithValue = new Set([
    '--reference',
    '--previous',
    '--candidate',
    '--out',
  ]);
  for (let index = 0; index < argumentsList.length; index++) {
    const option = argumentsList[index];
    if (option === '--help' || option === '-h') {
      options.help = true;
    } else if (optionsWithValue.has(option)) {
      const value = argumentsList[++index];
      if (!value || value.startsWith('--'))
        throw new Error(`${option} requires a value.`);
      options[option.slice(2)] = value;
    } else {
      throw new Error(`Unknown option: ${option}`);
    }
  }
  return options;
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
