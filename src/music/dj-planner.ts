import type { AudioTrack } from '../model/document'

export function beatGrid(track: AudioTrack, position: number) {
  const beat = 60 / track.bpm
  const index = Math.max(0, Math.floor((position - track.beatOffset) / beat + .0001))
  return { beat, index, bar: Math.floor(index / 4) + 1, inBar: index % 4 + 1, phrase: Math.floor(index / 32) + 1 }
}
export function phraseBoundary(track: AudioTrack, position: number, direction: 'next' | 'previous') {
  const phrase = 32 * 60 / track.bpm
  const round = direction === 'next' ? Math.ceil : Math.floor
  return Math.max(track.start, Math.min(track.end, track.beatOffset + round((position - track.beatOffset) / phrase) * phrase))
}
// Waveform peaks estimate quieter sections, not vocals or musical structure.
export function quietIntro(track: AudioTrack, peaks: number[]) {
  const beat = 60 / track.bpm; let selected = Math.max(track.start, track.beatOffset); let best = Infinity
  for (let t = selected; t + 8 * beat < Math.min(track.end, track.start + 32 * beat); t += 4 * beat) {
    const first = Math.floor(t / track.duration * peaks.length); const last = Math.ceil((t + 8 * beat) / track.duration * peaks.length)
    const section = peaks.slice(first, last); const level = section.reduce((sum, value) => sum + value, 0) / Math.max(1, section.length)
    if (section.length && level > .01 && level < best) { best = level; selected = t }
  }
  return Math.min(track.end - .1, Math.max(track.start, selected))
}
export function transitionWindow(track: AudioTrack, seconds: number, rate = 1) {
  const safe = Math.max(.2, Math.min(seconds, (track.end - track.start) / rate / 2))
  const candidate = phraseBoundary(track, track.end - safe * rate, 'previous')
  const start = track.end - candidate <= safe * rate + 32 * 60 / track.bpm && candidate > track.start ? candidate : track.end - safe * rate
  return { start, seconds: safe }
}
export function linkedValue(value: number, min: number, max: number, delta: number, inverse = false) {
  return Math.max(min, Math.min(max, value + delta * (max - min) * (inverse ? -1 : 1)))
}
