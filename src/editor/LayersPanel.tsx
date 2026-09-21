import { useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowRight, ChevronDown, Circle, Eye, EyeOff, Frame, Group, Hexagon, Image, Layers, Lock, LockOpen, Minus, MousePointer2, Square, Star, Type } from 'lucide-react'
import type { EdonElement } from '../model/document'
import { useEditor } from './editor-state'
import { sceneChildren, visibleLayerOrder } from './scene-tree'

const iconFor = { group: Group, frame: Frame, rectangle: Square, ellipse: Circle, line: Minus, arrow: ArrowRight, polygon: Hexagon, star: Star, path: MousePointer2, text: Type, image: Image, raster: Layers }

export function LayersPanel() {
  const editor = useEditor(); const lastSelected = useRef<string | null>(null)
  const roots = [...sceneChildren(editor.page.elements, null)].reverse(); const displayOrder = visibleLayerOrder(editor.page.elements)
  const selectLayer = (id: string, event: MouseEvent) => {
    if (event.shiftKey && lastSelected.current) {
      const from = displayOrder.findIndex((element) => element.id === lastSelected.current); const to = displayOrder.findIndex((element) => element.id === id)
      if (from >= 0 && to >= 0) editor.selectMany(displayOrder.slice(Math.min(from, to), Math.max(from, to) + 1).map((element) => element.id))
    } else editor.select(id, event.ctrlKey || event.metaKey)
    lastSelected.current = id
  }
  return <aside className="layers-panel panel-surface">
    <header className="panel-header"><div className="panel-title"><span>Layers</span><small>{editor.page.elements.length}</small></div></header>
    <div className="page-row"><ChevronDown size={13} /><span>{editor.page.name}</span><small>{editor.page.width} × {editor.page.height}</small></div>
    <div className="layer-list" role="tree">
      {roots.map((element) => <LayerItem key={element.id} element={element} depth={0} allElements={editor.page.elements} selectedIds={editor.selectionIds} onSelect={selectLayer} onToggle={editor.toggleElement} onRename={editor.renameLayer} onReorder={editor.reorderLayer} />)}
      {editor.page.elements.length === 0 && <div className="layers-empty"><div className="layers-empty-icon"><Square size={17} /><Circle size={12} /></div><strong>No layers yet</strong><span>Choose a drawing or shape tool, then work on the canvas.</span></div>}
    </div>
  </aside>
}

interface LayerItemProps {
  element: EdonElement; depth: number; allElements: EdonElement[]; selectedIds: string[]
  onSelect: (id: string, event: MouseEvent) => void
  onToggle: (id: string, property: 'visible' | 'locked') => void
  onRename: (id: string, name: string) => void
  onReorder: (id: string, targetId: string, position: 'above' | 'below') => void
}

function LayerItem({ element, depth, allElements, selectedIds, onSelect, onToggle, onRename, onReorder }: LayerItemProps) {
  const [editing, setEditing] = useState(false); const [collapsed, setCollapsed] = useState(false); const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null)
  const Icon = iconFor[element.type]; const children = [...sceneChildren(allElements, element.id)].reverse()
  const finishRename = (value: string) => { onRename(element.id, value); setEditing(false) }
  const renameKey = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') finishRename(event.currentTarget.value); if (event.key === 'Escape') setEditing(false) }
  const dragPosition = (event: DragEvent) => event.clientY < event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2 ? 'above' : 'below'
  return <>
    <div role="treeitem" aria-selected={selectedIds.includes(element.id)} draggable={!editing}
      onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/edon-layer', element.id) }}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('text/edon-layer')) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropPosition(dragPosition(event)) } }}
      onDragLeave={() => setDropPosition(null)} onDragEnd={() => setDropPosition(null)}
      onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/edon-layer'); const position = dragPosition(event); setDropPosition(null); if (id && id !== element.id) onReorder(id, element.id, position) }}
      className={`layer-row ${selectedIds.includes(element.id) ? 'is-selected' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`} style={{ paddingLeft: 8 + depth * 14 }}
      onClick={(event) => onSelect(element.id, event)} onDoubleClick={() => setEditing(true)}>
      <button className="layer-disclosure" tabIndex={children.length ? 0 : -1} aria-label={collapsed ? 'Expand group' : 'Collapse group'} onClick={(event) => { event.stopPropagation(); if (children.length) setCollapsed(!collapsed) }}>{children.length ? collapsed ? <ArrowRight size={11} /> : <ChevronDown size={11} /> : null}</button>
      <Icon size={14} strokeWidth={1.7} />
      {editing ? <input className="layer-name-input" defaultValue={element.name} autoFocus onClick={(event) => event.stopPropagation()} onBlur={(event) => finishRename(event.currentTarget.value)} onKeyDown={renameKey} /> : <span className="layer-name">{element.name}</span>}
      <span className="layer-actions"><button aria-label={element.visible ? 'Hide layer' : 'Show layer'} onClick={(event) => { event.stopPropagation(); onToggle(element.id, 'visible') }}>{element.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button><button aria-label={element.locked ? 'Unlock layer' : 'Lock layer'} onClick={(event) => { event.stopPropagation(); onToggle(element.id, 'locked') }}>{element.locked ? <Lock size={12} /> : <LockOpen size={12} />}</button></span>
    </div>
    {!collapsed && children.map((child) => <LayerItem key={child.id} element={child} depth={depth + 1} allElements={allElements} selectedIds={selectedIds} onSelect={onSelect} onToggle={onToggle} onRename={onRename} onReorder={onReorder} />)}
  </>
}
