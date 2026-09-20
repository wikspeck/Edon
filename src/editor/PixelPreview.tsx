import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { serializeArtwork } from './artwork-export'
import { useEditor } from './editor-state'

export function PixelPreview({ onClose }: { onClose: () => void }) {
  const editor = useEditor()
  const [zoom, setZoom] = useState(1)
  const url = useMemo(() => {
    const elements = editor.page.elements.filter((element) => element.visible && element.includeInExport !== false)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeArtwork(editor.page, elements))}`
  }, [editor.page])
  return <section className="pixel-preview" aria-label="Pixel preview"><header><div><strong>Pixel preview</strong><span>{Math.round(zoom * 100)}%</span></div><button aria-label="Close pixel preview" onClick={onClose}><X size={14} /></button></header><div className="pixel-preview-stage">{url && <img src={url} alt="Live raster preview" style={{ width: editor.page.width * zoom, height: editor.page.height * zoom }} />}</div><footer><input aria-label="Pixel preview zoom" type="range" min="0.1" max="2" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>Nearest-pixel preview</span></footer></section>
}
