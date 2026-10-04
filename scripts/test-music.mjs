import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const { outputText } = ts.transpileModule(await readFile('src/music/analysis.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
const { analyzeAudio, compatibility } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const rate = 8000
const samples = new Float32Array(rate * 12)
for (let i = 0; i < samples.length; i++) { const time = i / rate; const pulse = time % .5; samples[i] = pulse < .07 ? .6 * Math.exp(-pulse * 60) * Math.sin(2 * Math.PI * 220 * time) : 0 }
const result = analyzeAudio(samples, rate)
assert.ok(Math.abs(result.bpm - 120) < 2, JSON.stringify(result))
assert.ok(result.confidence > .5)
const silent = analyzeAudio(new Float32Array(8000), rate)
assert.equal(silent.key, 'Unknown'); assert.equal(silent.energy, 0)
const a = { bpm:120, pitch:0, minor:false, key:'C major', energy:60 }
assert.ok(compatibility(a, { ...a, pitch:9, minor:true, key:'A minor' }).harmonic)
assert.ok(compatibility(a, { ...a, bpm:121 }).score > compatibility(a, { ...a, bpm:170, pitch:1, energy:95 }).score)
console.log('Music tempo, silence and harmonic compatibility checks passed', result)

const plannerText = ts.transpileModule(await readFile('src/music/dj-planner.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { beatGrid, phraseBoundary, quietIntro, transitionWindow, linkedValue } = await import(`data:text/javascript;base64,${Buffer.from(plannerText).toString('base64')}`)
const track = { bpm:120, beatOffset:.25, start:0, end:120, duration:120 }
assert.deepEqual(beatGrid(track, 2.25), { beat:.5, index:4, bar:2, inBar:1, phrase:1 })
assert.equal(phraseBoundary(track, 20, 'next'), 32.25)
const window = transitionWindow(track, 8)
assert.ok(window.start > 0 && window.start < track.end)
assert.equal((window.start - track.beatOffset) % 16, 0)
assert.ok(window.seconds <= 32)
const peaks = Array(240).fill(.8); peaks.fill(.1, 4, 12)
assert.ok(quietIntro(track, peaks) < 16)
assert.equal(linkedValue(.5, 0, 1, .1), .6)
assert.equal(linkedValue(.5, 0, 1, .1, true), .4)
assert.equal(linkedValue(-12, -24, 12, .1), -8.4)
assert.equal(linkedValue(.98, 0, 1, .1), 1)
console.log('Beat grid, phrase planning, quieter intro and linked slider checks passed')
