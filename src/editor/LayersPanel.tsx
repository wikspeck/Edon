import { ChevronDown, Circle, Eye, EyeOff, Frame, Image, Lock, LockOpen, MoreHorizontal, Plus, Square, Type } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { useEditor } from './editor-state'

const iconFor = {
  frame: Frame,
  rectangle: Square,
  ellipse: Circle,
  text: Type,
  image: Image,
}

export function LayersPanel() {
  const { page, selectedId, select, toggleElement } = useEditor()

  return (
    <aside className="layers-panel panel-surface">
      <header className="panel-header"><div className="panel-title"><span>Layers</span><small>{page.elements.length}</small></div><div><IconButton label="Layer options"><MoreHorizontal size={15} /></IconButton><IconButton label="Add layer"><Plus size={15} /></IconButton></div></header>
      <div className="page-row"><ChevronDown size={13} /><span>{page.name}</span><small>{page.width} × {page.height}</small></div>
      <div className="layer-list" role="tree">
        {[...page.elements].reverse().map((element) => {
          const ElementIcon = iconFor[element.type]
          return (
            <button key={element.id} role="treeitem" className={`layer-row ${selectedId === element.id ? 'is-selected' : ''}`} onClick={() => select(element.id)}>
              <ElementIcon size={14} strokeWidth={1.7} />
              <span className="layer-name">{element.name}</span>
              <span className="layer-actions">
                <span role="button" tabIndex={0} aria-label={element.visible ? 'Hide layer' : 'Show layer'} onClick={(event) => { event.stopPropagation(); toggleElement(element.id, 'visible') }}>{element.visible ? <Eye size={13} /> : <EyeOff size={13} />}</span>
                <span role="button" tabIndex={0} aria-label={element.locked ? 'Unlock layer' : 'Lock layer'} onClick={(event) => { event.stopPropagation(); toggleElement(element.id, 'locked') }}>{element.locked ? <Lock size={12} /> : <LockOpen size={12} />}</span>
              </span>
            </button>
          )
        })}
        {page.elements.length === 0 && <div className="layers-empty"><div className="layers-empty-icon"><Square size={17} /><Circle size={12} /></div><strong>No layers yet</strong><span>Choose a shape or text tool, then draw on the canvas.</span></div>}
      </div>
    </aside>
  )
}
