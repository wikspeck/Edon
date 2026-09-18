import { ArrowLeft, Check, ChevronDown, Cloud, Download, PanelLeftClose, PanelRightClose, Redo2, Undo2 } from 'lucide-react'
import { BrandMark } from '../ui/BrandMark'
import { IconButton } from '../ui/IconButton'
import { useEditor } from './editor-state'

export function TopBar({ onBack }: { onBack: () => void }) {
  const { document, past, future, zoom, setZoom, undo, redo, renameDocument, togglePanel, leftPanelOpen, rightPanelOpen } = useEditor()

  return (
    <header className="editor-topbar">
      <div className="topbar-left">
        <IconButton label="Back to files" onClick={onBack}><ArrowLeft size={15} /></IconButton>
        <div className="editor-brand"><BrandMark size={20} /><span>edon</span></div>
        <div className="topbar-menus">
          <details><summary>File</summary><div className="app-menu"><button onClick={onBack}>Back to files <kbd>⌘⇧O</kbd></button><button onClick={() => window.print()}>Print canvas <kbd>⌘P</kbd></button><span className="menu-separator" /><button onClick={() => downloadDocument(document)}>Export document <kbd>⌘⇧E</kbd></button></div></details>
          <details><summary>Edit</summary><div className="app-menu"><button onClick={undo} disabled={!past.length}>Undo <kbd>⌘Z</kbd></button><button onClick={redo} disabled={!future.length}>Redo <kbd>⌘⇧Z</kbd></button></div></details>
          <details><summary>View</summary><div className="app-menu"><button onClick={() => togglePanel('left')}>{leftPanelOpen ? 'Hide' : 'Show'} layers</button><button onClick={() => togglePanel('right')}>{rightPanelOpen ? 'Hide' : 'Show'} properties</button><span className="menu-separator" /><button onClick={() => setZoom(1)}>Actual size <kbd>1</kbd></button><button onClick={() => setZoom(0.5)}>Fit canvas <kbd>2</kbd></button></div></details>
        </div>
      </div>

      <div className="topbar-document">
        <input aria-label="Document name" defaultValue={document.name} key={document.id} onBlur={(event) => event.target.value.trim() && event.target.value !== document.name && renameDocument(event.target.value.trim())} />
        <span className="save-indicator"><Check size={11} /> Saved locally</span>
      </div>

      <div className="topbar-actions">
        <IconButton label="Toggle layers panel" active={leftPanelOpen} onClick={() => togglePanel('left')}><PanelLeftClose size={15} /></IconButton>
        <span className="toolbar-separator" />
        <IconButton label="Undo" shortcut="⌘Z" onClick={undo} disabled={!past.length}><Undo2 size={15} /></IconButton>
        <IconButton label="Redo" shortcut="⌘⇧Z" onClick={redo} disabled={!future.length}><Redo2 size={15} /></IconButton>
        <div className="zoom-control">
          <button onClick={() => setZoom(zoom - 0.1)}>−</button>
          <button className="zoom-value" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom(zoom + 0.1)}>+</button>
        </div>
        <span className="toolbar-separator" />
        <button className="export-button" onClick={() => downloadDocument(document)}><Download size={14} /> Export <ChevronDown size={12} /></button>
        <IconButton label="Toggle properties panel" active={rightPanelOpen} onClick={() => togglePanel('right')}><PanelRightClose size={15} /></IconButton>
      </div>
      <div className="offline-badge"><Cloud size={13} /> Local</div>
    </header>
  )
}

function downloadDocument(document: ReturnType<typeof useEditor>['document']) {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `${document.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'edon-file'}.edon.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
