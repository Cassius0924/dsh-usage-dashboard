/**
 * Single-file client + ESM host build for dsh-usage-dashboard.
 *
 * - Host half: ESM for Node, externalizing @deepseek-ai/* (the profile's
 *   healed node_modules provides them).
 * - Client half: one CJS bundle wrapped in the DSH module-loader factory
 *   handshake (`window.__ModuleLoader__.load({ id, factory })`); react and
 *   @deepseek-ai/* stay external because the web shell shares them through
 *   the frozen module table.
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'

// The web module loader addresses client bundles by package name, so the id in
// the handshake below must be the package's own name — derive it rather than
// repeating it, or renaming the package silently unregisters the client half
// (and stalls the boot graph waiting for a module that never arrives).
const { name: packageName } = JSON.parse(readFileSync('package.json', 'utf8'))

rmSync('lib', { recursive: true, force: true })
mkdirSync('lib', { recursive: true })

const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*']

// Host half: plain ESM for Node.
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: dshExternal,
  logLevel: 'info',
})

// Client half: CJS closure registering with the web module loader.
await build({
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [...dshExternal, 'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageName)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

// Type declarations for consumers.
execFileSync('node_modules/.bin/tsc', ['-p', 'tsconfig.json'], { stdio: 'inherit' })
