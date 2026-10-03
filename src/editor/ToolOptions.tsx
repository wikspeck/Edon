import { TextToolbar } from './TextToolbar'
import { ColorControl } from './ColorPicker'
import { TOOL_LABELS, useEditor } from './editor-state'
import { TOOL_SHORTCUTS } from './shortcuts'

export function ToolOptions() {
  const editor = useEditor(); const settings = editor.artSettings
  const setColor = (color: string, live = false) => {
    editor.setArtSettings({ color })
    if (editor.selectedElement && ['text', 'rectangle', 'ellipse', 'polygon', 'star', 'path'].includes(editor.selectedElement.type)) editor.updateSelected({ fill: color, fillPaint: { type: 'solid', color } }, live)
    if (!live) editor.rememberColor(color)
  }
  const range = (label: string, key: 'size' | 'opacity' | 'hardness' | 'smoothing' | 'stabilization' | 'fillTolerance', min: number, max: number) => <label className="tool-option-range"><span>{label}</span><input type="range" min={min} max={max} value={key === 'opacity' ? settings[key] * 100 : settings[key]} onChange={(event) => editor.setArtSettings({ [key]: key === 'opacity' ? Number(event.target.value) / 100 : Number(event.target.value) })} /><output>{Math.round((key === 'opacity' ? settings[key] * 100 : settings[key]))}</output></label>
  const antiAlias = <label className="tool-option-toggle"><span>Anti-aliasing</span><button aria-pressed={settings.antiAlias} className={settings.antiAlias ? 'is-active' : ''} onClick={() => editor.setArtSettings({ antiAlias: !settings.antiAlias })}>{settings.antiAlias ? 'On' : 'Off'}</button></label>
  if (editor.selectedElement?.type === 'text' && (editor.tool === 'select' || editor.tool === 'text')) return <div className="tool-options"><TextToolbar key={`${editor.selectedElement.id}-${editor.selectedElement.fontFamily}-${editor.selectedElement.fontSize}`} element={editor.selectedElement} /></div>
  return <div className="tool-options" aria-label={`${TOOL_LABELS[editor.tool]} options`}>
    <div className="active-tool-name"><strong>{TOOL_LABELS[editor.tool]}</strong>{TOOL_SHORTCUTS[editor.tool] && <kbd>{TOOL_SHORTCUTS[editor.tool]}</kbd>}</div>
    {['pencil', 'brush', 'fill', 'pen', 'rectangle', 'ellipse', 'polygon', 'star', 'line', 'arrow'].includes(editor.tool) && <ColorControl value={settings.color} onChange={setColor} />}
    {editor.tool === 'pencil' && <><span className="mode-badge">{editor.drawingMode}</span>{range('Size', 'size', 1, 48)}{range('Smooth', 'smoothing', 0, 100)}{range('Stabilize', 'stabilization', 0, 100)}</>}
    {editor.tool === 'brush' && <><span className="mode-badge raster">Raster</span>{range('Size', 'size', 1, 96)}{range('Hardness', 'hardness', 0, 100)}{range('Opacity', 'opacity', 1, 100)}{antiAlias}</>}
    {editor.tool === 'eraser' && <><span className="mode-badge raster">Raster</span>{range('Size', 'size', 1, 96)}{antiAlias}</>}
    {editor.tool === 'fill' && <><span className="mode-badge raster">Pixel fill</span>{range('Tolerance', 'fillTolerance', 0, 80)}<label className="tool-option-toggle"><span>Contiguous</span><button aria-pressed={settings.contiguous} className={settings.contiguous ? 'is-active' : ''} onClick={() => editor.setArtSettings({ contiguous: !settings.contiguous })}>{settings.contiguous ? 'On' : 'Off'}</button></label>{antiAlias}</>}
    {editor.tool === 'pen' && <><span className="mode-badge">{editor.drawingMode}</span>{range('Stroke', 'size', 1, 40)}<span className="tool-hint">Enter finishes · click first node to close</span></>}
    {editor.tool === 'eyedropper' && <span className="tool-hint">Click anywhere on the artwork to sample the rendered pixel</span>}
    {editor.tool === 'select' && <span className="tool-hint">Shift selects multiple · Alt drag duplicates</span>}
  </div>
}
