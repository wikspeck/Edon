import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { createServer } from 'vite'

const load = async (path) => {
  const { outputText } = ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
}
const { floodRegion, snapRasterAlpha } = await load('../src/editor/flood-fill.ts')
const pixels = (values) => new Uint8ClampedArray(values.flatMap((value) => value ? [0, 0, 0, 255] : [255, 255, 255, 255]))
const fill = (values, width, x, y, contiguous = true) => [...floodRegion(pixels(values), width, values.length / width, x, y, 0, contiguous)]
assert.deepEqual(fill([0, 0, 0, 0], 2, 0, 0), [1, 1, 1, 1], 'a region touching the page edge must fill')
assert.deepEqual(fill([0, 1, 0, 0, 1, 0], 3, 0, 0), [1, 0, 0, 1, 0, 0], 'contiguous fill does not cross a boundary')
assert.deepEqual(fill([0, 1, 0, 0, 1, 0], 3, 0, 0, false), [1, 0, 1, 1, 0, 1], 'non-contiguous fill includes all colour matches')
assert.deepEqual(fill([1, 0, 0, 1], 2, 1, 0), [0, 1, 0, 0], 'right edge does not wrap into the next row')
assert.deepEqual(fill([0, 0, 0, 0], 2, 2, 0), [0, 0, 0, 0], 'outside seeds cannot fill')
const transparent = new Uint8ClampedArray([255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 255])
assert.deepEqual([...floodRegion(transparent, 3, 1, 0, 0, 0, true)], [1, 1, 0], 'hidden RGB does not split transparent regions')
const close = new Uint8ClampedArray([10, 10, 10, 255, 20, 10, 10, 255, 21, 10, 10, 255])
assert.deepEqual([...floodRegion(close, 3, 1, 0, 0, 10, true)], [1, 1, 0], 'tolerance is measured from the clicked colour')
const edgeAlpha = new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 127, 0, 0, 0, 180, 0, 0, 0, 255])
snapRasterAlpha(edgeAlpha)
assert.deepEqual([...edgeAlpha].filter((_, index) => index % 4 === 3), [0, 0, 0, 255, 255], 'anti-aliasing off snaps edge coverage to whole pixels')
const { createDocument, createElement, migrateDocument } = await load('../src/model/document.ts')
const original = createDocument('Mixed workspace', 100, 100)
original.pages[0].docHtml = '<h1>Keep my document</h1>'
original.pages[0].elements.push(createElement('rectangle', 10, 20))
const restored = migrateDocument(JSON.parse(JSON.stringify(original)))
assert.equal(restored.pages[0].docHtml, original.pages[0].docHtml)
assert.deepEqual(JSON.parse(JSON.stringify(restored.pages[0].elements)), original.pages[0].elements, 'saving keeps document text and canvas elements together')
console.log('Editor regression tests passed: flood fill and mixed document persistence')
const vite = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { serializeArtwork } = await vite.ssrLoadModule('/src/editor/artwork-export.ts')
  const image = createElement('image', 10, 20, 100, 80)
  image.imageUrl = 'data:image/png;base64,fixture'
  image.crop = { x: .25, y: 0, width: .5, height: 1 }
  image.effects = [{ id: 'outline', type: 'outline', enabled: true, color: '#ffffff', opacity: 1, width: 4 }]
  original.pages[0].elements = [image]
  const svg = serializeArtwork(original.pages[0], [image])
  assert.match(svg, /feMorphology/, 'export includes a silhouette outline without recursive shadows')
  assert.match(svg, /operator="out"/, 'outline excludes the original silhouette')
  assert.match(svg, /brightness\(100%\)/, 'export includes image adjustments')
  assert.match(svg, /x="-50" y="0" width="200"/, 'export retains image crop')
  assert.match(svg, /translate\(60 60\) rotate\(0\) scale\(1 1\) translate\(-50 -40\)/, 'export transforms use the same centre as the canvas')
  console.log('Artwork serialization regression tests passed: outline, adjustments, crop and transforms')
} finally { await vite.close() }
