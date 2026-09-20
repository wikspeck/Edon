import { useState } from 'react'
import { Brush, CopyPlus, Eye, FlipHorizontal2, FlipVertical2, Palette, Pipette, Plus, Shapes, Sparkles, Trash2, X } from 'lucide-react'
import { createId, type ElementEffect } from '../model/document'
import { useEditor } from './editor-state'
import { nodesToPath, pointsToNodes, simplifyPoints } from './vector-path'
import { PixelPreview } from './PixelPreview'

export function ArtKitPanel() {
  const editor = useEditor()
  const [newColor, setNewColor] = useState('#6D5EDB')
  const [replaceWith, setReplaceWith] = useState('#FFFFFF')
  const [pixelPreview, setPixelPreview] = useState(false)
  if (!editor.artMode) return null
  const selected = editor.selectedElement
  const stylizedShadow = selected?.effects.find((effect) => effect.type === 'stylized-shadow')
  const simplifySelected = () => {
    if (!selected?.sourcePoints?.length) return
    const points = simplifyPoints(selected.sourcePoints, .3 + editor.artSettings.simplify * .08)
    const nodes = pointsToNodes(points, editor.artSettings.smoothing)
    editor.updateElement(selected.id, { vectorNodes: nodes, pathData: nodesToPath(nodes, selected.closed) })
  }
  const setNodeKind = (kind: 'corner' | 'smooth') => {
    if (!selected?.vectorNodes?.length) return
    const points = selected.vectorNodes.map(({ x, y }) => ({ x, y }))
    const nodes = kind === 'smooth' ? pointsToNodes(points, 70) : pointsToNodes(points, 0)
    editor.updateElement(selected.id, { vectorNodes: nodes, pathData: nodesToPath(nodes, selected.closed) })
  }
  const addShadow = () => {
    if (!selected) return
    const effect: ElementEffect = { id: createId('effect'), type: 'stylized-shadow', enabled: true, color: smartShade(selected.fill, -.42), opacity: .82, angle: 45, distance: 12 }
    editor.updateElement(selected.id, { effects: [...selected.effects, effect] })
  }
  return <aside className="art-kit-panel" aria-label="Stylized Art Kit">
    <header><div><Sparkles size={14} /><span>Stylized Art</span></div><button aria-label="Close Stylized Art Kit" onClick={editor.toggleArtMode}><X size={14} /></button></header>
    <section>
      <h3><Brush size={13} /> Drawing</h3>
      <div className="art-tool-row"><button className={editor.tool === 'pencil' ? 'is-active' : ''} onClick={() => editor.setTool('pencil')}>Pencil <kbd>N</kbd></button><button className={editor.tool === 'pen' ? 'is-active' : ''} onClick={() => editor.setTool('pen')}>Pen <kbd>P</kbd></button><button className={editor.tool === 'eyedropper' ? 'is-active' : ''} onClick={() => editor.setTool('eyedropper')}><Pipette size={13} /> Pick</button><button className={editor.tool === 'fill' ? 'is-active' : ''} onClick={() => editor.setTool('fill')}>Fill</button></div>
      <label className="art-select"><span>Brush</span><select value={editor.artSettings.brushPreset} onChange={(event) => editor.setArtSettings({ brushPreset: event.target.value as typeof editor.artSettings.brushPreset })}>{['clean', 'hard', 'soft', 'inking', 'marker', 'flat'].map((preset) => <option key={preset}>{preset}</option>)}</select></label>
      <ArtRange label="Size" value={editor.artSettings.size} min={1} max={48} onChange={(size) => editor.setArtSettings({ size })} />
      <ArtRange label="Smooth" value={editor.artSettings.smoothing} min={0} max={100} onChange={(smoothing) => editor.setArtSettings({ smoothing })} />
      <ArtRange label="Stabilize" value={editor.artSettings.stabilization} min={0} max={100} onChange={(stabilization) => editor.setArtSettings({ stabilization })} />
      <ArtRange label="Simplify" value={editor.artSettings.simplify} min={0} max={100} onChange={(simplify) => editor.setArtSettings({ simplify })} />
      {selected?.type === 'path' && <div className="art-action-grid vector-actions"><button disabled={!selected.sourcePoints?.length} onClick={simplifySelected}>Simplify path</button><button onClick={() => editor.setVectorEdit(editor.vectorEditId ? null : selected.id)}>{editor.vectorEditId ? 'Finish nodes' : 'Edit nodes'}</button><button onClick={() => setNodeKind('corner')}>Corner nodes</button><button onClick={() => setNodeKind('smooth')}>Smooth nodes</button></div>}
    </section>
    <section>
      <h3><Palette size={13} /> Document palette</h3>
      <div className="active-color"><input aria-label="Active drawing color" type="color" value={editor.artSettings.color} onChange={(event) => editor.rememberColor(event.target.value)} /><label><span>HEX</span><input value={editor.artSettings.color.toUpperCase()} onChange={(event) => /^#[0-9a-f]{6}$/i.test(event.target.value) && editor.rememberColor(event.target.value)} /></label><code>{colorDetails(editor.artSettings.color)}</code></div>
      <div className="palette-grid">{editor.document.palette.map((item) => <button key={item.id} className="palette-swatch" title={`${item.name} · ${item.color}`} style={{ '--swatch': item.color } as React.CSSProperties} onClick={() => editor.rememberColor(item.color)} onDoubleClick={() => editor.removePaletteColor(item.id)}><i /><span>{item.name}</span></button>)}</div>
      <div className="palette-add"><input aria-label="New palette color" type="color" value={newColor} onChange={(event) => setNewColor(event.target.value)} /><button onClick={() => editor.addPaletteColor(`Color ${editor.document.palette.length + 1}`, newColor)}><Plus size={13} /> Add</button></div>
      {editor.recentColors.length > 0 && <div className="recent-colors"><span>Recent</span>{editor.recentColors.map((color) => <button key={color} aria-label={`Use ${color}`} style={{ background: color }} onClick={() => editor.rememberColor(color)} />)}</div>}
    </section>
    <section>
      <h3><Shapes size={13} /> Stylize selection</h3>
      <div className="art-action-grid"><button disabled={!selected} onClick={addShadow}>{stylizedShadow ? 'Add another shadow' : 'Hard shadow'}</button><button disabled={!selected} onClick={editor.createShadowShape}>Create shadow shape</button><button disabled={!selected} onClick={() => editor.flip('horizontal')}><FlipHorizontal2 size={13} /> Flip H</button><button disabled={!selected} onClick={() => editor.flip('vertical')}><FlipVertical2 size={13} /> Flip V</button><button disabled={!selected} onClick={() => editor.flip('horizontal', true)}><CopyPlus size={13} /> Mirror copy</button><button disabled={!selected} onClick={() => editor.selectSame('fill')}>Select same fill</button></div>
      {selected && <div className="replace-color"><span>Replace {selected.fill.toUpperCase()}</span><input type="color" value={replaceWith} onChange={(event) => setReplaceWith(event.target.value)} /><button onClick={() => editor.replaceColor(selected.fill, replaceWith)}>Replace</button></div>}
      <label className="art-toggle"><span><Eye size={13} /> Silhouette preview</span><input type="checkbox" checked={editor.silhouettePreview} onChange={(event) => editor.setSilhouettePreview(event.target.checked)} /></label>
      <button className="pixel-preview-button" onClick={() => setPixelPreview(true)}>Open pixel preview</button>
      {selected && <label className="art-toggle"><span>Reference layer</span><input type="checkbox" checked={selected.reference ?? false} onChange={(event) => editor.updateElement(selected.id, { reference: event.target.checked, includeInExport: !event.target.checked })} /></label>}
    </section>
    <footer><span>Tip: double-click a drawn path to edit nodes.</span><button title="Remove selected" disabled={!selected} onClick={editor.removeSelected}><Trash2 size={13} /></button></footer>
    {pixelPreview && <PixelPreview onClose={() => setPixelPreview(false)} />}
  </aside>
}

function ArtRange({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="art-range"><span>{label}</span><input type="range" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /><output>{value}</output></label>
}

function smartShade(color: string, delta: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return delta < 0 ? '#241D2A' : '#FFFFFF'
  const value = Number.parseInt(match[1], 16)
  return `#${[value >> 16, (value >> 8) & 255, value & 255].map((channel) => Math.round(channel + (delta < 0 ? channel : 255 - channel) * Math.abs(delta)).toString(16).padStart(2, '0')).join('')}`
}

function colorDetails(color: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return 'RGB — · HSL —'
  const value = Number.parseInt(match[1], 16); const red = value >> 16; const green = (value >> 8) & 255; const blue = value & 255
  const r = red / 255; const g = green / 255; const b = blue / 255; const max = Math.max(r, g, b); const min = Math.min(r, g, b); const light = (max + min) / 2; const delta = max - min
  let hue = 0
  if (delta) hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  hue = Math.round(hue * 60 + (hue < 0 ? 360 : 0)); const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0
  return `RGB ${red} ${green} ${blue} · HSL ${hue} ${Math.round(saturation * 100)} ${Math.round(light * 100)}`
}
