import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Pipette, X } from 'lucide-react'
import { hsvaToRgba, normalizeHex, parseColor, rgbaToHex, rgbaToHsva, type Hsva } from './color-model'
import { useEditor } from './editor-state'

export function ColorControl({ value, label = 'Color', onChange }: { value: string; label?: string; onChange: (value: string, live?: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [previous, setPrevious] = useState(value)
  return <div className="edon-color-control"><button aria-label={`${label}: ${value}`} className="edon-color-button" onClick={() => { setPrevious(value); setOpen((current) => !current) }}><i className="checkerboard"><span style={{ background: value }} /></i><code>{value.toUpperCase()}</code></button>{open && <ColorPicker value={value} previous={previous} onChange={onChange} onClose={() => setOpen(false)} />}</div>
}

function ColorPicker({ value, previous, onChange, onClose }: { value: string; previous: string; onChange: (value: string, live?: boolean) => void; onClose: () => void }) {
  const editor = useEditor(); const [model, setModel] = useState<'HSV' | 'RGB'>('HSV'); const [hsva, setHsva] = useState(() => rgbaToHsva(parseColor(value))); const [hex, setHex] = useState(value)
  const dragging = useRef(false)
  const apply = (next: Hsva, live = true) => { setHsva(next); const color = rgbaToHex(hsvaToRgba(next), next.a < .999); setHex(color); onChange(color, live) }
  const begin = () => { dragging.current = true; editor.beginTransaction('Change color') }
  const end = () => { if (!dragging.current) return; dragging.current = false; editor.endTransaction(); editor.rememberColor(rgbaToHex(hsvaToRgba(hsva), hsva.a < .999)) }
  const field = (event: ReactPointerEvent<HTMLDivElement>) => { const rect = event.currentTarget.getBoundingClientRect(); apply({ ...hsva, s: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), v: Math.max(0, Math.min(100, 100 - (event.clientY - rect.top) / rect.height * 100)) }) }
  const rgba = hsvaToRgba(hsva)
  const numeric = model === 'HSV' ? [{ key: 'h', label: 'H', value: Math.round(hsva.h), max: 360 }, { key: 's', label: 'S', value: Math.round(hsva.s), max: 100 }, { key: 'v', label: 'V', value: Math.round(hsva.v), max: 100 }] : [{ key: 'r', label: 'R', value: Math.round(rgba.r), max: 255 }, { key: 'g', label: 'G', value: Math.round(rgba.g), max: 255 }, { key: 'b', label: 'B', value: Math.round(rgba.b), max: 255 }]
  return <section className="edon-color-picker" role="dialog" aria-label="Edon color picker" onPointerUp={end} onPointerCancel={end}>
    <header><span>Color</span><button aria-label="Close color picker" onClick={onClose}><X size={13} /></button></header>
    <div className="color-field" style={{ backgroundColor: `hsl(${hsva.h} 100% 50%)` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); begin(); field(event) }} onPointerMove={(event) => dragging.current && field(event)}><i style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%` }} /></div>
    <label className="color-slider hue"><span>Hue</span><input type="range" min="0" max="360" value={hsva.h} onPointerDown={begin} onChange={(event) => apply({ ...hsva, h: Number(event.target.value) })} /></label>
    <label className="color-slider alpha"><span>Alpha</span><input style={{ '--color': rgbaToHex({ ...rgba, a: 1 }) } as React.CSSProperties} type="range" min="0" max="100" value={Math.round(hsva.a * 100)} onPointerDown={begin} onChange={(event) => apply({ ...hsva, a: Number(event.target.value) / 100 })} /></label>
    <div className="color-mode"><label><span>Mode</span><select value={model} onChange={(event) => setModel(event.target.value as 'HSV' | 'RGB')}><option>HSV</option><option>RGB</option></select></label><button title="Use Eyedropper" onClick={() => { editor.setTool('eyedropper'); onClose() }}><Pipette size={14} /></button></div>
    <div className="color-numbers">{numeric.map((item) => <label key={item.key}><span>{item.label}</span><input type="number" min="0" max={item.max} value={item.value} onChange={(event) => { const number = Number(event.target.value); if (model === 'HSV') apply({ ...hsva, [item.key]: number }); else { const next = { ...rgba, [item.key]: number }; apply(rgbaToHsva(next)) } }} /></label>)}</div>
    <label className="hex-field"><span>HEX</span><input value={hex} onChange={(event) => setHex(event.target.value)} onBlur={() => { const normalized = normalizeHex(hex); setHex(normalized); apply(rgbaToHsva(parseColor(normalized)), false) }} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} /></label>
    <div className="color-comparison"><button title="Previous color" onClick={() => apply(rgbaToHsva(parseColor(previous)), false)}><i style={{ background: previous }} /><span>Previous</span></button><button title="Current color"><i style={{ background: rgbaToHex(rgba, hsva.a < .999) }} /><span>Current</span></button></div>
    {editor.recentColors.length > 0 && <div className="picker-swatches"><span>Recent</span>{editor.recentColors.map((color) => <button key={color} title={color} style={{ background: color }} onClick={() => apply(rgbaToHsva(parseColor(color)), false)} />)}</div>}
    <div className="picker-swatches"><span>Document</span>{editor.document.palette.map((item) => <button key={item.id} title={`${item.name} · ${item.color}`} style={{ background: item.color }} onClick={() => apply(rgbaToHsva(parseColor(item.color)), false)} />)}<button className="save-swatch" title="Save current swatch" onClick={() => editor.addPaletteColor(`Swatch ${editor.document.palette.length + 1}`, rgbaToHex(rgba, hsva.a < .999))}>+</button></div>
  </section>
}
