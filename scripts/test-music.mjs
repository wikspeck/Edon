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
const { beatGrid, phraseBoundary, quietIntro, transitionWindow, linkedValue, quantizeTime, crossfadeDelta } = await import(`data:text/javascript;base64,${Buffer.from(plannerText).toString('base64')}`)
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

assert.equal(quantizeTime(track, 1.48), 1.25)
assert.equal(quantizeTime(track, 1.48, 'next'), 1.75)
assert.equal(quantizeTime({ ...track, start:.3 }, 0), .75)
assert.equal(quantizeTime({ ...track, end:119.8 }, 200), 119.75)
const right = new Set(['ArrowRight']); const fast = new Set(['ArrowRight','ArrowUp']); const slow = new Set(['ArrowRight','ArrowDown'])
assert.ok(crossfadeDelta(fast,.016) > crossfadeDelta(right,.016))
assert.ok(crossfadeDelta(slow,.016) < crossfadeDelta(right,.016))
assert.equal(crossfadeDelta(new Set(['ArrowRight','ArrowLeft']),.02), 0)
assert.equal(crossfadeDelta(new Set(),.02), 0)
assert.ok(Math.abs(crossfadeDelta(right,1/60) * 60 - .4) < 1e-9)
const fadeText = ts.transpileModule(await readFile('src/music/fade-plan.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022 } }).outputText
const { makeFadePlan, fadeTrack, routeValue, fadeProgress } = await import(`data:text/javascript;base64,${Buffer.from(fadeText).toString('base64')}`)
const manual = { ...track, low:0, mid:0, high:0, volume:.8 }
const fadePlan = { ...makeFadePlan('bass',0), enabled:true }
assert.equal(fadeTrack(manual,0,fadePlan,-1).low, 0)
assert.equal(fadeTrack(manual,1,fadePlan,-1).low, -24)
assert.ok(Math.abs(fadeTrack(manual,0,fadePlan,0).low + 12) < 1e-8)
assert.equal(fadeTrack(manual,0,fadePlan,1).low, -24)
assert.equal(fadeTrack(manual,1,fadePlan,1).low, 0)
assert.equal(fadeTrack(manual,0,{ ...fadePlan,enabled:false },1), manual)
assert.equal(fadeTrack(manual,0,{ ...fadePlan,routes:fadePlan.routes.map(r=>({...r,enabled:false})) },1), manual)
assert.equal(fadeProgress({ ...fadePlan,from:1 },1),0)
assert.equal(fadeProgress({ ...fadePlan,from:1 },-1),1)
const reverse = { ...makeFadePlan('filter',1), enabled:true }
assert.equal(fadeTrack(manual,1,reverse,-1).filter,.7)
const points = { ...fadePlan.routes[0], curve:'linear', points:[{at:1,value:-24},{at:.5,value:-6},{at:0,value:0}] }
assert.equal(routeValue(points,.5), -6)
assert.equal(routeValue(points,.75), -15)
assert.equal(routeValue(points,.25), -3)
assert.equal(routeValue({ ...points,points:[{at:0,value:-100},{at:1,value:100}] },1),12)
console.log('Quantize, held crossfader speed, reversible fade routes and parameter boundaries passed')
