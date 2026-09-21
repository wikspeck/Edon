import { FloatingWindow } from '../ui/FloatingWindow'
import { useEditor } from './editor-state'

export function PaletteWindow({ onClose }: { onClose: () => void }) {
  const editor = useEditor()
  const choose = (color: string) => { editor.setArtSettings({ color }); editor.rememberColor(color) }
  return <FloatingWindow id="palette" title="Document colors" subtitle={`${editor.document.palette.length} swatches`} initialPosition={{ x: Math.max(8, innerWidth - 700), y: 90 }} onClose={onClose}>
    <div className="floating-palette-grid">{editor.document.palette.map((swatch) => <button key={swatch.id} onClick={() => choose(swatch.color)} title={`${swatch.name} · ${swatch.color}`}><i style={{ background: swatch.color }} /><span>{swatch.name}</span><code>{swatch.color}</code></button>)}</div>
  </FloatingWindow>
}
