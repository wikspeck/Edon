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
