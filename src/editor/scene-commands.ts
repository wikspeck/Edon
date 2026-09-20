import { createElement, createId, type EdonDocument, type EdonElement } from '../model/document'
import { boundsOf, descendantsOf, rootSelection, translateElements } from './geometry'

export type LayerOrder = 'forward' | 'backward' | 'front' | 'back'
export type AlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type DistributeMode = 'horizontal' | 'vertical'
export interface SceneResult { document: EdonDocument; selectionIds: string[] }

export function updateElements(document: EdonDocument, updater: (elements: EdonElement[]) => EdonElement[]): EdonDocument {
  return { ...document, pages: document.pages.map((page) => page.id === document.activePageId ? { ...page, elements: updater(page.elements) } : page) }
}

export function deleteSelection(document: EdonDocument, ids: string[]): SceneResult {
  return { document: updateElements(document, (elements) => {
    const targets = new Set(descendantsOf(elements, ids).map((element) => element.id))
    return elements.filter((element) => !targets.has(element.id))
  }), selectionIds: [] }
}

export function duplicateSelection(document: EdonDocument, ids: string[], offset = 16): SceneResult {
  let nextSelection: string[] = []
  const nextDocument = updateElements(document, (elements) => {
    const roots = rootSelection(elements, ids)
    const source = descendantsOf(elements, roots.map((element) => element.id))
    const idMap = new Map(source.map((element) => [element.id, createId(element.type)]))
    const copies = source.map((element) => ({ ...element, id: idMap.get(element.id)!, name: `${element.name} copy`, parentId: element.parentId ? idMap.get(element.parentId) ?? element.parentId : null, x: element.x + offset, y: element.y + offset }))
    nextSelection = roots.map((element) => idMap.get(element.id)!)
    return [...elements, ...copies]
  })
  return { document: nextDocument, selectionIds: nextSelection }
}

export function copyPayload(elements: EdonElement[], ids: string[]): EdonElement[] {
  return descendantsOf(elements, rootSelection(elements, ids).map((element) => element.id)).map((element) => structuredClone(element))
}

export function pastePayload(document: EdonDocument, payload: EdonElement[], offset: number): SceneResult {
  const idMap = new Map(payload.map((element) => [element.id, createId(element.type)]))
  const roots = payload.filter((element) => !element.parentId || !idMap.has(element.parentId))
  const copies = payload.map((element) => ({ ...structuredClone(element), id: idMap.get(element.id)!, parentId: element.parentId ? idMap.get(element.parentId) ?? null : null, x: element.x + offset, y: element.y + offset }))
  return { document: updateElements(document, (elements) => [...elements, ...copies]), selectionIds: roots.map((element) => idMap.get(element.id)!) }
}

export function groupSelection(document: EdonDocument, ids: string[]): SceneResult {
  let groupId: string | null = null
  const nextDocument = updateElements(document, (elements) => {
    const roots = rootSelection(elements, ids)
    if (roots.length < 2) return elements
    const bounds = boundsOf(roots)
    const group = createElement('group', bounds.x, bounds.y, bounds.width, bounds.height)
    group.parentId = roots.every((element) => element.parentId === roots[0].parentId) ? roots[0].parentId : null
    groupId = group.id
    const selected = new Set(roots.map((element) => element.id))
    return [...elements.map((element) => selected.has(element.id) ? { ...element, parentId: group.id } : element), group]
  })
  return { document: nextDocument, selectionIds: groupId ? [groupId] : ids }
}

export function ungroupSelection(document: EdonDocument, ids: string[]): SceneResult {
  let children: string[] = []
  const nextDocument = updateElements(document, (elements) => {
    const groups = elements.filter((element) => ids.includes(element.id) && element.type === 'group')
    if (!groups.length) return elements
    const groupMap = new Map(groups.map((group) => [group.id, group.parentId]))
    children = elements.filter((element) => element.parentId && groupMap.has(element.parentId)).map((element) => element.id)
    return elements.filter((element) => !groupMap.has(element.id)).map((element) => element.parentId && groupMap.has(element.parentId) ? { ...element, parentId: groupMap.get(element.parentId) ?? null } : element)
  })
  return { document: nextDocument, selectionIds: children }
}

export function reorderSelection(document: EdonDocument, ids: string[], mode: LayerOrder): EdonDocument {
  return updateElements(document, (elements) => {
    const targetIds = new Set(descendantsOf(elements, ids).map((element) => element.id))
    const selected = elements.filter((element) => targetIds.has(element.id))
    const rest = elements.filter((element) => !targetIds.has(element.id))
    if (mode === 'front') return [...rest, ...selected]
    if (mode === 'back') return [...selected, ...rest]
    const next = [...elements]
    if (mode === 'forward') {
      for (let index = next.length - 2; index >= 0; index--) if (targetIds.has(next[index].id) && !targetIds.has(next[index + 1].id)) [next[index], next[index + 1]] = [next[index + 1], next[index]]
    } else {
      for (let index = 1; index < next.length; index++) if (targetIds.has(next[index].id) && !targetIds.has(next[index - 1].id)) [next[index], next[index - 1]] = [next[index - 1], next[index]]
    }
    return next
  })
}

export function alignSelection(document: EdonDocument, ids: string[], mode: AlignMode): EdonDocument {
  return updateElements(document, (elements) => {
    const roots = rootSelection(elements, ids)
    if (roots.length < 2) return elements
    const all = boundsOf(roots)
    let result = elements
    for (const element of roots) {
      const x = mode === 'left' ? all.x : mode === 'center' ? all.centerX - element.width * element.scaleX / 2 : mode === 'right' ? all.right - element.width * element.scaleX : element.x
      const y = mode === 'top' ? all.y : mode === 'middle' ? all.centerY - element.height * element.scaleY / 2 : mode === 'bottom' ? all.bottom - element.height * element.scaleY : element.y
      result = translateElements(result, [element.id], x - element.x, y - element.y)
    }
    return result
  })
}

export function distributeSelection(document: EdonDocument, ids: string[], mode: DistributeMode): EdonDocument {
  return updateElements(document, (elements) => {
    const roots = [...rootSelection(elements, ids)].sort((a, b) => mode === 'horizontal' ? a.x - b.x : a.y - b.y)
    if (roots.length < 3) return elements
    const first = roots[0]
    const last = roots.at(-1)!
    const occupied = roots.reduce((sum, element) => sum + (mode === 'horizontal' ? element.width * element.scaleX : element.height * element.scaleY), 0)
    const span = mode === 'horizontal' ? last.x + last.width * last.scaleX - first.x : last.y + last.height * last.scaleY - first.y
    const gap = (span - occupied) / (roots.length - 1)
    let cursor = mode === 'horizontal' ? first.x : first.y
    let result = elements
    for (const element of roots) {
      const delta = cursor - (mode === 'horizontal' ? element.x : element.y)
      result = translateElements(result, [element.id], mode === 'horizontal' ? delta : 0, mode === 'vertical' ? delta : 0)
      cursor += (mode === 'horizontal' ? element.width * element.scaleX : element.height * element.scaleY) + gap
    }
    return result
  })
}

export function renameElement(document: EdonDocument, id: string, name: string): EdonDocument {
  return updateElements(document, (elements) => elements.map((element) => element.id === id ? { ...element, name: name.trim() || element.name } : element))
}
