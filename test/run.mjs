/**
 * Bundle the TypeScript test files with the project's existing esbuild, then
 * hand the temporary ESM files to Node's built-in test runner. This keeps the
 * test stack dependency-free while supporting every Node version in engines.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const testDir = dirname(fileURLToPath(import.meta.url))
const projectDir = dirname(testDir)
const entries = readdirSync(testDir)
  .filter(name => name.endsWith('.test.ts'))
  .sort()
  .map(name => join(testDir, name))

if (entries.length === 0) throw new Error('No test/*.test.ts files found')

const outdir = mkdtempSync(join(tmpdir(), 'dsh-usage-dashboard-test-'))

try {
  await build({
    entryPoints: entries,
    outdir,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: ['node20'],
    sourcemap: 'inline',
    logLevel: 'silent',
  })

  const outputs = entries.map(entry => join(outdir, basename(entry, '.ts') + '.mjs'))
  const result = spawnSync(process.execPath, ['--test', ...outputs], {
    cwd: projectDir,
    stdio: 'inherit',
  })
  if (result.error !== undefined) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  rmSync(outdir, { recursive: true, force: true })
}
