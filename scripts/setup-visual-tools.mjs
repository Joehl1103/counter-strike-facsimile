import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const revision = 'd06dc348ccf84884a3a2c1033eae3b38ab55678e';
const spector = join(root, '.tools/spector');
const run = (command, args, cwd = root, env = process.env) =>
  execFileSync(command, args, { cwd, stdio: 'inherit', env });
mkdirSync(join(root, '.tools'), { recursive: true });
if (!existsSync(join(spector, '.git'))) {
  run('git', [
    'clone',
    '--no-checkout',
    'https://github.com/BabylonJS/Spector.js.git',
    spector,
  ]);
  run('git', ['checkout', '--detach', revision], spector);
}
const actual = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: spector,
  encoding: 'utf8',
}).trim();
if (actual !== revision)
  throw new Error(
    `Spector revision must be ${revision}; found ${actual}. Preserve this installation and provision the pinned revision separately.`,
  );
run('npm', ['ci'], join(spector, 'mcp'));
run('npm', ['run', 'build'], join(spector, 'mcp'));
run('npx', ['playwright', 'install', 'chromium']);
run('npx', ['playwright', 'install', 'chromium'], join(spector, 'mcp'));
const uvx =
  process.env.UVX_BIN ??
  execFileSync('which', ['uvx'], { encoding: 'utf8' }).trim();
run(
  uvx,
  ['--from', 'blender-mcp==1.9.1', 'blender-mcp', 'install-addon'],
  root,
  {
    ...process.env,
    DISABLE_TELEMETRY: 'true',
    BLENDERMCP_ADDONS_DIR: join(root, '.tools/blender-addons'),
  },
);
const configPath = join(root, '.codex/config.toml');
mkdirSync(dirname(configPath), { recursive: true });
const config = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
const sections = [
  [
    'dustline_spector',
    `command = ${JSON.stringify(execFileSync('which', ['node'], { encoding: 'utf8' }).trim())}\nargs = [${JSON.stringify(join(spector, 'mcp/dist/index.js'))}]`,
  ],
  [
    'dustline_blender',
    `command = ${JSON.stringify(uvx)}\nargs = ["--from", "blender-mcp==1.9.1", "blender-mcp"]\nenv = { BLENDER_HOST = "127.0.0.1", BLENDER_PORT = "9876", DISABLE_TELEMETRY = "true" }`,
  ],
  ['dustline_context7', 'url = "https://mcp.context7.com/mcp"'],
];
let updated = config;
for (const [name, body] of sections) {
  if (!updated.includes(`[mcp_servers.${name}]`))
    updated += `\n[mcp_servers.${name}]\n${body}\n`;
}
writeFileSync(configPath, updated);
writeFileSync(
  join(root, 'visual-tools/install.json'),
  JSON.stringify(
    {
      spector: {
        repository: 'https://github.com/BabylonJS/Spector.js',
        revision,
      },
      blenderMcp: { version: '1.9.1', telemetry: false },
      context7: { url: 'https://mcp.context7.com/mcp' },
      installedAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Project MCP configuration ready. Start a new Codex task to load it. Start the Blender bridge with npm run visual:blender-bridge.',
);
