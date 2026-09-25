import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const executable =
  process.env.BLENDER_BIN ??
  [
    '/Applications/Blender.app/Contents/MacOS/Blender',
    '/Volumes/Blender/Blender.app/Contents/MacOS/Blender',
  ].find(existsSync) ??
  'blender';
const child = spawn(
  executable,
  [
    '--factory-startup',
    '--disable-autoexec',
    '--python-exit-code',
    '1',
    '--python',
    join(root, 'scripts/visual-blender-bridge.py'),
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, DISABLE_TELEMETRY: 'true' },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
