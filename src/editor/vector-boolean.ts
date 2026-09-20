import type paper from 'paper'
import { createElement, type EdonElement } from '../model/document'

export type BooleanOperation = 'union' | 'subtract' | 'intersect' | 'exclude'
const compatible = new Set(['rectangle', 'ellipse', 'polygon', 'star', 'path'])

export function canBoolean(elements: EdonElement[]): boolean { return elements.length === 2 && elements.every((element) => compatible.has(element.type)) }

export async function booleanElements(bottom: EdonElement, top: EdonElement, operation: BooleanOperation): Promise<EdonElement | null> {
  const paperRuntime = (await import('paper')).default
  paperRuntime.setup(new paperRuntime.Size(1, 1))
  const first = toPaperItem(paperRuntime, bottom)
  const second = toPaperItem(paperRuntime, top)
  if (!first || !second) return null
  const result = operation === 'union' ? first.unite(second, { insert: false })
    : operation === 'subtract' ? first.subtract(second, { insert: false })
      : operation === 'intersect' ? first.intersect(second, { insert: false })
        : first.exclude(second, { insert: false })
  if (!result || result.bounds.width < .01 || result.bounds.height < .01) return null
  const bounds = result.bounds.clone()
  result.translate(new paperRuntime.Point(-bounds.x, -bounds.y))
  const element = createElement('path', bounds.x, bounds.y, bounds.width, bounds.height)
  element.name = `${operation[0].toUpperCase()}${operation.slice(1)}`
  element.pathData = result.pathData
  element.fill = bottom.fill
  element.fillPaint = structuredClone(bottom.fillPaint)
  element.stroke = bottom.stroke
  element.strokeWidth = bottom.strokeWidth
  return element
}

function toPaperItem(scope: typeof paper, element: EdonElement): paper.PathItem | null {
  let item: paper.PathItem
  const rectangle = new scope.Rectangle(element.x, element.y, element.width, element.height)
  if (element.type === 'rectangle') item = new scope.Path.Rectangle(rectangle, new scope.Size(element.cornerRadius, element.cornerRadius))
  else if (element.type === 'ellipse') item = new scope.Path.Ellipse(rectangle)
  else if (element.type === 'polygon') item = new scope.Path.RegularPolygon(rectangle.center, Math.max(3, element.points ?? 6), Math.min(element.width, element.height) / 2)
  else if (element.type === 'star') item = new scope.Path.Star(rectangle.center, Math.max(3, element.points ?? 5), Math.min(element.width, element.height) / 2 * (element.innerRadius ?? .48), Math.min(element.width, element.height) / 2)
  else if (element.type === 'path' && element.pathData) { item = new scope.CompoundPath(element.pathData); item.translate(new scope.Point(element.x, element.y)) }
  else return null
  if (element.type === 'polygon' || element.type === 'star') item.fitBounds(rectangle)
  if (element.scaleX !== 1 || element.scaleY !== 1) item.scale(element.scaleX, element.scaleY, rectangle.center)
  if (element.rotation) item.rotate(element.rotation, rectangle.center)
  return item
}
