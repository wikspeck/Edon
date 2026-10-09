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
const { createDocument, createElement, migrateDocument, documentKind } = await load('../src/model/document.ts')
assert.equal(documentKind(createDocument('Doc', 794, 1123, 'doc')), 'doc')
assert.equal(documentKind(createDocument('Music', 100, 100, 'music')), 'music')
for (const kind of ['presentation', 'video']) {
  const source = createDocument('Suite QA', 1920, 1080, kind)
  if (kind === 'video') source.video = [{ id: 'fixture', name: 'clip.webm', duration: 8, start: 1, end: 6, muted: true }]
  const restored = migrateDocument(JSON.parse(JSON.stringify(source)))
  assert.equal(documentKind(restored), kind, 'new suite file types survive persistence')
  if (kind === 'video') assert.deepEqual(restored.video, source.video, 'video edit points and mute survive persistence')
}

const { playbackRate, trackStart, trackDuration, trackGain, encodeWav } = await load('../src/music/audio-engine.ts')
const session = { bpm: 120, sync: true, crossfade: 0, tracks: [] }
const audio = { bpm: 90, beatOffset: .1, start: .3, end: 8, volume: 1 }
assert.equal(playbackRate(audio, session), 4 / 3, 'BPM sync uses each source tempo')
assert.ok(Math.abs(trackStart(audio, session) - (.1 + 2 / 3)) < 1e-9, 'trim starts on a source beat')
assert.ok(Math.abs(trackDuration(audio, session) - (8 - trackStart(audio, session)) / (4 / 3)) < 1e-9)
assert.equal(trackGain(1, audio, { ...session, crossfade: -1 }), 0, 'crossfader A mutes B')
assert.ok(trackGain(0, audio, { ...session, crossfade: 1 }) < 1e-9, 'crossfader B mutes A')
const wav = await encodeWav({ numberOfChannels: 1, length: 2, sampleRate: 44100, getChannelData: () => new Float32Array([-1, 1]) }).arrayBuffer()
assert.equal(new DataView(wav).getUint32(40, true), 4, 'WAV data length is valid')
assert.equal(new DataView(wav).getInt16(44, true), -32768, 'WAV negative sample is preserved')
assert.equal(new DataView(wav).getInt16(46, true), 32767, 'WAV positive sample is preserved')
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
  const gradient = createElement('rectangle', 0, 0, 160, 80)
  gradient.fillPaint = {type:'linear-gradient',angle:90,stops:[{id:'a',offset:0,color:'#ff0000'},{id:'b',offset:1,color:'#0000ff'}]}
  gradient.cornerRadii=[24,0,24,0]
  const arrow = createElement('arrow', 10, 10, 100, 40); arrow.strokeDash=[6,4]
  original.pages[0].elements=[gradient,arrow]
  const vectorSvg=serializeArtwork(original.pages[0],[gradient,arrow])
  assert.match(vectorSvg,/linearGradient/, 'SVG retains gradients')
  assert.match(vectorSvg,/stop-color="#0000ff"/, 'SVG retains every stop')
  assert.match(vectorSvg,/marker-end="url\(#arrow-/, 'SVG retains arrowheads')
  assert.match(vectorSvg,/stroke-dasharray="6 4"/, 'SVG retains dash patterns')
  const {vectorDragDelta,updateHandle,resizeVectorElement,nodesFromPathData}=await vite.ssrLoadModule('/src/editor/vector-path.ts')
  const delta=vectorDragDelta(0,20,2,90,2,1)
  assert.ok(Math.abs(delta.x-5)<1e-9 && Math.abs(delta.y)<1e-9, 'node dragging reverses canvas rotation, zoom and scale')
  const nodes=[{id:'one',kind:'smooth',x:10,y:10,in:{x:0,y:10},out:{x:20,y:10}}]
  const linked=updateHandle(nodes,'one','out',{x:10,y:20})[0]
  assert.deepEqual(linked.in,{x:10,y:0},'smooth handles retain opposite tangent')
  assert.deepEqual(updateHandle(nodes,'one','out',{x:10,y:20},false)[0].in,nodes[0].in,'unlinked handle leaves the other handle intact')
  const path=createElement('path',0,0,24,24);path.pathData='M0 0 L24 0 L12 24 Z';path.closed=true;path.vectorNodes=nodesFromPathData(path.pathData)
  const resized=resizeVectorElement(path,{width:48,height:12})
  assert.equal(resized.vectorNodes[1].x,48,'vector geometry resizes with its frame')
  assert.equal(resized.vectorNodes[2].y,12,'nonuniform vector resize scales points independently')
  assert.equal(path.vectorNodes[1].x,24,'resize preserves source geometry for undo')
  path.vectorNodes=undefined;path.pathData='M0 0 A10 8 45 0 1 24 24 Z'
  assert.match(resizeVectorElement(path,{width:48,height:48}).pathData,/A20 16 45 0 1 48 48/,'arc resizing preserves rotation and flags')
  console.log('Vector editing regression tests passed: transformed dragging, linked handles, nodes and resize')
  console.log('Artwork serialization regression tests passed: outline, adjustments, crop and transforms')
} finally { await vite.close() }
