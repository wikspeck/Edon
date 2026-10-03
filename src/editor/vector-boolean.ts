import type paperRuntime from 'paper'
type PaperScope = typeof paperRuntime
type PathItem = InstanceType<PaperScope['PathItem']>
import { createElement, createId, type EdonElement, type ElementMask } from '../model/document'
import { polygonPoints } from './rendering'

export type BooleanOperation = 'union' | 'subtract' | 'intersect' | 'exclude'
const compatible = new Set(['rectangle', 'ellipse', 'polygon', 'star', 'path'])

export function canBoolean(elements: EdonElement[]): boolean { return elements.length >= 2 && elements.every((element) => compatible.has(element.type) && (element.type !== 'path' || Boolean(element.pathData)) && !element.locked && element.parentId === elements[0].parentId) }

export async function booleanElements(bottom: EdonElement, top: EdonElement, operation: BooleanOperation): Promise<EdonElement | null> {
  return booleanSelection([bottom, top], operation)
}

export async function booleanSelection(elements: EdonElement[], operation: BooleanOperation): Promise<EdonElement | null> {
  const paperRuntime = (await import('paper')).default
  const scope = new paperRuntime.PaperScope(); scope.setup(new scope.Size(1, 1))
  const bottom = elements[0]
  try {
  let result: PathItem | null = toPaperItem(scope, bottom)
  if (!result) throw new Error('The selected shape has no closed geometry.')
  for (const element of elements.slice(1)) {
  const first: PathItem = result; const second = toPaperItem(scope, element)
  if (!second) throw new Error('The selected shape has no closed geometry.')
  result = operation === 'union' ? first.unite(second, { insert: false })
    : operation === 'subtract' ? first.subtract(second, { insert: false })
      : operation === 'intersect' ? first.intersect(second, { insert: false })
        : first.exclude(second, { insert: false })
  }
  if (!result || !result.pathData || result.bounds.width < .01 || result.bounds.height < .01) return null
  const bounds = result.bounds.clone()
  result.translate(new scope.Point(-bounds.x, -bounds.y))
  const element = createElement('path', bounds.x, bounds.y, bounds.width, bounds.height)
  element.x = bounds.x; element.y = bounds.y; element.width = bounds.width; element.height = bounds.height
  element.name = `${operation[0].toUpperCase()}${operation.slice(1)}`
  element.pathData = result.pathData
  element.fill = bottom.fill
  element.fillPaint = structuredClone(bottom.fillPaint)
  element.stroke = bottom.stroke
  element.strokeWidth = bottom.strokeWidth
  element.parentId = bottom.parentId; element.opacity = bottom.opacity; element.closed = true
  return element
  } finally { scope.project.remove() }
}

export async function selectionMask(content: EdonElement, shape: EdonElement): Promise<ElementMask> {
  const runtime = (await import('paper')).default; const scope = new runtime.PaperScope(); scope.setup(new scope.Size(1, 1))
  try {
    const item = toPaperItem(scope, shape); if (!item) throw new Error('Select a vector shape above the content to mask.')
    const center = new scope.Point(content.x + content.width / 2, content.y + content.height / 2)
    item.rotate(-content.rotation, center); item.scale(1 / content.scaleX, 1 / content.scaleY, center)
    item.translate(new scope.Point(-content.x, -content.y)); item.scale(1 / content.width, 1 / content.height, new scope.Point(0, 0))
    return { id: createId('mask'), type: 'shape', shape: 'rectangle', cornerRadius: 0, sides: 4, inset: 0, inverted: false, pathData: item.pathData }
  } finally { scope.project.remove() }
}

function toPaperItem(scope: PaperScope, element: EdonElement): PathItem | null {
  let item: PathItem
  const rectangle = new scope.Rectangle(element.x, element.y, element.width, element.height)
  if (element.type === 'rectangle') item = new scope.Path.Rectangle(rectangle, new scope.Size(element.cornerRadius, element.cornerRadius))
  else if (element.type === 'ellipse') item = new scope.Path.Ellipse(rectangle)
  else if (element.type === 'polygon' || element.type === 'star') { const points = polygonPoints(element.points, element.type === 'star' ? element.innerRadius : undefined, element.imperfection, element.imperfectionSeed).split(' ').map((pair) => { const [x, y] = pair.split(',').map(Number); return new scope.Point(element.x + x / 100 * element.width, element.y + y / 100 * element.height) }); item = new scope.Path({ segments: points, closed: true }) }
  else if (element.type === 'path' && element.pathData) { item = new scope.CompoundPath(element.pathData); item.translate(new scope.Point(element.x, element.y)) }
  else return null
  if (element.scaleX !== 1 || element.scaleY !== 1) item.scale(element.scaleX, element.scaleY, rectangle.center)
  if (element.rotation) item.rotate(element.rotation, rectangle.center)
  return item
}
