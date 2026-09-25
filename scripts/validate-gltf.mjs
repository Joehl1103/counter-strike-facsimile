import { readFile, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import * as validator from 'gltf-validator';

const argumentsList = process.argv.slice(2);
if (
  argumentsList.length !== 2 ||
  argumentsList.some((argument) => !argument || argument.startsWith('-'))
) {
  console.error('Usage: node scripts/validate-gltf.mjs <asset.glb> <report.json>');
  process.exit(2);
}
const [assetArgument, reportArgument] = argumentsList;

const assetPath = resolve(assetArgument);
const reportPath = resolve(reportArgument);
await mkdir(dirname(reportPath), { recursive: true });
try {
  const assetDirectory = await realpath(dirname(assetPath));
  const report = await validator.validateBytes(new Uint8Array(await readFile(assetPath)), {
    uri: assetArgument,
    maxIssues: 0,
    externalResourceFunction: async (uri) => {
      // Validation is local; linked buffers and textures resolve beside the asset.
      if (/^[a-z][a-z\d+.-]*:/i.test(uri)) {
        throw new Error(`Expected a local asset resource: ${uri}`);
      }
      const resourcePath = await realpath(resolve(assetDirectory, decodeURIComponent(uri)));
      const relativePath = relative(assetDirectory, resourcePath);
      if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
        throw new Error(`Asset resource must remain inside its source directory: ${uri}`);
      }
      return new Uint8Array(await readFile(resourcePath));
    },
  });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${assetArgument}: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
  process.exitCode = report.issues.numErrors > 0 ? 1 : 0;
} catch (error) {
  const failure = {
    uri: assetArgument,
    validatorVersion: validator.version(),
    validationFailure: String(error),
  };
  await writeFile(reportPath, `${JSON.stringify(failure, null, 2)}\n`);
  console.error(`${assetArgument}: ${failure.validationFailure}`);
  process.exitCode = 1;
}
