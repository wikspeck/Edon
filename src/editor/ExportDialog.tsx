import { CustomSelect } from '../ui/CustomSelect'
import { useState } from 'react'
import { Download, X } from 'lucide-react'
import { exportArtwork, type ArtworkFormat } from './artwork-export'
import { useEditor } from './editor-state'

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const editor = useEditor()
  const [format, setFormat] = useState<ArtworkFormat>('png')
  const [scale, setScale] = useState<1 | 2 | 4>(2)
  const [transparent, setTransparent] = useState(true)
  const [scope, setScope] = useState<'canvas' | 'selection'>('canvas')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => { setBusy(true); setError(null); try { await exportArtwork(editor.document, { format, scale, transparent, selectionIds: scope === 'selection' ? editor.selectionIds : undefined }); onClose() } catch { setError('Export failed. Try another format or a smaller scale.') } finally { setBusy(false) } }
  return <div className="dialog-backdrop" onPointerDown={(event) => event.target === event.currentTarget && onClose()}><section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title"><header><div><span>Export</span><strong id="export-title">Artwork output</strong></div><button aria-label="Close export" onClick={onClose}><X size={15} /></button></header><div className="export-options"><label><span>Format</span><CustomSelect value={format} onChange={(event) => setFormat(event.target.value as ArtworkFormat)}><option value="png">PNG</option><option value="svg">SVG</option><option value="jpeg">JPEG</option><option value="webp">WebP</option></CustomSelect></label><label><span>Area</span><CustomSelect value={scope} onChange={(event) => setScope(event.target.value as 'canvas' | 'selection')}><option value="canvas">Entire canvas</option><option value="selection" disabled={!editor.selectionIds.length}>Selection</option></CustomSelect></label><label><span>Scale</span><div className="export-segment">{([1, 2, 4] as const).map((value) => <button key={value} className={scale === value ? 'is-active' : ''} onClick={() => setScale(value)}>{value}×</button>)}</div></label><label className="art-toggle"><span>Transparent background</span><input type="checkbox" checked={transparent} disabled={format === 'jpeg'} onChange={(event) => setTransparent(event.target.checked)} /></label></div>{error && <p role="alert" className="export-error">{error}</p>}<footer><span>{editor.page.width * scale} × {editor.page.height * scale}px</span><button className="export-confirm" disabled={busy} onClick={() => void run()}><Download size={14} /> {busy ? 'Preparing…' : `Export ${format.toUpperCase()}`}</button></footer></section></div>
}
