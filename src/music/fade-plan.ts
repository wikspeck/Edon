import type { AudioTrack, FadeParameter, FadePlan, FadeRoute } from '../model/document'

export const fadeParameters: Record<FadeParameter, { label: string; min: number; max: number; step: number; unit: string }> = {
  low: { label: 'Bass', min: -24, max: 12, step: .5, unit: 'dB' },
  mid: { label: 'Mid', min: -24, max: 12, step: .5, unit: 'dB' },
  high: { label: 'High', min: -24, max: 12, step: .5, unit: 'dB' },
  filter: { label: 'Filter', min: -1, max: 1, step: .01, unit: '' },
  volume: { label: 'Level', min: 0, max: 1, step: .01, unit: '' },
  echo: { label: 'Echo', min: 0, max: .7, step: .01, unit: '' },
  reverb: { label: 'Reverb', min: 0, max: .7, step: .01, unit: '' },
  pan: { label: 'Pan', min: -1, max: 1, step: .01, unit: '' },
}
export function fadeProgress(plan: FadePlan, crossfade: number) { return Math.max(0, Math.min(1, (1 + crossfade * (plan.from === 0 ? 1 : -1)) / 2)) }
export function routeValue(route: FadeRoute, progress: number) {
  const range = fadeParameters[route.parameter]; const points = [...route.points].filter((p) => Number.isFinite(p.at) && Number.isFinite(p.value)).sort((a, b) => a.at - b.at)
  if (!points.length) return 0
  let value = points[0].value
  if (progress >= points[points.length - 1].at) value = points[points.length - 1].value
  else for (let i = 1; i < points.length; i++) if (progress <= points[i].at) {
    const a = points[i - 1]; const b = points[i]; let t = Math.max(0, Math.min(1, (progress - a.at) / Math.max(.000001, b.at - a.at)))
    if (route.curve === 'smooth') t = t * t * (3 - 2 * t)
    if (route.curve === 'easeIn') t *= t
    if (route.curve === 'easeOut') t = 1 - (1 - t) ** 2
    value = a.value + (b.value - a.value) * t; break
  }
  return Math.max(range.min, Math.min(range.max, value))
}
export function fadeTrack(track: AudioTrack, slot: 0 | 1, plan: FadePlan | undefined, crossfade: number): AudioTrack {
  if (!plan?.enabled) return track
  const routes = plan.routes.filter((route) => route.enabled && route.deck === slot)
  if (!routes.length) return track
  const next = { ...track }; const progress = fadeProgress(plan, crossfade)
  for (const route of routes) next[route.parameter] = routeValue(route, progress)
  return next
}
export function makeFadePlan(preset: 'bass' | 'filter' | 'echo' | 'clean', from: 0 | 1): FadePlan {
  const to = (1 - from) as 0 | 1
  const route = (deck: 0 | 1, parameter: FadeParameter, start: number, end: number): FadeRoute => ({ id: `${deck}-${parameter}`, deck, parameter, enabled: true, curve: 'smooth', points: [{ at: 0, value: start }, { at: 1, value: end }] })
  const routes = preset === 'bass' ? [route(from, 'low', 0, -24), route(to, 'low', -24, 0)] : preset === 'filter' ? [route(from, 'filter', 0, .7), route(to, 'filter', -.6, 0)] : preset === 'echo' ? [route(from, 'echo', 0, .4), route(from, 'filter', 0, .45)] : []
  if (preset === 'bass') { routes[0].points.splice(1, 0, { at: .35, value: 0 }, { at: .65, value: -24 }); routes[1].points.splice(1, 0, { at: .35, value: -24 }, { at: .65, value: 0 }) }
  return { enabled: false, from, routes }
}
