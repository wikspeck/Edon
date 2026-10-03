import type { AudioTrack, MusicSession } from '../model/document'
import { filterFrequency, playbackRate, trackGain, trackStart, wireTrack } from './audio-engine'
export type Slot = 0 | 1
export type Voice = ReturnType<typeof wireTrack>
interface Channel { track?: AudioTrack; buffer?: AudioBuffer; voice?: Voice; position: number; started: number; offset: number; rate: number; playing: boolean }
export interface Transition { from: Slot; to: Slot; started: number; duration: number; initial: number; target: number; bass: boolean }
export class DJTransport {
  channels: [Channel, Channel] = [this.empty(), this.empty()]
  crossfade = -1
  transition?: Transition
  constructor(readonly context: AudioContext) {}
  private empty(): Channel { return { position: 0, started: 0, offset: 0, rate: 1, playing: false } }
  position(slot: Slot) { const ch = this.channels[slot]; if (!ch.track || !ch.playing) return ch.position; let position = ch.offset + Math.max(0, this.context.currentTime - ch.started) * ch.rate; const beats = ch.track.loopBeats ?? 0; if (beats) { const start = Math.max(ch.track.start, ch.track.cue ?? ch.track.beatOffset); const end = Math.min(ch.track.end, start + beats * 60 / ch.track.bpm); if (end > start && position >= end) position = start + (position - start) % (end - start) } return Math.min(ch.track.end, position) }
  load(slot: Slot, track: AudioTrack, buffer: AudioBuffer) { this.pause(slot); this.channels[slot] = { ...this.empty(), track, buffer, position: track.start }; }
  play(slot: Slot, session: MusicSession, when = this.context.currentTime + .025) {
    const ch = this.channels[slot]; if (!ch.track || !ch.buffer || ch.playing) return
    if (ch.position >= ch.track.end - .001) ch.position = trackStart(ch.track, session)
    const voice = wireTrack(this.context, ch.buffer, ch.track, { ...session, crossfade: this.crossfade }, slot)
    ch.rate = playbackRate(ch.track, session); ch.offset = ch.position; ch.started = when; ch.playing = true; ch.voice = voice
    if (ch.track.loopBeats) { voice.source.loop = true; voice.source.loopStart = Math.max(ch.track.start, ch.track.cue ?? ch.track.beatOffset); voice.source.loopEnd = Math.min(ch.track.end, voice.source.loopStart + ch.track.loopBeats * 60 / ch.track.bpm); voice.source.start(when, ch.position) } else voice.source.start(when, ch.position, ch.track.end - ch.position)
    voice.source.onended = () => { if (ch.voice === voice) { ch.position = ch.track?.end ?? 0; ch.playing = false; ch.voice = undefined } voice.dispose() }
  }
  pause(slot: Slot) { const ch = this.channels[slot]; ch.position = this.position(slot); ch.playing = false; if (ch.voice) { const old = ch.voice; ch.voice = undefined; try { old.source.stop() } catch { /* ended */ } old.dispose() } }
  seek(slot: Slot, seconds: number, session: MusicSession) { const ch = this.channels[slot]; const playing = ch.playing; this.pause(slot); if (ch.track) ch.position = Math.max(ch.track.start, Math.min(ch.track.end, seconds)); if (playing) this.play(slot, session) }
  apply(slot: Slot, track: AudioTrack, session: MusicSession) {
    const ch = this.channels[slot]; const position = this.position(slot); const rate = playbackRate(track, session)
    if (ch.track && (ch.track.loopBeats !== track.loopBeats || ch.track.start !== track.start || ch.track.end !== track.end)) { const playing = ch.playing; this.pause(slot); ch.track = track; ch.position = Math.max(track.start, Math.min(track.end, position)); if (playing) this.play(slot, session); return }
    ch.track = track
    const voice = ch.voice; if (!voice) return
    const at = this.context.currentTime
    ch.position = position; ch.offset = position; ch.started = at; ch.rate = rate; voice.source.playbackRate.setTargetAtTime(rate, at, .025)
    voice.low.gain.setTargetAtTime(track.low, at, .025); voice.mid.gain.setTargetAtTime(track.mid, at, .025); voice.high.gain.setTargetAtTime(track.high, at, .025)
    voice.filter.type = (track.filter ?? 0) >= 0 ? 'highpass' : 'lowpass'; voice.filter.frequency.setTargetAtTime(filterFrequency(track.filter ?? 0), at, .025); voice.filter.Q.setTargetAtTime(track.resonance ?? .7, at, .025)
    voice.echo.gain.setTargetAtTime(track.echo ?? 0, at, .025); voice.reverb.gain.setTargetAtTime(track.reverb ?? 0, at, .025); voice.pan.pan.setTargetAtTime(track.pan ?? 0, at, .025); voice.delay.delayTime.setTargetAtTime(Math.min(1.8, 30 / session.bpm), at, .025)
    voice.source.loop = Boolean(track.loopBeats); voice.source.loopStart = Math.max(track.start, track.cue ?? track.beatOffset); voice.source.loopEnd = Math.min(track.end, voice.source.loopStart + (track.loopBeats ?? 0) * 60 / track.bpm)
    this.mix(this.crossfade, session)
  }
  mix(value: number, session: MusicSession) { this.crossfade = Math.max(-1, Math.min(1, value)); this.channels.forEach((ch, index) => { if (ch.track && ch.voice) ch.voice.gain.gain.setTargetAtTime(trackGain(index, ch.track, { ...session, crossfade: this.crossfade }), this.context.currentTime, .012) }) }
  beginTransition(from: Slot, to: Slot, duration: number, bass = false, when = this.context.currentTime) { this.transition = { from, to, started: when, duration: Math.max(.2, duration), initial: this.crossfade, target: to === 0 ? -1 : 1, bass } }
  cancelTransition() { this.transition = undefined }
  tick(session: MusicSession) { const fade = this.transition; if (!fade) return false; const progress = Math.min(1, Math.max(0, (this.context.currentTime - fade.started) / fade.duration)); this.mix(fade.initial + (fade.target - fade.initial) * progress, session); const outgoing = this.channels[fade.from]; if (fade.bass && outgoing.voice && outgoing.track) outgoing.voice.low.gain.setTargetAtTime(outgoing.track.low * (1 - progress) - 12 * progress, this.context.currentTime, .025); if (progress >= 1) { this.pause(fade.from); this.transition = undefined; return true } return false }
  stop() { this.cancelTransition(); for (const slot of [0, 1] as const) { this.pause(slot); this.channels[slot].position = this.channels[slot].track?.start ?? 0 } }
  close() { this.stop(); void this.context.close() }
}
export function deckTrack(session: MusicSession, slot: Slot) { return session.tracks.find((track, index) => (track.deck ?? index) === slot) }
