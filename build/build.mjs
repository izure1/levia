import * as esbuild from 'esbuild'
import { glob } from 'node:fs/promises'

const watch = process.argv.includes('--watch')

/** 라이브러리 번들 설정 */
const libOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: /** @type {'esm'} */ ('esm'),
  outfile: 'dist/index.js',
  sourcemap: true,
  target: 'esnext',
  platform: 'browser',
}

/** 예제 페이지들 번들 설정 (example//main.ts 전체) */
async function getExampleOptions() {
  const entries = []
  for await (const file of glob('example/*/main.ts')) {
    entries.push(file.replace(/\\/g, '/'))
  }
  entries.push('example/bg.ts')
  return {
    entryPoints: entries,
    bundle: true,
    format: /** @type {'esm'} */ ('esm'),
    outdir: 'example',
    outbase: 'example',
    sourcemap: true,
    target: 'esnext',
    platform: 'browser',
  }
}

if (watch) {
  const exampleOptions = await getExampleOptions()
  const ctx = await esbuild.context(exampleOptions)
  await ctx.watch()

  const { port } = await ctx.serve({
    servedir: 'example',
    port: 3000,
  })

  console.log(`[levia] dev server: http://localhost:${port}`)
} else {
  const result = await esbuild.build(libOptions)
  if (result.errors.length > 0) {
    console.error('[levia] build failed')
    process.exit(1)
  }
  console.log('[levia] build complete -> dist/index.js')
}
