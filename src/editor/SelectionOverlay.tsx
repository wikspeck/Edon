import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { EdonElement } from '../model/document'
import { boundsOf, visualRect } from './geometry'

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate'

export function SelectionOverlay({ elements, zoom, onHandleDown }: { elements: EdonElement[]; zoom: number; onHandleDown: (event: ReactPointerEvent, handle: ResizeHandle) => void }) {
  if (!elements.length) return null
  const single = elements.length === 1 ? elements[0] : null
  const bounds = single ? visualRect(single) : boundsOf(elements)
  const style: CSSProperties = { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height, transform: single ? `rotate(${single.rotation}deg)` : undefined, borderWidth: 1 / zoom }
  const handleStyle: CSSProperties = { width: 7 / zoom, height: 7 / zoom, borderWidth: 1 / zoom }
  return <div className="selection-box" style={style}>
    {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as ResizeHandle[]).map((handle) => <i key={handle} className={`handle ${handle}`} style={handleStyle} onPointerDown={(event) => onHandleDown(event, handle)} />)}
    <span className="rotation-stem" style={{ height: 22 / zoom, borderLeftWidth: 1 / zoom }} />
    <i className="rotation-handle" style={handleStyle} onPointerDown={(event) => onHandleDown(event, 'rotate')} />
    <small className="selection-size" style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'top left' }}>{Math.round(bounds.width)} × {Math.round(bounds.height)}</small>
  </div>
}
