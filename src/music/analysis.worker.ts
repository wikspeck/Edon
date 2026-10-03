import { analyzeAudio } from './analysis'
self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => { self.postMessage(analyzeAudio(event.data.samples, event.data.sampleRate)) }
