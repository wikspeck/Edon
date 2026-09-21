import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { ArrowRight, ChevronDown, Circle, Eye, EyeOff, Frame, Group, Hexagon, Image, Layers, Lock, LockOpen, Minus, MousePointer2, Square, Star, Type } from 'lucide-react'
import type { EdonElement } from '../model/document'
import { useEditor } from './editor-state'

const iconFor = { group: Group, frame: Frame, rectangle: Square, ellipse: Circle, line: Minus, arrow: ArrowRight, polygon: Hexagon, star: Star, path: MousePointer2, text: Type, image: Image, raster: Layers }

export function LayersPanel() {
  const editor = useEditor()
  const roots = [...editor.page.elements.filter((element) => !element.parentId)].reverse()
  return <aside className="layers-panel panel-surface">
    <header className="panel-header"><div className="panel-title"><span>Layers</span><small>{editor.page.elements.length}</small></div></header>
    <div className="page-row"><ChevronDown size={13} /><span>{editor.page.name}</span><small>{editor.page.width} × {editor.page.height}</small></div>
    <div className="layer-list" role="tree">
      {roots.map((element) => <LayerItem key={element.id} element={element} depth={0} allElements={editor.page.elements} selectedIds={editor.selectionIds} onSelect={editor.select} onToggle={editor.toggleElement} onRename={editor.renameLayer} onReorder={editor.reorderLayer} />)}
      {editor.page.elements.length === 0 && <div className="layers-empty"><div className="layers-empty-icon"><Square size={17} /><Circle size={12} /></div><strong>No layers yet</strong><span>Choose a shape or text tool, then draw on the canvas.</span></div>}
    </div>
  </aside>
}

interface LayerItemProps {
  element: EdonElement; depth: number; allElements: EdonElement[]; selectedIds: string[]
  onSelect: (id: string, additive?: boolean) => void
  onToggle: (id: string, property: 'visible' | 'locked') => void
  onRename: (id: string, name: string) => void
  onReorder: (id: string, targetId: string) => void
}

function LayerItem({ element, depth, allElements, selectedIds, onSelect, onToggle, onRename, onReorder }: LayerItemProps) {
  const [editing, setEditing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const Icon = iconFor[element.type]
  const children = [...allElements.filter((item) => item.parentId === element.id)].reverse()
  const finishRename = (value: string) => { onRename(element.id, value); setEditing(false) }
  const stop = (event: MouseEvent, property: 'visible' | 'locked') => { event.stopPropagation(); onToggle(element.id, property) }
  const renameKey = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') finishRename(event.currentTarget.value); if (event.key === 'Escape') setEditing(false) }
  return <>
    <button
      role="treeitem" draggable onDragStart={(event) => event.dataTransfer.setData('text/edon-layer', element.id)}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('text/edon-layer')) event.preventDefault() }}
      onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/edon-layer'); if (id && id !== element.id) onReorder(id, element.id) }}
      className={`layer-row ${selectedIds.includes(element.id) ? 'is-selected' : ''}`} style={{ paddingLeft: 8 + depth * 14 }}
      onClick={(event) => onSelect(element.id, event.shiftKey)} onDoubleClick={() => setEditing(true)}
    >
      {children.length ? <span className="layer-disclosure" onClick={(event) => { event.stopPropagation(); setCollapsed(!collapsed) }}>{collapsed ? <ArrowRight size={11} /> : <ChevronDown size={11} />}</span> : <span className="layer-disclosure" />}
      <Icon size={14} strokeWidth={1.7} />
      {editing ? <input className="layer-name-input" defaultValue={element.name} autoFocus onClick={(event) => event.stopPropagation()} onBlur={(event) => finishRename(event.currentTarget.value)} onKeyDown={renameKey} /> : <span className="layer-name">{element.name}</span>}
      <span className="layer-actions"><span role="button" tabIndex={0} aria-label={element.visible ? 'Hide layer' : 'Show layer'} onClick={(event) => stop(event, 'visible')}>{element.visible ? <Eye size={13} /> : <EyeOff size={13} />}</span><span role="button" tabIndex={0} aria-label={element.locked ? 'Unlock layer' : 'Lock layer'} onClick={(event) => stop(event, 'locked')}>{element.locked ? <Lock size={12} /> : <LockOpen size={12} />}</span></span>
    </button>
    {!collapsed && children.map((child) => <LayerItem key={child.id} element={child} depth={depth + 1} allElements={allElements} selectedIds={selectedIds} onSelect={onSelect} onToggle={onToggle} onRename={onRename} onReorder={onReorder} />)}
  </>
}
