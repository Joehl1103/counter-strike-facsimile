import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    url: {
      type: 'string',
      default: 'http://localhost:3000/?visual-qa=primary&weapon=carbine',
    },
    out: { type: 'string' },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  console.log(
    'npm run visual:diagnostics -- --url http://localhost:3000/?visual-qa=primary\nCaptures upstream Spector MCP draw calls, shaders, textures, state, errors and screenshot in a new directory.',
  );
  process.exit(0);
}
const url = new URL(values.url);
if (!['localhost', '127.0.0.1'].includes(url.hostname))
  throw new Error('Diagnostics requires localhost');
const output = resolve(
  values.out ??
    join(
      root,
      'outputs/visual-tools',
      new Date().toISOString().replaceAll(':', '-') + '-spector',
    ),
);
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
const client = new Client({ name: 'dustline-diagnostics', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, '.tools/spector/mcp/dist/index.js')],
  cwd: root,
  stderr: 'pipe',
});
const summary = { url: url.href, status: 'incomplete', tools: [], errors: [] };
try {
  await client.connect(transport);
  for (const name of [
    'load_url',
    'capture_frame',
    'get_draw_calls',
    'get_shaders',
    'get_textures',
    'get_webgl_state',
    'get_context_info',
    'get_console_logs',
  ]) {
    const result = await client.callTool({
      name,
      arguments: name === 'load_url' ? { url: url.href } : {},
    });
    let imageIndex = 0;
    for (const block of result.content ?? [])
      if (block.type === 'image') {
        const imageName = `${name}-${imageIndex++}.${block.mimeType === 'image/png' ? 'png' : 'jpg'}`;
        await writeFile(
          join(output, imageName),
          Buffer.from(block.data, 'base64'),
        );
        delete block.data;
        block.savedImage = imageName;
      }
    await writeFile(
      join(output, `${name}.json`),
      JSON.stringify(result, null, 2),
    );
    summary.tools.push(name);
    if (result.isError) throw new Error(`${name} failed; see ${name}.json`);
  }
  summary.status = 'captured';
} catch (error) {
  summary.status = 'failed';
  summary.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await client.close();
  await writeFile(
    join(output, 'diagnostics.json'),
    JSON.stringify(summary, null, 2),
  );
}
console.log(join(output, 'diagnostics.json'));
