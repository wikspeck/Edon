import type { AudioTrack, MusicSession } from '../model/document'
import { filterFrequency, playbackRate, trackGain, trackStart, wireTrack } from './audio-engine'
import { fadeTrack } from './fade-plan'
export type Slot = 0 | 1
export type Voice = ReturnType<typeof wireTrack>
interface Channel { track?: AudioTrack; buffer?: AudioBuffer; voice?: Voice; position: number; started: number; offset: number; rate: number; playing: boolean; nudge: number }
export interface Transition { from: Slot; to: Slot; started: number; duration: number; initial: number; target: number; bass: boolean; style: string }
export class DJTransport {
  channels: [Channel, Channel] = [this.empty(), this.empty()]
  crossfade = -1
  transition?: Transition
  constructor(readonly context: AudioContext) {}
  private empty(): Channel { return { position: 0, started: 0, offset: 0, rate: 1, playing: false, nudge: 0 } }
  private loopStart(track: AudioTrack) { return Math.min(track.end - .001, Math.max(track.start, track.cue ?? track.beatOffset)) }
  position(slot: Slot) {
    const ch = this.channels[slot]; if (!ch.track || !ch.playing) return ch.position
    let position = ch.offset + Math.max(0, this.context.currentTime - ch.started) * ch.rate
    const beats = ch.track.loopBeats ?? 0
    if (beats) { const start = this.loopStart(ch.track); const end = Math.min(ch.track.end, start + beats * 60 / ch.track.bpm); if (end > start && position >= end) position = start + (position - start) % (end - start) }
    return Math.min(ch.track.end, position)
  }
  load(slot: Slot, track: AudioTrack, buffer: AudioBuffer) { this.pause(slot); this.channels[slot] = { ...this.empty(), track, buffer, position: track.start } }
  play(slot: Slot, session: MusicSession, when = this.context.currentTime + .025) {
    const ch = this.channels[slot]; if (!ch.track || !ch.buffer || ch.playing) return
    if (ch.position >= ch.track.end - .001) ch.position = trackStart(ch.track, session)
    const effective = fadeTrack(ch.track, slot, session.auto ? undefined : session.fadePlan, this.crossfade)
    const voice = wireTrack(this.context, ch.buffer, effective, { ...session, crossfade: this.crossfade }, slot)
    ch.rate = playbackRate(ch.track, session) * (1 + ch.nudge * .04); voice.source.playbackRate.value = ch.rate
    ch.offset = ch.position; ch.started = when; ch.playing = true; ch.voice = voice
    if (ch.track.loopBeats) { voice.source.loop = true; voice.source.loopStart = this.loopStart(ch.track); voice.source.loopEnd = Math.min(ch.track.end, voice.source.loopStart + ch.track.loopBeats * 60 / ch.track.bpm); voice.source.start(when, ch.position) } else voice.source.start(when, ch.position, ch.track.end - ch.position)
    voice.source.onended = () => { if (ch.voice === voice) { ch.position = ch.track?.end ?? 0; ch.playing = false; ch.voice = undefined } voice.dispose() }
  }
  playSynced(slot: Slot, session: MusicSession, master: Slot) {
    const reference = this.channels[master]; const ch = this.channels[slot]
    if (!session.sync || slot === master || !reference.playing || !reference.track || !ch.track) { this.play(slot, session); return }
    const beat = 60 / reference.track.bpm; const phase = ((this.position(master) - reference.track.beatOffset) % beat + beat) % beat
    const wait = (beat - phase) / reference.rate; const incomingBeat = 60 / ch.track.bpm
    ch.position = Math.max(ch.track.start, Math.min(ch.track.end - .001, ch.track.beatOffset + Math.ceil((ch.position - ch.track.beatOffset) / incomingBeat) * incomingBeat))
    this.play(slot, session, this.context.currentTime + Math.max(.025, wait))
  }
  pause(slot: Slot) { const ch = this.channels[slot]; ch.position = this.position(slot); ch.playing = false; if (ch.voice) { const old = ch.voice; ch.voice = undefined; try { old.source.stop() } catch { /* ended */ } old.dispose() } }
  seek(slot: Slot, seconds: number, session: MusicSession) { const ch = this.channels[slot]; const playing = ch.playing; this.pause(slot); if (ch.track) ch.position = Math.max(ch.track.start, Math.min(ch.track.end, seconds)); if (playing) this.play(slot, session) }
  private updateRate(slot: Slot, session: MusicSession) {
    const ch = this.channels[slot]; if (!ch.track) return
    const position = this.position(slot); const at = this.context.currentTime
    ch.position = position; ch.offset = position; ch.started = Math.max(at, ch.started); ch.rate = playbackRate(ch.track, session) * (1 + ch.nudge * .04)
    ch.voice?.source.playbackRate.setTargetAtTime(ch.rate, at, .01)
  }
  nudge(slot: Slot, direction: number, session: MusicSession) { this.channels[slot].nudge = Math.max(-1, Math.min(1, direction)); this.updateRate(slot, session) }
  syncToMaster(slot: Slot, master: Slot, session: MusicSession) {
    const reference = this.channels[master]; const ch = this.channels[slot]
    this.updateRate(master, session); this.updateRate(slot, session)
    if (slot === master || !ch.track || !reference.track || !reference.playing) return
    const beat = 60 / reference.track.bpm; const phase = ((this.position(master) - reference.track.beatOffset) % beat + beat) % beat / beat
    const localBeat = 60 / ch.track.bpm; const position = this.position(slot); const grid = Math.floor((position - ch.track.beatOffset) / localBeat)
    const when = this.context.currentTime + .025; const playing = ch.playing
    this.pause(slot); ch.position = Math.max(ch.track.start, Math.min(ch.track.end - .001, ch.track.beatOffset + (grid + phase) * localBeat + (playing ? .025 * ch.rate : 0)))
    if (playing) this.play(slot, session, when)
  }
  private effects(voice: Voice, track: AudioTrack, session: MusicSession) {
    const at = this.context.currentTime
    voice.low.gain.setTargetAtTime(track.low, at, .025); voice.mid.gain.setTargetAtTime(track.mid, at, .025); voice.high.gain.setTargetAtTime(track.high, at, .025)
    voice.filter.type = (track.filter ?? 0) >= 0 ? 'highpass' : 'lowpass'; voice.filter.frequency.setTargetAtTime(filterFrequency(track.filter ?? 0), at, .025); voice.filter.Q.setTargetAtTime(track.resonance ?? .7, at, .025)
    voice.echo.gain.setTargetAtTime(track.echo ?? 0, at, .025); voice.reverb.gain.setTargetAtTime(track.reverb ?? 0, at, .025); voice.pan.pan.setTargetAtTime(track.pan ?? 0, at, .025); voice.delay.delayTime.setTargetAtTime(Math.min(1.8, 60 / session.bpm * (track.echoBeats ?? .5)), at, .025)
  }
  apply(slot: Slot, track: AudioTrack, session: MusicSession) {
    const ch = this.channels[slot]; const position = this.position(slot)
    if (ch.track && (ch.track.loopBeats !== track.loopBeats || ch.track.start !== track.start || ch.track.end !== track.end || (track.loopBeats && ch.track.cue !== track.cue))) {
      const playing = ch.playing; this.pause(slot); const newlyLooping = track.loopBeats && track.loopBeats !== ch.track.loopBeats; ch.track = track
      ch.position = newlyLooping ? this.loopStart(track) : Math.max(track.start, Math.min(track.end, position)); if (playing) this.play(slot, session); return
    }
    ch.track = track; this.updateRate(slot, session)
    const voice = ch.voice; if (!voice) return
    this.effects(voice, fadeTrack(track, slot, session.auto ? undefined : session.fadePlan, this.crossfade), session)
    voice.source.loop = Boolean(track.loopBeats); voice.source.loopStart = this.loopStart(track); voice.source.loopEnd = Math.min(track.end, voice.source.loopStart + (track.loopBeats ?? 0) * 60 / track.bpm)
    this.mix(this.crossfade, session)
  }
  mix(value: number, session: MusicSession) {
    this.crossfade = Math.max(-1, Math.min(1, value))
    this.channels.forEach((ch, index) => { if (ch.track && ch.voice) {
      const effective = fadeTrack(ch.track, index as Slot, session.auto ? undefined : session.fadePlan, this.crossfade)
      ch.voice.gain.gain.setTargetAtTime(trackGain(index, effective, { ...session, crossfade: this.crossfade }), this.context.currentTime, .012)
      if (!session.auto && session.fadePlan?.enabled) this.effects(ch.voice, effective, session)
    } })
  }
  beginTransition(from: Slot, to: Slot, duration: number, bass = false, when = this.context.currentTime, style = 'blend') { this.transition = { from, to, started: when, duration: Math.max(.2, duration), initial: this.crossfade, target: to === 0 ? -1 : 1, bass, style } }
  cancelTransition() { if (this.transition) for (const ch of this.channels) if (ch.track && ch.voice) { ch.voice.low.gain.setTargetAtTime(ch.track.low, this.context.currentTime, .025); ch.voice.filter.type = (ch.track.filter ?? 0) >= 0 ? 'highpass' : 'lowpass'; ch.voice.filter.frequency.setTargetAtTime(filterFrequency(ch.track.filter ?? 0), this.context.currentTime, .025); ch.voice.echo.gain.setTargetAtTime(ch.track.echo ?? 0, this.context.currentTime, .025) } this.transition = undefined }
  tick(session: MusicSession) {
    const fade = this.transition; if (!fade) return false
    const progress = Math.min(1, Math.max(0, (this.context.currentTime - fade.started) / fade.duration)); this.mix(fade.initial + (fade.target - fade.initial) * progress, session)
    const outgoing = this.channels[fade.from]
    if (fade.bass && outgoing.voice && outgoing.track) outgoing.voice.low.gain.setTargetAtTime(outgoing.track.low * (1 - progress) - 12 * progress, this.context.currentTime, .025)
    if (outgoing.voice && outgoing.track && fade.style === 'filter') { outgoing.voice.filter.type = 'highpass'; outgoing.voice.filter.frequency.setTargetAtTime(filterFrequency(Math.min(1, Math.max(0, outgoing.track.filter ?? 0) + .6 * progress)), this.context.currentTime, .025) }
    if (outgoing.voice && fade.style === 'echo') outgoing.voice.echo.gain.setTargetAtTime(.35 * progress, this.context.currentTime, .025)
    const incoming = this.channels[fade.to]
    if (fade.bass && incoming.voice && incoming.track) incoming.voice.low.gain.setTargetAtTime(incoming.track.low * progress - 12 * (1 - progress), this.context.currentTime, .025)
    if (progress >= 1) { this.pause(fade.from); this.transition = undefined; return true } return false
  }
  stop() { this.cancelTransition(); for (const slot of [0, 1] as const) { this.pause(slot); this.channels[slot].nudge = 0; this.channels[slot].position = this.channels[slot].track?.start ?? 0 } }
  close() { this.stop(); void this.context.close() }
}
export function deckTrack(session: MusicSession, slot: Slot) { return session.tracks.find((track, index) => (track.deck ?? index) === slot) }
