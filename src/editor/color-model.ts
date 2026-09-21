export interface Rgba { r: number; g: number; b: number; a: number }
export interface Hsva { h: number; s: number; v: number; a: number }

export function parseColor(value: string): Rgba {
  const clean = value.trim().replace('#', '')
  const expanded = clean.length === 3 || clean.length === 4 ? clean.split('').map((digit) => digit + digit).join('') : clean
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(expanded)) return { r: 0, g: 0, b: 0, a: 1 }
  return { r: Number.parseInt(expanded.slice(0, 2), 16), g: Number.parseInt(expanded.slice(2, 4), 16), b: Number.parseInt(expanded.slice(4, 6), 16), a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1 }
}

export function rgbaToHex({ r, g, b, a }: Rgba, includeAlpha = a < .999): string {
  const parts = [r, g, b, ...(includeAlpha ? [Math.round(a * 255)] : [])]
  return `#${parts.map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
  const nr = r / 255; const ng = g / 255; const nb = b / 255; const max = Math.max(nr, ng, nb); const min = Math.min(nr, ng, nb); const delta = max - min
  let h = 0
  if (delta) h = max === nr ? 60 * (((ng - nb) / delta) % 6) : max === ng ? 60 * ((nb - nr) / delta + 2) : 60 * ((nr - ng) / delta + 4)
  return { h: (h + 360) % 360, s: max ? delta / max * 100 : 0, v: max * 100, a }
}

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
  const saturation = clamp(s, 0, 100) / 100; const value = clamp(v, 0, 100) / 100; const chroma = value * saturation; const section = ((h % 360) + 360) % 360 / 60; const x = chroma * (1 - Math.abs(section % 2 - 1)); const m = value - chroma
  const [r, g, b] = section < 1 ? [chroma, x, 0] : section < 2 ? [x, chroma, 0] : section < 3 ? [0, chroma, x] : section < 4 ? [0, x, chroma] : section < 5 ? [x, 0, chroma] : [chroma, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a: clamp(a, 0, 1) }
}

export const normalizeHex = (value: string) => rgbaToHex(parseColor(value), value.replace('#', '').length === 8)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
