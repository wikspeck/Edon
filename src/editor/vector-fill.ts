import { createId, type EdonElement } from '../model/document'

export function canVectorFill(e: EdonElement): boolean { return ['rectangle','frame','ellipse','polygon','star'].includes(e.type) || (e.type === 'path' && Boolean(e.closed || /z\s*$/i.test(e.pathData ?? ''))) }
export function createVectorFill(source: EdonElement, color: string, overlap = .5): EdonElement {
  if (!canVectorFill(source)) throw new Error('Close the vector path before filling it.')
  return { ...structuredClone(source), id: createId('fill'), name: `${source.name} fill`, fill: color, fillPaint: { type: 'solid', color }, stroke: color, strokeWidth: 0, effects: [], locked: false, vectorFill: { sourceId: source.id, overlap }, ui: undefined }
}
export function resolveVectorFills(elements: EdonElement[]): EdonElement[] {
  const map = new Map(elements.map(e => [e.id,e]))
  const resolved = elements.map(e => {
    const source = e.vectorFill ? map.get(e.vectorFill.sourceId) : undefined
    if (!e.vectorFill) return e
    if (!source) return { ...e, visible: false }
    // Only bleed into an opaque contour, never beyond it. Rectangle strokes are
    // inset in Edon; path/polygon strokes are centered on the boundary.
    const centered = ['path','polygon','star'].includes(source.type)
    const overlap = centered && /^#[0-9a-f]{6}(ff)?$/i.test(source.stroke) && (source.strokeOpacity ?? 1) === 1 ? Math.min(e.vectorFill.overlap, source.strokeWidth / 2) : 0
    return { ...e, type: source.type, x: source.x, y: source.y, width: source.width, height: source.height, rotation: source.rotation, scaleX: source.scaleX, scaleY: source.scaleY, parentId: source.parentId, visible: source.visible && e.visible, pathData: source.pathData, closed: source.closed, cornerRadius: source.cornerRadius, cornerRadii: source.cornerRadii, points: source.points, innerRadius: source.innerRadius, stroke: e.fill, strokeWidth: overlap * 2, strokeOpacity: 1 }
  })
  return resolved.filter(e => !e.vectorFill).flatMap(e => [...resolved.filter(f => f.vectorFill?.sourceId === e.id),e])
}
