import { useEffect, useRef } from 'react'
import type { AudioTrack } from '../model/document'
import type { Voice } from './dj-transport'
import { filterFrequency } from './audio-engine'
export function SignalView({ voice, track }: { voice?: Voice; track: AudioTrack }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const settings = useRef({ voice, track }); useEffect(() => { settings.current = { voice, track } }, [voice, track])
  useEffect(() => {
    const target = canvas.current!; const ctx = target.getContext('2d')!; const width = 280; const height = 66; target.width = width; target.height = height
    let frame = 0; let previous = 0; let cachedTrack: AudioTrack | undefined; let staticResponse = new Float32Array(width).fill(1)
    const draw = (time: number) => { frame = requestAnimationFrame(draw); if (time - previous < 70) return; previous = time; const { voice, track } = settings.current
      ctx.clearRect(0, 0, width, height); ctx.strokeStyle = '#343b45'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke()
      if (voice) { const data = new Uint8Array(voice.analyser.frequencyBinCount); voice.analyser.getByteFrequencyData(data); ctx.fillStyle = '#829db65c'; for (let x = 0; x < width; x += 3) { const frequency = 20 * 1000 ** (x / width); const bin = Math.floor(frequency / (voice.analyser.context.sampleRate / voice.analyser.fftSize)); const level = (data[bin] ?? 0) / 255; ctx.fillRect(x, height - level * height, 2, level * height) }
        const frequencies = Float32Array.from({ length: width }, (_, i) => 20 * 1000 ** (i / width)); const response = new Float32Array(width); const phase = new Float32Array(width); const total = new Float32Array(width).fill(1)
        for (const filter of [voice.low, voice.mid, voice.high, voice.filter]) { filter.getFrequencyResponse(frequencies, response, phase); for (let i = 0; i < width; i++) total[i] *= response[i] }
        ctx.beginPath(); for (let i = 0; i < width; i++) { const db = 20 * Math.log10(Math.max(.00001, total[i])); const y = height / 2 - Math.max(-24, Math.min(24, db)) / 24 * (height / 2 - 3); if (!i) ctx.moveTo(i, y); else ctx.lineTo(i, y) } ctx.strokeStyle = '#d7e2eb'; ctx.lineWidth = 1.5; ctx.stroke()
      } else {
        if (cachedTrack !== track) { cachedTrack = track; const context = new OfflineAudioContext(1, 1, 44100); const low = context.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 250; low.gain.value = track.low; const mid = context.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = .8; mid.gain.value = track.mid; const high = context.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = track.high; const filter = context.createBiquadFilter(); filter.type = (track.filter ?? 0) >= 0 ? 'highpass' : 'lowpass'; filter.frequency.value = filterFrequency(track.filter ?? 0); filter.Q.value = track.resonance ?? .7; const frequencies = Float32Array.from({ length: width }, (_, i) => 20 * 1000 ** (i / width)); const response = new Float32Array(width); const phase = new Float32Array(width); staticResponse = new Float32Array(width).fill(1); for (const node of [low, mid, high, filter]) { node.getFrequencyResponse(frequencies, response, phase); for (let i = 0; i < width; i++) staticResponse[i] *= response[i]; node.disconnect() } }
        ctx.strokeStyle = '#91a9bc'; ctx.beginPath(); for (let x = 0; x < width; x++) { const db = 20 * Math.log10(Math.max(.00001, staticResponse[x])); const y = height / 2 - Math.max(-24, Math.min(24, db)) / 24 * (height / 2 - 3); if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y) } ctx.stroke()
      }
    }; frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame)
  }, [])
  return <div className="dj-signal"><canvas ref={canvas} aria-label="EQ response and live output spectrum" /><span>20 Hz <i>EQ curve / live spectrum</i> 20 kHz</span></div>
}
