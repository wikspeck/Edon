import type { EdonDocument, EdonElement, EdonPage, ElementType } from '../../model/document'
import { API_LIMITS, type ElementPatch } from './contract'
import { PublicApiError } from './errors'

const HEX_COLOR = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i
const ID = /^[a-z][a-z0-9-]{0,31}_[a-zA-Z0-9-]{8,80}$/
const SAFE_DATA_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/
const ELEMENT_TYPES = new Set<ElementType>(['group', 'frame', 'rectangle', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'path', 'text', 'image', 'raster'])
const PATCH_FIELDS = new Set(['name', 'parentId', 'x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY', 'opacity', 'blendMode', 'fill', 'fillPaint', 'stroke', 'strokeWidth', 'visible', 'locked', 'text', 'fontFamily', 'fontSize', 'fontWeight', 'textAlign', 'imageUrl'])

const invalid = (field: string, message: string): never => { throw new PublicApiError('VALIDATION_ERROR', message, 400, { field }) }

export function assertId(value: string, field = 'id'): void { if (!ID.test(value)) invalid(field, 'ID has an invalid format.') }
export function assertRevision(value: number): void { if (!Number.isSafeInteger(value) || value < 1) invalid('ifMatchRevision', 'Revision must be a positive integer.') }
export function assertName(value: string, field: string, max: number): void { if (typeof value !== 'string' || !value.trim() || value.length > max) invalid(field, `${field} must contain 1 to ${max} characters.`) }
export function assertDimension(value: number, field: string): void { if (!Number.isFinite(value) || value < API_LIMITS.canvasDimensionMin || value > API_LIMITS.canvasDimensionMax) invalid(field, `${field} must be between ${API_LIMITS.canvasDimensionMin} and ${API_LIMITS.canvasDimensionMax}.`) }
export function assertColor(value: string, field: string): void { if (!HEX_COLOR.test(value)) invalid(field, `${field} must be a six- or eight-digit hexadecimal color.`) }
export function assertElementType(value: string): asserts value is ElementType { if (!ELEMENT_TYPES.has(value as ElementType)) invalid('type', 'Element type is not supported.') }
export function assertCursor(cursor?: string): number {
  if (!cursor) return 0
  const match = /^c_(\d+)$/.exec(cursor)
  if (!match) invalid('cursor', 'Cursor is invalid.')
  return Number(match![1])
}
export function assertPageSize(value?: number): number { const size = value ?? API_LIMITS.pageSizeDefault; if (!Number.isSafeInteger(size) || size < 1 || size > API_LIMITS.pageSizeMax) invalid('limit', `Limit must be between 1 and ${API_LIMITS.pageSizeMax}.`); return size }

export function assertElementPatch(patch: ElementPatch): void {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) invalid('patch', 'Patch must be an object.')
  const unknown = Object.keys(patch).find((key) => !PATCH_FIELDS.has(key))
  if (unknown) invalid(unknown, `Unknown or immutable element field: ${unknown}.`)
  if (patch.name !== undefined) assertName(patch.name, 'name', API_LIMITS.elementNameMax)
  for (const field of ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'strokeWidth', 'fontSize', 'fontWeight'] as const) if (patch[field] !== undefined && !Number.isFinite(patch[field])) invalid(field, `${field} must be a finite number.`)
  for (const field of ['x', 'y'] as const) if (patch[field] !== undefined && Math.abs(patch[field]) > 1_000_000) invalid(field, `${field} must be between -1000000 and 1000000.`)
  if (patch.rotation !== undefined && Math.abs(patch.rotation) > 36_000) invalid('rotation', 'Rotation must be between -36000 and 36000 degrees.')
  for (const field of ['scaleX', 'scaleY'] as const) if (patch[field] !== undefined && Math.abs(patch[field]) > 100) invalid(field, `${field} must be between -100 and 100.`)
  if (patch.strokeWidth !== undefined && (patch.strokeWidth < 0 || patch.strokeWidth > 10_000)) invalid('strokeWidth', 'Stroke width must be between 0 and 10000.')
  if (patch.fontSize !== undefined && (patch.fontSize < 1 || patch.fontSize > 10_000)) invalid('fontSize', 'Font size must be between 1 and 10000.')
  if (patch.fontWeight !== undefined && (patch.fontWeight < 1 || patch.fontWeight > 1_000)) invalid('fontWeight', 'Font weight must be between 1 and 1000.')
  for (const field of ['width', 'height'] as const) if (patch[field] !== undefined) assertDimension(patch[field], field)
  if (patch.opacity !== undefined && (!Number.isFinite(patch.opacity) || patch.opacity < 0 || patch.opacity > 1)) invalid('opacity', 'Opacity must be between 0 and 1.')
  for (const field of ['fill', 'stroke'] as const) if (patch[field] !== undefined) assertColor(patch[field], field)
  if (patch.text !== undefined && patch.text.length > API_LIMITS.textMax) invalid('text', `Text cannot exceed ${API_LIMITS.textMax} characters.`)
  if (patch.parentId !== undefined && patch.parentId !== null) assertId(patch.parentId, 'parentId')
  if (patch.imageUrl !== undefined && !SAFE_DATA_IMAGE.test(patch.imageUrl)) invalid('imageUrl', 'Only base64 PNG, JPEG, WebP, or GIF data URLs are accepted. Remote URLs must use the future Asset API.')
  if (patch.blendMode !== undefined && !['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'].includes(patch.blendMode)) invalid('blendMode', 'Blend mode is not supported.')
  if (patch.textAlign !== undefined && !['left', 'center', 'right'].includes(patch.textAlign)) invalid('textAlign', 'Text alignment is not supported.')
  if (patch.fillPaint !== undefined) {
    if (patch.fillPaint.type === 'solid') assertColor(patch.fillPaint.color, 'fillPaint.color')
    else {
      if (!Array.isArray(patch.fillPaint.stops) || patch.fillPaint.stops.length < 2 || patch.fillPaint.stops.length > 20) invalid('fillPaint.stops', 'A gradient requires 2 to 20 stops.')
      for (const stop of patch.fillPaint.stops) { assertId(stop.id, 'fillPaint.stops.id'); assertColor(stop.color, 'fillPaint.stops.color'); if (!Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1) invalid('fillPaint.stops.offset', 'Gradient stop offsets must be between 0 and 1.') }
      if (patch.fillPaint.type === 'linear-gradient' && !Number.isFinite(patch.fillPaint.angle)) invalid('fillPaint.angle', 'Gradient angle must be finite.')
    }
  }
}

export function findPage(document: EdonDocument, slideId: string): EdonPage | undefined { return document.pages.find((page) => page.id === slideId) }
export function findElement(page: EdonPage, elementId: string): EdonElement | undefined { return page.elements.find((element) => element.id === elementId) }
