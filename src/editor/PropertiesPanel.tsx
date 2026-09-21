import { AlignCenter, AlignHorizontalDistributeCenter, AlignLeft, AlignRight, AlignVerticalDistributeCenter, ArrowDownToLine, ArrowRightToLine, ArrowUpToLine, Blend, ChevronDown, Combine, Group, Layers2, Minus, RotateCw, Sparkles, Trash2, Ungroup, X } from 'lucide-react'
import { createId, DEFAULT_ADJUSTMENTS, type EdonElement, type ElementEffect, type FillPaint, type ImageAdjustments } from '../model/document'
import { useEditor } from './editor-state'
import { ColorControl } from './ColorPicker'

function NumberField({ label, value, onChange, icon }: { label: string; value: number; onChange: (value: number) => void; icon?: React.ReactNode }) {
  return <label className="property-input"><span>{icon ?? label}</span><input aria-label={label} type="number" value={Number.isInteger(value) ? value : Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

export function PropertiesPanel() {
  const editor = useEditor()
  return <aside className="properties-panel panel-surface">
    <header className="panel-header"><div className="panel-title"><span>Properties</span>{editor.selectionIds.length > 1 && <small>{editor.selectionIds.length}</small>}</div></header>
    {editor.selectedElements.length > 1 ? <MultipleProperties /> : editor.selectedElement?.type === 'group' ? <GroupProperties element={editor.selectedElement} /> : editor.selectedElement ? <ElementProperties element={editor.selectedElement} /> : <DocumentProperties />}
  </aside>
}

function GroupProperties({ element }: { element: EdonElement }) {
  const editor = useEditor()
  const childCount = editor.page.elements.filter((item) => item.parentId === element.id).length
  return <div className="properties-content"><PropertySection title="Group" open><dl className="group-summary"><div><dt>Children</dt><dd>{childCount}</dd></div><div><dt>Position</dt><dd>{Math.round(element.x)}, {Math.round(element.y)}</dd></div><div><dt>Size</dt><dd>{Math.round(element.width)} × {Math.round(element.height)}</dd></div></dl><Action label="Ungroup" onClick={editor.ungroup}><Ungroup size={14} /> Ungroup</Action></PropertySection><section className="property-section property-danger"><button onClick={editor.removeSelected}><Trash2 size={14} /> Delete group <kbd>Del</kbd></button></section></div>
}

function MultipleProperties() {
  const editor = useEditor()
  return <div className="properties-content">
    <PropertySection title="Align & distribute" open>
      <div className="action-grid six"><Action label="Align left" onClick={() => editor.align('left')}><AlignLeft size={14} /></Action><Action label="Align center" onClick={() => editor.align('center')}><AlignCenter size={14} /></Action><Action label="Align right" onClick={() => editor.align('right')}><AlignRight size={14} /></Action><Action label="Align top" onClick={() => editor.align('top')}><ArrowUpToLine size={14} /></Action><Action label="Align middle" onClick={() => editor.align('middle')}><ArrowRightToLine size={14} /></Action><Action label="Align bottom" onClick={() => editor.align('bottom')}><ArrowDownToLine size={14} /></Action></div>
      <div className="action-grid two"><Action label="Distribute horizontally" onClick={() => editor.distribute('horizontal')}><AlignHorizontalDistributeCenter size={14} /> Horizontal</Action><Action label="Distribute vertically" onClick={() => editor.distribute('vertical')}><AlignVerticalDistributeCenter size={14} /> Vertical</Action></div>
    </PropertySection>
    <PropertySection title="Combine" open>
      <div className="action-grid two"><Action label="Group" onClick={editor.group}><Group size={14} /> Group</Action><Action label="Ungroup" onClick={editor.ungroup}><Ungroup size={14} /> Ungroup</Action></div>
      {editor.canBooleanSelection && <div className="boolean-grid"><Action label="Union" onClick={() => editor.booleanOperation('union')}><Combine size={14} /> Add</Action><Action label="Subtract" onClick={() => editor.booleanOperation('subtract')}><Minus size={14} /> Subtract</Action><Action label="Intersect" onClick={() => editor.booleanOperation('intersect')}><Layers2 size={14} /> Intersect</Action><Action label="Exclude" onClick={() => editor.booleanOperation('exclude')}><X size={14} /> Exclude</Action></div>}
    </PropertySection>
    <PropertySection title="Appearance" open><RangeRow label="Opacity" value={Math.round(editor.selectedElements.at(-1)!.opacity * 100)} min={0} max={100} onChange={(value, live) => editor.updateSelected({ opacity: value / 100 }, live)} /></PropertySection>
    <section className="property-section property-danger"><button onClick={editor.removeSelected}><Trash2 size={14} /> Delete selection <kbd>Del</kbd></button></section>
  </div>
}

function ElementProperties({ element }: { element: EdonElement }) {
  const editor = useEditor()
  const update = (patch: Partial<EdonElement>, live = false) => editor.updateElement(element.id, patch, live)
  const isShape = ['frame', 'rectangle', 'ellipse', 'polygon', 'star', 'path'].includes(element.type)
  return <div className="properties-content">
    <PropertySection title="Transform" open>
      <div className="property-grid"><NumberField label="X" value={element.x} onChange={(x) => update({ x })} /><NumberField label="Y" value={element.y} onChange={(y) => update({ y })} /><NumberField label="Width" value={element.width} onChange={(width) => update({ width: Math.max(1, width) })} /><NumberField label="Height" value={element.height} onChange={(height) => update({ height: Math.max(1, height) })} /></div>
      <div className="property-grid"><NumberField label="Rotation" icon={<RotateCw size={12} />} value={element.rotation} onChange={(rotation) => update({ rotation })} /><NumberField label="Opacity" icon={<Blend size={12} />} value={Math.round(element.opacity * 100)} onChange={(opacity) => update({ opacity: Math.min(1, Math.max(0, opacity / 100)) })} /><NumberField label="Scale X" value={element.scaleX * 100} onChange={(scaleX) => update({ scaleX: Math.max(.01, scaleX / 100) })} /><NumberField label="Scale Y" value={element.scaleY * 100} onChange={(scaleY) => update({ scaleY: Math.max(.01, scaleY / 100) })} /></div>
    </PropertySection>
    {element.type === 'text' && <TypographyProperties element={element} update={update} />}
    {isShape && <ShapeProperties element={element} update={update} />}
    {(element.type === 'line' || element.type === 'arrow') && <StrokeProperties element={element} update={update} />}
    {element.type === 'image' && <ImageProperties element={element} update={update} />}
    <EffectsProperties element={element} update={update} />
    <section className="property-section property-danger"><button onClick={editor.removeSelected}><Trash2 size={14} /> Delete layer <kbd>Del</kbd></button></section>
  </div>
}

function TypographyProperties({ element, update }: PropertyGroupProps) {
  return <PropertySection title="Typography" open>
    <label className="text-value-field"><span>Content</span><textarea value={element.text} rows={3} onChange={(event) => update({ text: event.target.value })} /></label>
    <label className="select-control"><span>Font</span><select value={element.fontFamily} onChange={(event) => update({ fontFamily: event.target.value })}><option value="Inter, ui-sans-serif, system-ui, sans-serif">Inter / System</option><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="'Courier New', monospace">Courier New</option></select><ChevronDown size={13} /></label>
    <div className="property-grid"><NumberField label="Size" value={element.fontSize ?? 16} onChange={(fontSize) => update({ fontSize })} /><NumberField label="Weight" value={element.fontWeight ?? 400} onChange={(fontWeight) => update({ fontWeight })} /><NumberField label="Line height" value={element.lineHeight ?? 1.2} onChange={(lineHeight) => update({ lineHeight })} /><NumberField label="Tracking" value={element.letterSpacing ?? 0} onChange={(letterSpacing) => update({ letterSpacing })} /></div>
    <div className="text-style-row"><button className={element.italic ? 'is-active' : ''} onClick={() => update({ italic: !element.italic })}><em>I</em></button><button className={element.underline ? 'is-active' : ''} onClick={() => update({ underline: !element.underline })}><u>U</u></button>{(['left', 'center', 'right'] as const).map((alignment) => <button key={alignment} className={element.textAlign === alignment ? 'is-active' : ''} onClick={() => update({ textAlign: alignment })}>{alignment === 'left' ? <AlignLeft size={14} /> : alignment === 'center' ? <AlignCenter size={14} /> : <AlignRight size={14} />}</button>)}</div>
  </PropertySection>
}

function ShapeProperties({ element, update }: PropertyGroupProps) {
  const editor = useEditor()
  const gradientPaint = element.fillPaint.type === 'solid' ? null : element.fillPaint
  const setPaintType = (type: FillPaint['type']) => {
    const paint: FillPaint = type === 'solid' ? { type, color: element.fill } : type === 'linear-gradient' ? { type, angle: 90, stops: [{ id: createId('stop'), offset: 0, color: element.fill }, { id: createId('stop'), offset: 1, color: '#7c70ff' }] } : { type, stops: [{ id: createId('stop'), offset: 0, color: element.fill }, { id: createId('stop'), offset: 1, color: '#7c70ff' }] }
    update({ fillPaint: paint })
  }
  return <>
    <PropertySection title="Fill" open>
      <label className="select-control"><span>Type</span><select value={element.fillPaint.type} onChange={(event) => setPaintType(event.target.value as FillPaint['type'])}><option value="solid">Solid</option><option value="linear-gradient">Linear gradient</option><option value="radial-gradient">Radial gradient</option></select><ChevronDown size={13} /></label>
      {!gradientPaint ? <ColorRow label="Color" value={element.fill} onChange={(fill, live) => update({ fill, fillPaint: { type: 'solid', color: fill } }, live)} /> : <><ColorRow label="Start" value={gradientPaint.stops[0].color} onChange={(color, live) => update({ fillPaint: { ...gradientPaint, stops: gradientPaint.stops.map((stop, index) => index ? stop : { ...stop, color }) } }, live)} /><ColorRow label="End" value={gradientPaint.stops.at(-1)!.color} onChange={(color, live) => update({ fillPaint: { ...gradientPaint, stops: gradientPaint.stops.map((stop, index) => index === gradientPaint.stops.length - 1 ? { ...stop, color } : stop) } }, live)} />{gradientPaint.type === 'linear-gradient' && <RangeRow label="Angle" value={gradientPaint.angle} min={0} max={360} onChange={(angle, live) => editor.updateElement(element.id, { fillPaint: { ...gradientPaint, angle } }, live)} />}</>}
    </PropertySection>
    <StrokeProperties element={element} update={update} />
    {(element.type === 'rectangle' || element.type === 'frame') && <PropertySection title="Corners"><RangeRow label="Radius" value={element.cornerRadius} min={0} max={Math.round(Math.min(element.width, element.height) / 2)} onChange={(cornerRadius, live) => editor.updateElement(element.id, { cornerRadius, cornerRadii: [cornerRadius, cornerRadius, cornerRadius, cornerRadius] }, live)} /></PropertySection>}
    {(element.type === 'polygon' || element.type === 'star') && <PropertySection title="Geometry"><RangeRow label="Points" value={element.points ?? 5} min={3} max={16} step={1} onChange={(points, live) => editor.updateElement(element.id, { points }, live)} />{element.type === 'star' && <RangeRow label="Inner radius" value={Math.round((element.innerRadius ?? .48) * 100)} min={10} max={90} onChange={(value, live) => editor.updateElement(element.id, { innerRadius: value / 100 }, live)} />}<RangeRow label="Imperfection" value={element.imperfection ?? 0} min={0} max={100} onChange={(imperfection, live) => editor.updateElement(element.id, { imperfection }, live)} /></PropertySection>}
  </>
}

function StrokeProperties({ element, update }: PropertyGroupProps) { return <PropertySection title="Stroke"><ColorRow label="Color" value={toColorValue(element.stroke)} onChange={(stroke, live) => update({ stroke, strokeWidth: element.strokeWidth || 1 }, live)} /><RangeRow label="Width" value={element.strokeWidth} min={0} max={40} step={.5} onChange={(strokeWidth, live) => update({ strokeWidth }, live)} /><RangeRow label="Opacity" value={Math.round((element.strokeOpacity ?? 1) * 100)} min={0} max={100} onChange={(value, live) => update({ strokeOpacity: value / 100 }, live)} /><div className="property-grid"><label className="select-control compact"><span>Cap</span><select value={element.strokeCap} onChange={(event) => update({ strokeCap: event.target.value as EdonElement['strokeCap'] })}><option value="round">Round</option><option value="butt">Butt</option><option value="square">Square</option></select></label><label className="select-control compact"><span>Join</span><select value={element.strokeJoin} onChange={(event) => update({ strokeJoin: event.target.value as EdonElement['strokeJoin'] })}><option value="round">Round</option><option value="miter">Miter</option><option value="bevel">Bevel</option></select></label></div></PropertySection> }

function ImageProperties({ element, update }: PropertyGroupProps) {
  const editor = useEditor(); const adjustments = element.adjustments ?? DEFAULT_ADJUSTMENTS; const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 }
  const setAdjustment = (key: keyof ImageAdjustments, value: number, live: boolean) => editor.updateElement(element.id, { adjustments: { ...adjustments, [key]: value } }, live)
  return <>
    <PropertySection title="Crop & mask">
      <RangeRow label="Crop X" value={Math.round(crop.x * 100)} min={0} max={Math.round((1 - crop.width) * 100)} onChange={(value, live) => editor.updateElement(element.id, { crop: { ...crop, x: value / 100 } }, live)} />
      <RangeRow label="Crop Y" value={Math.round(crop.y * 100)} min={0} max={Math.round((1 - crop.height) * 100)} onChange={(value, live) => editor.updateElement(element.id, { crop: { ...crop, y: value / 100 } }, live)} />
      <label className="select-control"><span>Shape mask</span><select value={element.mask?.shape ?? 'none'} onChange={(event) => update({ mask: event.target.value === 'none' ? undefined : { id: createId('mask'), type: 'shape', shape: event.target.value as NonNullable<EdonElement['mask']>['shape'], cornerRadius: 24, sides: 6, inset: 0, inverted: false } })}><option value="none">None</option><option value="ellipse">Ellipse</option><option value="rounded-rectangle">Rounded rectangle</option><option value="polygon">Polygon</option><option value="star">Star</option></select><ChevronDown size={13} /></label>
    </PropertySection>
    <PropertySection title="Adjustments" open>
      <button className="auto-enhance" onClick={() => update({ adjustments: { ...DEFAULT_ADJUSTMENTS, brightness: 4, contrast: 12, saturation: 8, vibrance: 14, highlights: -8, shadows: 10 } })}><Sparkles size={13} /> Auto enhance</button>
      {(['brightness', 'contrast', 'exposure', 'saturation', 'vibrance', 'temperature', 'tint', 'highlights', 'shadows', 'hue'] as const).map((key) => <RangeRow key={key} label={formatLabel(key)} value={adjustments[key]} min={key === 'hue' ? -180 : -100} max={key === 'hue' ? 180 : 100} onChange={(value, live) => setAdjustment(key, value, live)} />)}
      <button className="property-text-button" onClick={() => update({ adjustments: { ...DEFAULT_ADJUSTMENTS } })}>Reset adjustments</button>
    </PropertySection>
  </>
}

function EffectsProperties({ element, update }: PropertyGroupProps) {
  const add = (type: ElementEffect['type']) => {
    const effect: ElementEffect = type === 'outline' ? { id: createId('effect'), type, enabled: true, color: '#ffffff', opacity: 1, width: 4 } : type === 'drop-shadow' ? { id: createId('effect'), type, enabled: true, color: '#000000', opacity: .35, offsetX: 0, offsetY: 8, blur: 18 } : type === 'glow' ? { id: createId('effect'), type, enabled: true, color: '#7c70ff', opacity: .7, blur: 18 } : type === 'stylized-shadow' ? { id: createId('effect'), type, enabled: true, color: '#241d2a', opacity: .82, angle: 45, distance: 12 } : { id: createId('effect'), type, enabled: true, radius: 6 }
    update({ effects: [...element.effects, effect] })
  }
  return <PropertySection title="Effects">
    {element.effects.map((effect) => <EffectEditor key={effect.id} element={element} effect={effect} update={update} />)}
    <label className="select-control add-effect"><span>Add effect</span><select value="" onChange={(event) => { if (event.target.value) add(event.target.value as ElementEffect['type']); event.target.value = '' }}><option value="">Choose…</option><option value="stylized-shadow">Hard stylized shadow</option><option value="drop-shadow">Drop shadow</option><option value="outline">Outline</option><option value="glow">Glow</option><option value="gaussian-blur">Gaussian blur</option></select><ChevronDown size={13} /></label>
  </PropertySection>
}

function EffectEditor({ element, effect, update }: { element: EdonElement; effect: ElementEffect; update: PropertyGroupProps['update'] }) {
  const editor = useEditor(); const patchEffect = (patch: Partial<ElementEffect>, live = false) => editor.updateElement(element.id, { effects: element.effects.map((item) => item.id === effect.id ? { ...item, ...patch } as ElementEffect : item) }, live)
  return <div className="effect-card">
    <div><button className={`effect-toggle ${effect.enabled ? 'is-active' : ''}`} onClick={() => patchEffect({ enabled: !effect.enabled })} /><strong>{formatLabel(effect.type)}</strong><button onClick={() => update({ effects: element.effects.filter((item) => item.id !== effect.id) })}><X size={12} /></button></div>
    {effect.type === 'gaussian-blur' ? <RangeRow label="Radius" value={effect.radius} min={0} max={80} onChange={(radius, live) => patchEffect({ radius }, live)} /> : <>
      {'color' in effect && <ColorRow label="Color" value={effect.color} onChange={(color, live) => patchEffect({ color }, live)} />}
      {effect.type === 'outline' && <RangeRow label="Width" value={effect.width} min={0} max={30} onChange={(width, live) => patchEffect({ width }, live)} />}
      {effect.type === 'glow' && <RangeRow label="Blur" value={effect.blur} min={0} max={80} onChange={(blur, live) => patchEffect({ blur }, live)} />}
      {effect.type === 'drop-shadow' && <><RangeRow label="Blur" value={effect.blur} min={0} max={80} onChange={(blur, live) => patchEffect({ blur }, live)} /><div className="property-grid"><NumberField label="X" value={effect.offsetX} onChange={(offsetX) => patchEffect({ offsetX })} /><NumberField label="Y" value={effect.offsetY} onChange={(offsetY) => patchEffect({ offsetY })} /></div></>}
      {effect.type === 'stylized-shadow' && <><RangeRow label="Direction" value={effect.angle} min={0} max={360} onChange={(angle, live) => patchEffect({ angle }, live)} /><RangeRow label="Distance" value={effect.distance} min={0} max={80} onChange={(distance, live) => patchEffect({ distance }, live)} /></>}
    </>}
  </div>
}

function DocumentProperties() { const { page } = useEditor(); return <div className="properties-content document-properties"><section className="property-section"><div className="property-section-heading"><span>Canvas</span></div><div className="document-thumbnail" style={{ aspectRatio: `${page.width} / ${page.height}` }} /><dl><div><dt>Dimensions</dt><dd>{page.width} × {page.height}</dd></div><div><dt>Background</dt><dd><i style={{ background: page.background }} /> {page.background.toUpperCase()}</dd></div><div><dt>Layers</dt><dd>{page.elements.length}</dd></div></dl></section><div className="selection-hint"><span>Nothing selected</span><p>Select a layer or drag a marquee to edit one or many objects.</p><kbd>V</kbd></div></div> }

function PropertySection({ title, open = false, children }: { title: string; open?: boolean; children: React.ReactNode }) { return <details className="property-section collapsible-section" open={open}><summary><span>{title}</span><ChevronDown size={12} /></summary><div className="property-section-body">{children}</div></details> }
function Action({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button className="property-action" aria-label={label} data-tooltip={label} onClick={onClick}>{children}</button> }
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string, live?: boolean) => void }) { return <div className="color-control"><span>{label}</span><ColorControl value={value} label={label} onChange={onChange} /></div> }
function RangeRow({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number, live: boolean) => void }) { const editor = useEditor(); return <label className="range-row"><span>{label}</span><input type="range" min={min} max={Math.max(min, max)} step={step} value={Math.min(Math.max(value, min), Math.max(min, max))} onPointerDown={() => editor.beginTransaction(`Adjust ${label}`)} onChange={(event) => onChange(Number(event.target.value), true)} onPointerUp={editor.endTransaction} /><output>{Number(value.toFixed(1))}</output></label> }
interface PropertyGroupProps { element: EdonElement; update: (patch: Partial<EdonElement>, live?: boolean) => void }
const toColorValue = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
const formatLabel = (value: string) => value.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase())
