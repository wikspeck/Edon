import type { EdonElement } from '../model/document'

/** The document array is the canonical order: earlier siblings are behind later siblings. */
export function sceneChildren(elements: EdonElement[], parentId: string | null): EdonElement[] {
  return elements.filter((element) => element.parentId === parentId)
}

export function flattenRenderOrder(elements: EdonElement[]): EdonElement[] {
  const result: EdonElement[] = []
  const visit = (parentId: string | null) => {
    for (const element of sceneChildren(elements, parentId)) {
      if (element.type === 'group') visit(element.id)
      else result.push(element)
    }
  }
  visit(null)
  return result
}

export function visibleLayerOrder(elements: EdonElement[]): EdonElement[] {
  const result: EdonElement[] = []
  const visit = (parentId: string | null) => {
    const siblings = sceneChildren(elements, parentId)
    for (let index = siblings.length - 1; index >= 0; index -= 1) {
      const element = siblings[index]
      result.push(element)
      if (element.type === 'group') visit(element.id)
    }
  }
  visit(null)
  return result
}

export function uniqueLayerName(elements: EdonElement[], requested: string): string {
  const base = requested.replace(/\s+\d+$/, '') || requested
  const names = new Set(elements.map((element) => element.name))
  if (!names.has(base)) return base
  let number = 2
  while (names.has(`${base} ${number}`)) number += 1
  return `${base} ${number}`
}

export function insertAboveSelection(elements: EdonElement[], element: EdonElement, selectionIds: string[]): EdonElement[] {
  const selected = selectionIds.length === 1 ? elements.find((item) => item.id === selectionIds[0]) : null
  const next = { ...element, name: uniqueLayerName(elements, element.name), parentId: selected?.parentId ?? null }
  if (!selected) return [...elements, next]
  const index = elements.findIndex((item) => item.id === selected.id)
  return [...elements.slice(0, index + 1), next, ...elements.slice(index + 1)]
}

export function moveLayer(elements: EdonElement[], id: string, targetId: string, position: 'above' | 'below'): EdonElement[] {
  const moving = elements.find((element) => element.id === id)
  const target = elements.find((element) => element.id === targetId)
  if (!moving || !target || moving.id === target.id || isDescendant(elements, target.id, moving.id)) return elements
  const nextMoving = { ...moving, parentId: target.parentId }
  const without = elements.filter((element) => element.id !== id)
  const targetIndex = without.findIndex((element) => element.id === targetId)
  const insertion = targetIndex + (position === 'above' ? 1 : 0)
  return [...without.slice(0, insertion), nextMoving, ...without.slice(insertion)]
}

export function isDescendant(elements: EdonElement[], id: string, ancestorId: string): boolean {
  let current = elements.find((element) => element.id === id)
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    current = elements.find((element) => element.id === current?.parentId)
  }
  return false
}
