import type { EdonElement } from '../model/document'

export const maskId = (element: EdonElement) => `mask-${element.id.replace(/[^a-z0-9_-]/gi, '')}`
export function maskPath(element: EdonElement): string {
  const mask = element.mask
  if (!mask) return ''
  const inset = Math.max(0, Math.min(.45, mask.inset / 100)); const min = inset; const max = 1 - inset
  let path = mask.pathData ?? ''
  if (!path && mask.shape === 'ellipse') { const r = .5 - inset; const k = r * .55228475; path = `M .5 ${min} C ${.5 + k} ${min} ${max} ${.5 - k} ${max} .5 C ${max} ${.5 + k} ${.5 + k} ${max} .5 ${max} C ${.5 - k} ${max} ${min} ${.5 + k} ${min} .5 C ${min} ${.5 - k} ${.5 - k} ${min} .5 ${min} Z` }
  else if (!path && (mask.shape === 'star' || mask.shape === 'polygon')) { const star = mask.shape === 'star'; const count = Math.max(3, mask.sides) * (star ? 2 : 1); path = Array.from({ length: count }, (_, index) => { const angle = -Math.PI / 2 + index / count * Math.PI * 2; const radius = (.5 - inset) * (star && index % 2 ? .48 : 1); return `${index ? 'L' : 'M'} ${.5 + Math.cos(angle) * radius} ${.5 + Math.sin(angle) * radius}` }).join(' ') + ' Z' }
  else if (!path) { const rx = mask.shape === 'rounded-rectangle' ? Math.min((max - min) / 2, mask.cornerRadius / element.width) : 0; const ry = mask.shape === 'rounded-rectangle' ? Math.min((max - min) / 2, mask.cornerRadius / element.height) : 0; path = rx && ry ? `M ${min + rx} ${min} H ${max - rx} Q ${max} ${min} ${max} ${min + ry} V ${max - ry} Q ${max} ${max} ${max - rx} ${max} H ${min + rx} Q ${min} ${max} ${min} ${max - ry} V ${min + ry} Q ${min} ${min} ${min + rx} ${min} Z` : `M ${min} ${min} H ${max} V ${max} H ${min} Z` }
  return (mask.inverted ? 'M 0 0 H 1 V 1 H 0 Z ' : '') + path
}
export function serializeMask(element: EdonElement): string { return element.mask ? `<clipPath id="${maskId(element)}" clipPathUnits="objectBoundingBox"><path d="${maskPath(element)}" clip-rule="evenodd"/></clipPath>` : '' }
