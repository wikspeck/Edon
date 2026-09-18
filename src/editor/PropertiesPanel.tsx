import { AlignCenter, AlignLeft, AlignRight, Blend, ChevronDown, CircleDot, Copy, LockKeyhole, RotateCw, SlidersHorizontal, Trash2 } from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import type { EdonElement } from '../model/document'
import { useEditor } from './editor-state'

function NumberField({ label, value, onChange, icon }: { label: string; value: number; onChange: (value: number) => void; icon?: React.ReactNode }) {
  return <label className="property-input"><span>{icon ?? label}</span><input aria-label={label} type="number" value={Number.isInteger(value) ? value : Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function PropertiesPanel() {
  const { selectedElement: element, updateElement, removeSelected, page } = useEditor()

  return (
    <aside className="properties-panel panel-surface">
      <header className="panel-header"><div className="panel-title"><span>Properties</span></div><IconButton label="Properties options"><SlidersHorizontal size={14} /></IconButton></header>
      {element ? <ElementProperties element={element} update={(patch) => updateElement(element.id, patch)} onDelete={removeSelected} /> : <DocumentProperties page={page} />}
    </aside>
  )
}

function ElementProperties({ element, update, onDelete }: { element: EdonElement; update: (patch: Partial<EdonElement>) => void; onDelete: () => void }) {
  return <div className="properties-content">
    <section className="property-section">
      <div className="property-section-heading"><span>Position</span><IconButton label="Lock proportions"><LockKeyhole size={13} /></IconButton></div>
      <div className="property-grid"><NumberField label="X" value={element.x} onChange={(x) => update({ x })} /><NumberField label="Y" value={element.y} onChange={(y) => update({ y })} /><NumberField label="Width" value={element.width} onChange={(width) => update({ width: Math.max(1, width) })} /><NumberField label="Height" value={element.height} onChange={(height) => update({ height: Math.max(1, height) })} /></div>
      <div className="property-wide-row"><NumberField label="Rotation" icon={<RotateCw size={12} />} value={element.rotation} onChange={(rotation) => update({ rotation })} /><NumberField label="Opacity" icon={<Blend size={12} />} value={Math.round(element.opacity * 100)} onChange={(opacity) => update({ opacity: Math.min(1, Math.max(0, opacity / 100)) })} /></div>
    </section>

    {element.type === 'text' && <section className="property-section">
      <div className="property-section-heading"><span>Typography</span></div>
      <label className="text-value-field"><span>Content</span><textarea value={element.text} rows={3} onChange={(event) => update({ text: event.target.value })} /></label>
      <button className="select-control"><span>{element.fontFamily?.split(',')[0]}</span><ChevronDown size={13} /></button>
      <div className="property-grid"><NumberField label="Size" value={element.fontSize ?? 16} onChange={(fontSize) => update({ fontSize })} /><NumberField label="Weight" value={element.fontWeight ?? 400} onChange={(fontWeight) => update({ fontWeight })} /></div>
      <div className="alignment-control">{(['left', 'center', 'right'] as const).map((alignment) => { const Icon = alignment === 'left' ? AlignLeft : alignment === 'center' ? AlignCenter : AlignRight; return <button key={alignment} className={element.textAlign === alignment ? 'is-active' : ''} onClick={() => update({ textAlign: alignment })} aria-label={`Align ${alignment}`}><Icon size={15} /></button> })}</div>
    </section>}

    <section className="property-section">
      <div className="property-section-heading"><span>Appearance</span><IconButton label="Copy style"><Copy size={13} /></IconButton></div>
      <label className="color-control"><span className="color-swatch checkerboard"><i style={{ background: element.fill }} /></span><span>Fill</span><input type="color" value={toColorValue(element.fill)} onChange={(event) => update({ fill: event.target.value })} /><code>{element.fill.toUpperCase()}</code></label>
      <label className="color-control"><span className="color-swatch checkerboard"><i style={{ background: element.stroke }} /></span><span>Stroke</span><input type="color" value={toColorValue(element.stroke)} onChange={(event) => update({ stroke: event.target.value, strokeWidth: element.strokeWidth || 1 })} /><code>{element.stroke === '#00000000' ? 'None' : element.stroke.toUpperCase()}</code></label>
      <div className="property-grid"><NumberField label="Stroke" value={element.strokeWidth} onChange={(strokeWidth) => update({ strokeWidth: Math.max(0, strokeWidth) })} /><NumberField label="Radius" icon={<CircleDot size={12} />} value={element.cornerRadius} onChange={(cornerRadius) => update({ cornerRadius: Math.max(0, cornerRadius) })} /></div>
    </section>
    <section className="property-section property-danger"><button onClick={onDelete}><Trash2 size={14} /> Delete layer <kbd>⌫</kbd></button></section>
  </div>
}

function DocumentProperties({ page }: { page: ReturnType<typeof useEditor>['page'] }) {
  return <div className="properties-content document-properties">
    <section className="property-section"><div className="property-section-heading"><span>Canvas</span></div><div className="document-thumbnail" style={{ aspectRatio: `${page.width} / ${page.height}` }} /><dl><div><dt>Dimensions</dt><dd>{page.width} × {page.height}</dd></div><div><dt>Background</dt><dd><i style={{ background: page.background }} /> {page.background.toUpperCase()}</dd></div><div><dt>Layers</dt><dd>{page.elements.length}</dd></div></dl></section>
    <div className="selection-hint"><span>Nothing selected</span><p>Select a layer on the canvas to edit its position, dimensions and appearance.</p><kbd>V</kbd></div>
  </div>
}

const toColorValue = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
