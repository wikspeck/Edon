import { useState } from 'react'
import type { EdonElement } from '../model/document'
import { useEditor } from './editor-state'

export function PrecisionControls({ element }: { element: EdonElement }) {
  const editor = useEditor()
  const [width, setWidth] = useState(String(element.width))
  const [height, setHeight] = useState(String(element.height))
  const [linked, setLinked] = useState(true)
  const resize = (axis: 'width' | 'height', raw: string) => {
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) return
    const ratio = element.width / element.height
    editor.updateElement(element.id, axis === 'width' ? { width: value, ...(linked ? { height: value / ratio } : {}) } : { height: value, ...(linked ? { width: value * ratio } : {}) })
  }
  return <details className="property-section"><summary>Precision</summary>
    <label className="checkbox-control"><input type="checkbox" checked={linked} onChange={event => setLinked(event.target.checked)} /> Preserve proportions</label>
    <div className="property-grid"><label className="property-input"><span>W</span><input aria-label="Precision width" type="number" min="0.01" step="0.01" value={width} onChange={event => setWidth(event.target.value)} onBlur={() => resize('width', width)} onKeyDown={event => { if(event.key === 'Enter') event.currentTarget.blur() }} /></label><label className="property-input"><span>H</span><input aria-label="Precision height" type="number" min="0.01" step="0.01" value={height} onChange={event => setHeight(event.target.value)} onBlur={() => resize('height', height)} onKeyDown={event => { if(event.key === 'Enter') event.currentTarget.blur() }} /></label></div>
    <button className="auto-enhance" onClick={() => editor.updateElement(element.id, { x: Math.round(element.x), y: Math.round(element.y) })}>Snap position to whole pixels</button>
    <p className="tool-hint">Arrow keys: 1 px · Shift: 10 px · Alt: 0.1 px. Locked layers stay in place.</p>
  </details>
}
