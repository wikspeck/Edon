import type { EdonElement } from '../model/document'

export interface Bounds { x: number; y: number; width: number; height: number; right: number; bottom: number; centerX: number; centerY: number }

export function boundsOf(elements: EdonElement[]): Bounds {
  if (!elements.length) return { x: 0, y: 0, width: 0, height: 0, right: 0, bottom: 0, centerX: 0, centerY: 0 }
  const x = Math.min(...elements.map((element) => element.x))
  const y = Math.min(...elements.map((element) => element.y))
  const right = Math.max(...elements.map((element) => element.x + element.width * element.scaleX))
  const bottom = Math.max(...elements.map((element) => element.y + element.height * element.scaleY))
  return { x, y, width: right - x, height: bottom - y, right, bottom, centerX: (x + right) / 2, centerY: (y + bottom) / 2 }
}

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
