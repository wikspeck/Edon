import { createElement, createId, type EdonElement, type UiAnimation, type UiProperties } from '../model/document'

export const defaultAnimation: UiAnimation = { preset: 'rise', trigger: 'load', duration: 600, delay: 0, easing: 'ease-out', repeat: false, distance: 24 }
export function animationFrames(a: UiAnimation): Keyframe[] {
  if (a.preset === 'custom' && a.keyframes?.length) return a.keyframes.map(k => ({ offset: k.offset, ...(k.opacity === undefined ? {} : { opacity: k.opacity }), transform: `translate(${k.translateX ?? 0}px,${k.translateY ?? 0}px) scale(${k.scale ?? 1}) rotate(${k.rotate ?? 0}deg)` }))
  return [{ opacity: a.preset === 'scale' ? 1 : 0, transform: a.preset === 'rise' ? `translateY(${a.distance}px)` : a.preset === 'scale' ? 'scale(.85)' : 'none' }, { opacity: 1, transform: 'none' }]
}

// Coordinates remain document-space, just like the existing group editor. Layout is
// materialized into the model so Canvas, hit testing, exports and MCP agree.
export function layoutChildren(elements: EdonElement[], id: string): EdonElement[] {
  const parent = elements.find(e => e.id === id), l = parent?.ui?.layout
  if (!parent || !l) return elements
  const children = elements.filter(e => e.parentId === id && !e.vectorFill)
  const row = l.direction === 'row', available = (row ? parent.width : parent.height) - 2 * l.padding
  const size = children.reduce((sum, e) => sum + (row ? e.width : e.height), 0)
  const gap = l.justify === 'space-between' && children.length > 1 ? Math.max(l.gap, (available - size) / (children.length - 1)) : l.gap
  const free = Math.max(0, available - size - gap * Math.max(0, children.length - 1))
  let cursor = l.padding + (l.justify === 'center' ? free / 2 : l.justify === 'end' ? free : 0)
  let result = elements
  for (const child of children) {
    const cross = (row ? parent.height - child.height : parent.width - child.width) - 2 * l.padding
    const offset = l.padding + (l.align === 'center' ? cross / 2 : l.align === 'end' ? cross : 0)
    const x = parent.x + (row ? cursor : offset), y = parent.y + (row ? offset : cursor)
    const dx = x - child.x, dy = y - child.y
    const ids = new Set([child.id]); let changed = true
    while (changed) { changed = false; for (const e of result) if (e.parentId && ids.has(e.parentId) && !ids.has(e.id)) { ids.add(e.id); changed = true } }
    result = result.map(e => ids.has(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e)
    cursor += (row ? child.width : child.height) + gap
  }
  return result
}

export function createUiWidget(role: UiProperties['role'], x: number, y: number): EdonElement[] {
  const width = role === 'card' ? 320 : role === 'navigation' ? 480 : role === 'checkbox' ? 160 : role === 'badge' ? 100 : 200
  const height = role === 'card' ? 220 : role === 'navigation' ? 64 : role === 'badge' ? 30 : 48
  const root = createElement('group', x, y, width, height)
  root.name = role[0].toUpperCase() + role.slice(1)
  root.ui = { role, label: role === 'input' ? 'Your email' : role === 'button' ? 'Continue' : root.name }
  if (role === 'container') return [root]
  const bg = createElement('rectangle', x, y, role === 'checkbox' ? 24 : width, role === 'checkbox' ? 24 : height)
  bg.parentId = root.id; bg.name = 'Surface'; bg.fill = role === 'button' ? '#20211f' : '#f2f2f0'; bg.fillPaint = { type: 'solid', color: bg.fill }; bg.cornerRadius = 10; bg.cornerRadii = [10,10,10,10]
  const label = createElement('text', x + (role === 'checkbox' ? 36 : 16), y + 14, width - 32, 24)
  label.parentId = root.id; label.name = 'Label'; label.text = root.ui.label; label.fontSize = 15; label.fill = role === 'button' ? '#ffffff' : '#20211f'; label.fillPaint = { type: 'solid', color: label.fill }
  if (role === 'card') { label.text = 'Card title'; label.fontSize = 22; label.height = 32 }
  if (role === 'badge') { label.y = y + 5; label.fontSize = 12; label.height = 20 }
  return [root, bg, label]
}

export function applyUiLayouts(elements: EdonElement[]): EdonElement[] {
  let result = elements
  const visit = (parent: string | null) => { for (const e of elements.filter(e => e.parentId === parent)) { if (e.ui?.layout) result=layoutChildren(result,e.id); if (e.type === 'group') visit(e.id) } }
  visit(null)
  return result
}

export function duplicateComponent(elements: EdonElement[], sourceId: string): EdonElement[] {
  const ids = new Set([sourceId]); let changed = true
  while (changed) { changed = false; for (const e of elements) if (e.parentId && ids.has(e.parentId) && !ids.has(e.id)) { ids.add(e.id); changed = true } }
  const map = new Map([...ids].map(id => [id, createId('instance')]))
  return elements.filter(e => ids.has(e.id)).map(e => ({ ...structuredClone(e), id: map.get(e.id)!, parentId: e.id === sourceId ? e.parentId : map.get(e.parentId!)!, x: e.x + 32, y: e.y + 32, ...(e.id === sourceId ? { name: `${e.name} instance`, ui: { ...(e.ui ?? { role: 'container' as const }), component: { name: e.ui?.component?.name ?? e.name, sourceId } } } : {}) }))
}
