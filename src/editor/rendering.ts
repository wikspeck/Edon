import type { CSSProperties } from 'react'
import type { EdonElement, FillPaint } from '../model/document'
import { polygonClipPath, starClipPath } from './geometry'

export function cssPaint(paint: FillPaint): string {
  if (paint.type === 'solid') return paint.color
  const stops = [...paint.stops].sort((a, b) => a.offset - b.offset).map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`).join(', ')
  return paint.type === 'linear-gradient' ? `linear-gradient(${paint.angle}deg, ${stops})` : `radial-gradient(circle, ${stops})`
}

export function elementFilter(element: EdonElement): string | undefined {
  const filters: string[] = []
  if (element.type === 'image') {
    const adjustment = element.adjustments
    if (adjustment) {
      filters.push(`brightness(${Math.max(0, 100 + adjustment.brightness + adjustment.exposure * .8 + adjustment.shadows * .18)}%)`)
      filters.push(`contrast(${Math.max(0, 100 + adjustment.contrast + adjustment.highlights * .12)}%)`)
      filters.push(`saturate(${Math.max(0, 100 + adjustment.saturation + adjustment.vibrance * .65)}%)`)
      filters.push(`hue-rotate(${adjustment.hue + adjustment.tint * .12 + adjustment.temperature * -.08}deg)`)
      if (adjustment.temperature > 0) filters.push(`sepia(${Math.min(28, adjustment.temperature * .28)}%)`)
    }
  }
  for (const effect of element.effects) {
    if (!effect.enabled) continue
    if (effect.type === 'gaussian-blur') filters.push(`blur(${effect.radius}px)`)
    if (effect.type === 'drop-shadow') filters.push(`drop-shadow(${effect.offsetX}px ${effect.offsetY}px ${effect.blur}px ${withOpacity(effect.color, effect.opacity)})`)
    if (effect.type === 'stylized-shadow') {
      const radians = effect.angle * Math.PI / 180
      filters.push(`drop-shadow(${Math.cos(radians) * effect.distance}px ${Math.sin(radians) * effect.distance}px 0 ${withOpacity(effect.color, effect.opacity)})`)
    }
    if (effect.type === 'glow') filters.push(`drop-shadow(0 0 ${effect.blur}px ${withOpacity(effect.color, effect.opacity)})`)
    if (effect.type === 'outline') {
      const color = withOpacity(effect.color, effect.opacity)
      for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) filters.push(`drop-shadow(${x * effect.width}px ${y * effect.width}px 0 ${color})`)
    }
  }
  return filters.length ? filters.join(' ') : undefined
}

export function maskClipPath(element: EdonElement): string | undefined {
  const mask = element.mask
  if (!mask) return undefined
  const inset = Math.max(0, Math.min(45, mask.inset))
  if (mask.shape === 'ellipse') return `ellipse(${50 - inset}% ${50 - inset}% at 50% 50%)`
  if (mask.shape === 'polygon') return `polygon(${polygonClipPath(mask.sides)})`
  if (mask.shape === 'star') return `polygon(${starClipPath(mask.sides, .48)})`
  if (mask.shape === 'rounded-rectangle') return `inset(${inset}% round ${mask.cornerRadius}px)`
  return `inset(${inset}%)`
}

export function baseElementStyle(element: EdonElement): CSSProperties {
  return {
    left: element.x, top: element.y, width: element.width, height: element.height,
    opacity: element.opacity, transform: `rotate(${element.rotation}deg) scale(${element.scaleX}, ${element.scaleY})`,
    transformOrigin: 'center', mixBlendMode: element.blendMode,
  }
}

export function polygonPoints(count = 6, innerRadius?: number, imperfection = 0, seed = 1): string {
  const total = innerRadius ? Math.max(3, count) * 2 : Math.max(3, count)
  return Array.from({ length: total }, (_, index) => {
    const jitter = imperfection ? (seeded(seed + index * 97) - .5) * imperfection * .32 : 0
    const radius = (innerRadius && index % 2 ? 50 * innerRadius : 50) + jitter
    const angle = -Math.PI / 2 + index * Math.PI * 2 / total
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`
  }).join(' ')
}

const seeded = (value: number) => { const x = Math.sin(value * 12.9898) * 43758.5453; return x - Math.floor(x) }

export function withOpacity(color: string, opacity: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return color
  const value = Number.parseInt(match[1], 16)
  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`
}
