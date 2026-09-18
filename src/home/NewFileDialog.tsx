import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Monitor, RectangleHorizontal, RectangleVertical, X } from 'lucide-react'
import { DOCUMENT_PRESETS, type EdonDocument } from '../model/document'
import { createDocument } from '../model/document'
import { IconButton } from '../ui/IconButton'

interface NewFileDialogProps {
  onClose: () => void
  onCreate: (document: EdonDocument) => void
}

export function NewFileDialog({ onClose, onCreate }: NewFileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('Untitled')
  const [width, setWidth] = useState(1920)
  const [height, setHeight] = useState(1080)
  const [presetId, setPresetId] = useState('desktop-hd')

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const setPreset = (id: string) => {
    const preset = DOCUMENT_PRESETS.find((item) => item.id === id)
    if (!preset) return
    setPresetId(id)
    setWidth(preset.width)
    setHeight(preset.height)
  }

  const setDimension = (dimension: 'width' | 'height', value: string) => {
    const parsed = Math.min(8192, Math.max(16, Number(value) || 16))
    if (dimension === 'width') setWidth(parsed)
    else setHeight(parsed)
    setPresetId('custom')
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onCreate(createDocument(name, width, height))
  }

  return (
    <dialog ref={dialogRef} className="new-file-dialog" onCancel={onClose} onClose={onClose}>
      <form onSubmit={submit}>
        <header className="dialog-header">
          <div>
            <p className="eyebrow">New document</p>
            <h2>Choose a canvas</h2>
          </div>
          <IconButton label="Close dialog" onClick={onClose}><X size={16} /></IconButton>
        </header>

        <div className="dialog-body">
          <section className="preset-section" aria-label="Canvas presets">
            <div className="section-label">Presets</div>
            <div className="preset-grid">
              {DOCUMENT_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.id}
                  className={`preset-option ${presetId === preset.id ? 'is-selected' : ''}`}
                  onClick={() => setPreset(preset.id)}
                >
                  <span className="preset-icon">
                    {preset.width === preset.height ? <Monitor size={18} /> : preset.width > preset.height ? <RectangleHorizontal size={18} /> : <RectangleVertical size={18} />}
                  </span>
                  <span className="preset-copy">
                    <strong>{preset.label}</strong>
                    <small>{preset.width} × {preset.height} px</small>
                    <small>{preset.detail}</small>
                  </span>
                  {presetId === preset.id && <Check className="preset-check" size={14} />}
                </button>
              ))}
            </div>
          </section>

          <aside className="custom-size-panel">
            <div className="section-label">Document details</div>
            <label className="field-stack">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            </label>
            <div className="dimension-fields">
              <label className="field-stack">
                <span>Width</span>
                <div className="unit-input"><input type="number" value={width} min={16} max={8192} onChange={(event) => setDimension('width', event.target.value)} /><em>px</em></div>
              </label>
              <label className="field-stack">
                <span>Height</span>
                <div className="unit-input"><input type="number" value={height} min={16} max={8192} onChange={(event) => setDimension('height', event.target.value)} /><em>px</em></div>
              </label>
            </div>
            <div className="orientation-control" aria-label="Orientation">
              <button type="button" className={width >= height ? 'is-active' : ''} onClick={() => width < height && [setWidth(height), setHeight(width)]}><RectangleHorizontal size={15} /> Landscape</button>
              <button type="button" className={height > width ? 'is-active' : ''} onClick={() => height < width && [setWidth(height), setHeight(width)]}><RectangleVertical size={15} /> Portrait</button>
            </div>
            <div className="canvas-summary">
              <div className="summary-sheet" style={{ aspectRatio: `${width} / ${height}` }} />
              <div><strong>{width} × {height}</strong><span>RGB · 72 PPI</span></div>
            </div>
          </aside>
        </div>

        <footer className="dialog-footer">
          <span>Canvas settings can be changed later.</span>
          <div className="dialog-actions">
            <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button-primary">Create file <ArrowRight size={15} /></button>
          </div>
        </footer>
      </form>
    </dialog>
  )
}
