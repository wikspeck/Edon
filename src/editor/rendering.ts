import { maskId } from './masks'
import type { CSSProperties } from 'react'
import type { EdonElement, FillPaint } from '../model/document'

export const outlineFilterId = (elementId: string, effectId: string) => `outline-${elementId.replace(/[^\w-]/g, '')}-${effectId.replace(/[^\w-]/g, '')}`

export function serializeOutlineFilters(element: EdonElement): string {
  return serializeGlowFilters(element) + element.effects.filter((effect) => effect.type === 'outline' && effect.enabled).map((effect) => {
    if (effect.type !== 'outline') return ''
    const color = /^#[0-9a-f]{6,8}$/i.test(effect.color) ? effect.color : '#ffffff'
    return `<filter id="${outlineFilterId(element.id, effect.id)}" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${Math.max(0, effect.width)}" result="expanded"/><feComposite in="expanded" in2="SourceAlpha" operator="out" result="ring"/><feFlood flood-color="${color}" flood-opacity="${Math.max(0, Math.min(1, effect.opacity))}" result="colour"/><feComposite in="colour" in2="ring" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
  }).join('')
}

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
    if (effect.type === 'drop-shadow') {
      addSpread(filters, effect.offsetX, effect.offsetY, effect.blur, effect.spread, withOpacity(effect.color, effect.opacity))
    }
    if (effect.type === 'stylized-shadow') {
      const radians = effect.angle * Math.PI / 180
      filters.push(`drop-shadow(${Math.cos(radians) * effect.distance}px ${Math.sin(radians) * effect.distance}px 0 ${withOpacity(effect.color, effect.opacity)})`)
    }
    if (effect.type === 'glow' && (!effect.shape || effect.shape === 'contour')) {
      filters.push(`url("#${outlineFilterId(element.id, effect.id)}")`)
    }
    if (effect.type === 'outline') {
      filters.push(`url("#${outlineFilterId(element.id, effect.id)}")`)
    }
  }
  return filters.length ? filters.join(' ') : undefined
}

function addSpread(filters: string[], offsetX: number, offsetY: number, blur: number, spread: number, color: string) {
  if (spread <= 0) { filters.push(`drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${color})`); return }
  for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) filters.push(`drop-shadow(${offsetX + x * spread}px ${offsetY + y * spread}px ${blur}px ${color})`)
}

export function maskClipPath(element: EdonElement): string | undefined {
  return element.mask ? `url("#${maskId(element)}")` : undefined
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

function serializeGlowFilters(element: EdonElement): string {
 return element.effects.filter(e => e.type === 'glow' && e.enabled && (!e.shape || e.shape === 'contour')).map(e => {
  if (e.type !== 'glow') return ''
  const color = /^#[0-9a-f]{6,8}$/i.test(e.color) ? e.color : '#ffffff', shape = e.shape ?? 'contour'
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+element.width+'" height="'+element.height+'">'+(shape === 'circle' ? '<ellipse cx="'+element.width/2+'" cy="'+element.height/2+'" rx="'+element.width/2+'" ry="'+element.height/2+'" fill="white"/>' : '<rect width="100%" height="100%" fill="white"/>')+'</svg>'
  const input = shape === 'contour' ? '' : '<feImage href="data:image/svg+xml,'+encodeURIComponent(svg)+'" x="0" y="0" width="'+element.width+'" height="'+element.height+'" result="shape"/>'
  return '<filter id="'+outlineFilterId(element.id,e.id)+'" x="-200%" y="-200%" width="500%" height="500%" color-interpolation-filters="sRGB">'+input+'<feMorphology in="'+(shape === 'contour' ? 'SourceAlpha' : 'shape')+'" operator="dilate" radius="'+Math.max(0,e.spread)+'" result="expanded"/><feGaussianBlur in="expanded" stdDeviation="'+Math.max(0,e.blur)/2+'" result="soft"/><feComponentTransfer in="soft" result="falloff"><feFuncA type="gamma" amplitude="'+Math.max(.01,e.strength)+'" exponent="'+(e.falloff ?? 1)+'" offset="0"/></feComponentTransfer><feOffset in="falloff" dx="'+(e.offsetX ?? 0)+'" dy="'+(e.offsetY ?? 0)+'" result="positioned"/><feFlood flood-color="'+color+'" flood-opacity="'+e.opacity+'" result="color"/><feComposite in="color" in2="positioned" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
 }).join('')
}

// Embedded feImage data URLs are discarded when an SVG is decoded as an image.
// Draw the primitive inline instead, sharing these filters across all exporters.
export function serializeShapedGlows(element: EdonElement): string {
 return element.effects.filter(e => e.type === 'glow' && e.enabled && e.shape && e.shape !== 'contour').map(e => {
  if(e.type !== 'glow')return ''
  const id='shape-'+outlineFilterId(element.id,e.id), color=/^#[0-9a-f]{6,8}$/i.test(e.color)?e.color:'#ffffff'
  const filter='<defs><filter id="'+id+'" x="-200%" y="-200%" width="500%" height="500%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="'+e.spread+'" result="spread"/><feGaussianBlur in="spread" stdDeviation="'+e.blur/2+'" result="blurred"/><feComponentTransfer in="blurred" result="falloff"><feFuncA type="gamma" amplitude="'+e.strength+'" exponent="'+(e.falloff ?? 1)+'" offset="0"/></feComponentTransfer><feOffset in="falloff" dx="'+(e.offsetX ?? 0)+'" dy="'+(e.offsetY ?? 0)+'" result="offset"/><feFlood flood-color="'+color+'" flood-opacity="'+e.opacity+'" result="color"/><feComposite in="color" in2="offset" operator="in"/></filter></defs>'
  return filter+(e.shape === 'circle' ? '<ellipse cx="'+element.width/2+'" cy="'+element.height/2+'" rx="'+element.width/2+'" ry="'+element.height/2+'" fill="white" filter="url(#'+id+')"/>' : '<rect width="'+element.width+'" height="'+element.height+'" fill="white" filter="url(#'+id+')"/>')
 }).join('')
}
