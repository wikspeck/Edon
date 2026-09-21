import type { EdonElement } from '../model/document'

export interface Bounds { x: number; y: number; width: number; height: number; right: number; bottom: number; centerX: number; centerY: number }

export function visualRect(element: EdonElement): Bounds {
  const stroke = Math.max(0, element.strokeWidth * Math.max(Math.abs(element.scaleX), Math.abs(element.scaleY)))
  const scaleX = Math.abs(element.scaleX); const scaleY = Math.abs(element.scaleY)
  const baseX = element.x + Math.min(0, element.width * element.scaleX)
  const baseY = element.y + Math.min(0, element.height * element.scaleY)
  const width = element.width * scaleX; const height = element.height * scaleY
  if (element.type === 'line' || element.type === 'arrow') return makeBounds(baseX - stroke / 2, baseY + height / 2 - Math.max(1, stroke) / 2, width + stroke, Math.max(1, stroke))
  const inset = stroke / 2
  return makeBounds(baseX - inset, baseY - inset, width + stroke, height + stroke)
}

export function elementBounds(element: EdonElement): Bounds {
  const rect = visualRect(element)
  if (!element.rotation) return rect
  const centerX = element.x + element.width * element.scaleX / 2
  const centerY = element.y + element.height * element.scaleY / 2
  const radians = element.rotation * Math.PI / 180; const cosine = Math.cos(radians); const sine = Math.sin(radians)
  const corners = [[rect.x, rect.y], [rect.right, rect.y], [rect.right, rect.bottom], [rect.x, rect.bottom]].map(([x, y]) => ({ x: centerX + (x - centerX) * cosine - (y - centerY) * sine, y: centerY + (x - centerX) * sine + (y - centerY) * cosine }))
  const x = Math.min(...corners.map((point) => point.x)); const y = Math.min(...corners.map((point) => point.y)); const right = Math.max(...corners.map((point) => point.x)); const bottom = Math.max(...corners.map((point) => point.y))
  return makeBounds(x, y, right - x, bottom - y)
}

export function boundsOf(elements: EdonElement[]): Bounds {
  if (!elements.length) return { x: 0, y: 0, width: 0, height: 0, right: 0, bottom: 0, centerX: 0, centerY: 0 }
  const bounds = elements.map(elementBounds)
  const x = Math.min(...bounds.map((item) => item.x)); const y = Math.min(...bounds.map((item) => item.y)); const right = Math.max(...bounds.map((item) => item.right)); const bottom = Math.max(...bounds.map((item) => item.bottom))
  return makeBounds(x, y, right - x, bottom - y)
}

const makeBounds = (x: number, y: number, width: number, height: number): Bounds => ({ x, y, width, height, right: x + width, bottom: y + height, centerX: x + width / 2, centerY: y + height / 2 })

export function descendantsOf(elements: EdonElement[], ids: string[]): EdonElement[] {
  const collected = new Set(ids)
  let changed = true
  while (changed) {
    changed = false
    for (const element of elements) {
      if (element.parentId && collected.has(element.parentId) && !collected.has(element.id)) {
        collected.add(element.id)
        changed = true
      }
    }
  }
  return elements.filter((element) => collected.has(element.id))
}

export function rootSelection(elements: EdonElement[], ids: string[]): EdonElement[] {
  const selected = new Set(ids)
  return elements.filter((element) => selected.has(element.id) && (!element.parentId || !selected.has(element.parentId)))
}

export function translateElements(elements: EdonElement[], ids: string[], dx: number, dy: number): EdonElement[] {
  const targets = new Set(descendantsOf(elements, ids).map((element) => element.id))
  return elements.map((element) => targets.has(element.id) ? { ...element, x: element.x + dx, y: element.y + dy } : element)
}

export function polygonClipPath(points = 6): string {
  return Array.from({ length: Math.max(3, points) }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(3, points)
    return `${50 + Math.cos(angle) * 50}% ${50 + Math.sin(angle) * 50}%`
  }).join(',')
}

export function starClipPath(points = 5, innerRadius = .48): string {
  const count = Math.max(3, points) * 2
  return Array.from({ length: count }, (_, index) => {
    const radius = index % 2 === 0 ? 50 : 50 * innerRadius
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count
    return `${50 + Math.cos(angle) * radius}% ${50 + Math.sin(angle) * radius}%`
  }).join(',')
}
