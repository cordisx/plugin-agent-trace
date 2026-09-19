import { build } from 'esbuild'

await build({
  bundle: true,
  entryPoints: ['src/index.ts'],
  external: [
    '@deepseek-ai/cordis',
    'cordisx/contracts',
    'cordisx/react',
    'cordisx/react/jsx-runtime',
    'cordisx/react/jsx-dev-runtime',
    'cordisx/ui',
  ],
  format: 'esm',
  metafile: true,
  minifyWhitespace: true,
  outfile: 'dist/runtime/module.js',
  platform: 'browser',
  sourcemap: false,
  target: ['chrome120'],
})
