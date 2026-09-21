import { useMemo, useState } from 'react'
import { serializeArtwork } from './artwork-export'
import { useEditor } from './editor-state'
import { FloatingWindow } from '../ui/FloatingWindow'

export function PixelPreview({ onClose }: { onClose: () => void }) {
  const editor = useEditor()
  const [zoom, setZoom] = useState(1)
  const url = useMemo(() => {
    const elements = editor.page.elements.filter((element) => element.visible && element.includeInExport !== false)
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeArtwork(editor.page, elements))}`
  }, [editor.page])
  return <FloatingWindow id="pixel-preview" title="Pixel preview" subtitle={`${Math.round(zoom * 100)}%`} initialPosition={{ x: Math.max(8, innerWidth - 372), y: Math.max(8, innerHeight - 332) }} onClose={onClose} footer={<><input aria-label="Pixel preview zoom" type="range" min="0.1" max="2" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>Nearest-pixel preview</span></>}><div className="pixel-preview-stage">{url && <img src={url} alt="Live raster preview" style={{ width: editor.page.width * zoom, height: editor.page.height * zoom }} />}</div></FloatingWindow>
}
