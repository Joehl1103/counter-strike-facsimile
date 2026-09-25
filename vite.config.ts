import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;
const JKH129_BUILD_IDENTITY_MODULE = 'virtual:jkh-129-build-identity';
const JKH129_BUILD_IDENTITY_RESOLVED_MODULE = `\0${JKH129_BUILD_IDENTITY_MODULE}`;

function createJkh129BuildIdentity() {
  const pageSource = readFileSync(new URL('./app/page.tsx', import.meta.url));
  return Object.freeze({
    schemaVersion: 1,
    revision: execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim(),
    pageSha256: createHash('sha256').update(pageSource).digest('hex'),
  });
}

function jkh129BuildIdentityPlugin() {
  // This value is computed once when Vite starts. A later HMR page edit leaves
  // the server identity stale, which lets the capture harness fail closed.
  const identity = createJkh129BuildIdentity();
  return {
    name: 'jkh-129-build-identity',
    resolveId(id: string) {
      return id === JKH129_BUILD_IDENTITY_MODULE
        ? JKH129_BUILD_IDENTITY_RESOLVED_MODULE
        : null;
    },
    load(id: string) {
      if (id !== JKH129_BUILD_IDENTITY_RESOLVED_MODULE) return null;
      return `export const JKH129_BUILD_IDENTITY = Object.freeze(${JSON.stringify(identity)});`;
    },
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      jkh129BuildIdentityPlugin(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
