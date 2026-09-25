import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help') || !args.includes('--source')) {
  console.log(
    'npm run visual:blender -- --source assets/source/kuptchi-weapons/FP_Arms/BlendFiles/FP_Arms_Rifle_01_Anims.blend --frames 1,15,30 [--source-camera Camera] [--action NAME] [--out NEW_DIRECTORY]\nOmit --source-camera for the fixed whole-asset studio view. Set BLENDER_BIN if Blender is not at its standard macOS or mounted-image path. Sources are never saved.',
  );
  process.exit(args.includes('--help') ? 0 : 1);
}
const executable =
  process.env.BLENDER_BIN ??
  [
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/Volumes/Blender/Blender.app/Contents/MacOS/Blender',
  ].find(existsSync) ??
  'blender';
if (!args.includes('--out'))
  args.push(
    '--out',
    join(
      root,
      'outputs/visual-tools',
      new Date().toISOString().replaceAll(':', '-') + '-blender',
    ),
  );
const result = spawnSync(
  executable,
  [
    '--background',
    '--factory-startup',
    '--disable-autoexec',
    '--python-exit-code',
    '1',
    '--python',
    join(root, 'scripts/visual-blender-preview.py'),
    '--',
    ...args,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DISABLE_TELEMETRY: 'true' },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
