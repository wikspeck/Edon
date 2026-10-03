import type { AudioTrack, MusicSession } from '../model/document'

export function playbackRate(track: AudioTrack, session: MusicSession) { return session.sync ? Math.max(.25, Math.min(4, session.bpm / track.bpm)) : 1 }
export function trackGain(index: number, track: AudioTrack, session: MusicSession) { return track.volume * (index === 0 ? Math.cos((session.crossfade + 1) * Math.PI / 4) : Math.sin((session.crossfade + 1) * Math.PI / 4)) }
export function trackStart(track: AudioTrack, session: MusicSession) { const beat = 60 / track.bpm; return session.sync ? Math.max(track.start, track.beatOffset + Math.ceil((track.start - track.beatOffset) / beat) * beat) : track.start }
export function trackDuration(track: AudioTrack, session: MusicSession) { return Math.max(0, track.end - trackStart(track, session)) / playbackRate(track, session) }
const impulses = new WeakMap<BaseAudioContext, AudioBuffer>()
export function filterFrequency(value: number) { return value >= 0 ? 20 * 1000 ** value : 20000 * .001 ** -value }
export function wireTrack(context: BaseAudioContext, buffer: AudioBuffer, track: AudioTrack, session: MusicSession, index: number) {
  const source = context.createBufferSource(); source.buffer = buffer; source.playbackRate.value = playbackRate(track, session)
  const low = context.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 250; low.gain.value = track.low
  const mid = context.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = .8; mid.gain.value = track.mid
  const high = context.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = track.high
  const filter = context.createBiquadFilter(); filter.type = (track.filter ?? 0) >= 0 ? 'highpass' : 'lowpass'; filter.frequency.value = filterFrequency(track.filter ?? 0); filter.Q.value = track.resonance ?? .7
  const pan = context.createStereoPanner(); pan.pan.value = track.pan ?? 0
  const delay = context.createDelay(2); delay.delayTime.value = Math.min(1.8, 60 / session.bpm / 2)
  const feedback = context.createGain(); feedback.gain.value = .3
  const echo = context.createGain(); echo.gain.value = track.echo ?? 0
  const convolver = context.createConvolver()
  let impulse = impulses.get(context)
  if (!impulse) { impulse = context.createBuffer(2, context.sampleRate, context.sampleRate); let seed = 17; for (let ch = 0; ch < 2; ch++) { const data = impulse.getChannelData(ch); for (let i = 0; i < data.length; i++) { seed = (seed * 16807) % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * (1 - i / data.length) ** 3 } } impulses.set(context, impulse) }
  convolver.buffer = impulse
  const reverb = context.createGain(); reverb.gain.value = track.reverb ?? 0
  const gain = context.createGain(); gain.gain.value = trackGain(index, track, session)
  const analyser = context.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .75
  source.connect(low).connect(mid).connect(high).connect(filter).connect(pan).connect(gain)
  pan.connect(delay).connect(feedback).connect(delay); delay.connect(echo).connect(gain)
  pan.connect(convolver).connect(reverb).connect(gain)
  gain.connect(analyser).connect(context.destination)
  const nodes = [source, low, mid, high, filter, pan, delay, feedback, echo, convolver, reverb, gain, analyser]
  return { source, low, mid, high, filter, pan, delay, echo, reverb, gain, analyser, dispose: () => nodes.forEach((node) => node.disconnect()) }
}
export function waveform(buffer: AudioBuffer, count = 240): number[] { const channel = buffer.getChannelData(0); return Array.from({ length: count }, (_, index) => { const start = Math.floor(index / count * channel.length); const end = Math.max(start + 1, Math.floor((index + 1) / count * channel.length)); let peak = 0; const stride = Math.max(1, Math.floor((end - start) / 100)); for (let at = start; at < end; at += stride) peak = Math.max(peak, Math.abs(channel[at] ?? 0)); return peak }) }
export function encodeWav(buffer: AudioBuffer): Blob { const channels = Math.min(2, buffer.numberOfChannels); const length = buffer.length; const data = new ArrayBuffer(44 + length * channels * 2); const view = new DataView(data); const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0))); text(0, 'RIFF'); view.setUint32(4, data.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, length * channels * 2, true); const samples = Array.from({ length: channels }, (_, index) => buffer.getChannelData(index)); for (let index = 0; index < length; index++) for (let channel = 0; channel < channels; channel++) { const value = Math.max(-1, Math.min(1, samples[channel][index])); view.setInt16(44 + (index * channels + channel) * 2, value * (value < 0 ? 32768 : 32767), true) } return new Blob([data], { type: 'audio/wav' }) }
