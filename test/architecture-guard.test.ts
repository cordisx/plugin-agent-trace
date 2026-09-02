import { readFile, readdir } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function sourceText(): Promise<string> {
  const names = (await readdir(new URL('../src/', import.meta.url))).filter(name => /\.tsx?$/.test(name))
  return (await Promise.all(names.map(name => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8')))).join('\n')
}

describe('architecture guard', () => {
  it('contains no legacy service, concrete loop, private Host, DOM, or raw bridge dependency', async () => {
    const source = await sourceText()
    for (const forbidden of [
      'ctx.agentEvents',
      'ctx.agentHistory',
      'ctx.agentLoop',
      'agentEvents',
      'agentHistory',
      'electronBridge',
      'app-server',
      'tdesign',
      'TDesign',
      'querySelector',
      'getElementById',
      'packages/cli/src',
      'packages/host',
    ]) expect(source).not.toContain(forbidden)
  })

  it('uses only public CordisX package entrypoints', async () => {
    const source = await sourceText()
    const imports = [...source.matchAll(/from ['"]([^'"]+)['"]/g)].map(match => match[1])
    const cordisxImports = imports.filter(value => value?.startsWith('cordisx'))
    expect(cordisxImports.every(value => ['cordisx/react', 'cordisx/ui', 'cordisx/contracts'].includes(value!))).toBe(true)
  })
})
