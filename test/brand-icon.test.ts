import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { icon } from '../src/index.js'

it('exports the selected 256px PNG through the public plugin brand declaration', async () => {
  const source = await readFile(new URL('../assets/agent-trace.png', import.meta.url))
  expect(icon.mediaType).toBe('image/png')
  expect(Buffer.from(icon.data, 'base64')).toEqual(source)
  expect(createHash('sha256').update(source).digest('hex')).toBe(
    'c5ea34e2d791d9647f3adc49bf1a5c03cb88f12d7ddd400468b02c42292a490b',
  )
  expect(source.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  expect(source.readUInt32BE(16)).toBe(256)
  expect(source.readUInt32BE(20)).toBe(256)
})
