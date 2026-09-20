import { ArrowLeft, Check, ChevronDown, Download, Group, Palette, PanelLeftClose, PanelRightClose, Redo2, Undo2 } from 'lucide-react'
import type { EdonDocument } from '../model/document'
import { BrandMark } from '../ui/BrandMark'
import { IconButton } from '../ui/IconButton'
import { useEditor } from './editor-state'
import { useState } from 'react'
import { ExportDialog } from './ExportDialog'

export function TopBar({ onBack }: { onBack: () => void }) {
  const editor = useEditor()
  const [exportOpen, setExportOpen] = useState(false)
  return <><header className="editor-topbar">
    <div className="topbar-left">
      <IconButton label="Back to files" onClick={onBack}><ArrowLeft size={15} /></IconButton>
      <div className="editor-brand"><BrandMark size={20} /><span>edon</span></div>
      <div className="topbar-menus">
        <details><summary>File</summary><div className="app-menu"><button onClick={onBack}>Back to files <kbd>Ctrl Shift O</kbd></button><button onClick={() => window.print()}>Print canvas <kbd>Ctrl P</kbd></button><span className="menu-separator" /><button onClick={() => downloadDocument(editor.document)}>Export document <kbd>Ctrl Shift E</kbd></button></div></details>
        <details><summary>Edit</summary><div className="app-menu"><button onClick={editor.undo} disabled={!editor.past.length}>Undo <kbd>Ctrl Z</kbd></button><button onClick={editor.redo} disabled={!editor.future.length}>Redo <kbd>Ctrl Y</kbd></button><span className="menu-separator" /><button onClick={editor.cut} disabled={!editor.selectionIds.length}>Cut <kbd>Ctrl X</kbd></button><button onClick={editor.copy} disabled={!editor.selectionIds.length}>Copy <kbd>Ctrl C</kbd></button><button onClick={editor.paste} disabled={!editor.canPaste}>Paste <kbd>Ctrl V</kbd></button><button onClick={() => editor.duplicate()} disabled={!editor.selectionIds.length}>Duplicate <kbd>Ctrl D</kbd></button><span className="menu-separator" /><button onClick={editor.selectAll}>Select all <kbd>Ctrl A</kbd></button></div></details>
        {editor.selectionIds.length > 0 && <details><summary>Object</summary><div className="app-menu"><button onClick={editor.group} disabled={editor.selectionIds.length < 2}>Group <kbd>Ctrl G</kbd></button><button onClick={editor.ungroup} disabled={!editor.selectedElements.some((element) => element.type === 'group')}>Ungroup <kbd>Ctrl Shift G</kbd></button><span className="menu-separator" /><button onClick={() => editor.reorder('front')}>Bring to front <kbd>Ctrl Shift ]</kbd></button><button onClick={() => editor.reorder('forward')}>Bring forward <kbd>Ctrl ]</kbd></button><button onClick={() => editor.reorder('backward')}>Send backward <kbd>Ctrl [</kbd></button><button onClick={() => editor.reorder('back')}>Send to back <kbd>Ctrl Shift [</kbd></button><span className="menu-separator" /><button onClick={() => editor.toggleSelection('locked')}>{editor.selectedElements.every((element) => element.locked) ? 'Unlock' : 'Lock'} <kbd>Ctrl Shift L</kbd></button><button onClick={() => editor.toggleSelection('visible')}>Hide <kbd>Ctrl Shift H</kbd></button></div></details>}
        <details><summary>View</summary><div className="app-menu"><button onClick={() => editor.togglePanel('left')}>{editor.leftPanelOpen ? 'Hide' : 'Show'} layers</button><button onClick={() => editor.togglePanel('right')}>{editor.rightPanelOpen ? 'Hide' : 'Show'} properties</button><span className="menu-separator" /><button onClick={() => editor.setZoom(1)}>Actual size <kbd>1</kbd></button><button onClick={() => editor.setZoom(.5)}>Fit canvas <kbd>2</kbd></button></div></details>
      </div>
    </div>
    <div className="topbar-document"><input aria-label="Document name" defaultValue={editor.document.name} key={editor.document.id} onBlur={(event) => event.target.value.trim() && event.target.value !== editor.document.name && editor.renameDocument(event.target.value.trim())} /><span className="save-indicator"><Check size={11} /> Saved locally</span></div>
    {editor.selectionIds.length > 1 && <div className="multi-selection-chip"><Group size={12} /> {editor.selectionIds.length} objects</div>}
    <div className="topbar-actions">
      <button className={`art-kit-trigger ${editor.artMode ? 'is-active' : ''}`} onClick={editor.toggleArtMode}><Palette size={14} /> Stylized Art</button><span className="toolbar-separator" />
      <IconButton label="Toggle layers panel" active={editor.leftPanelOpen} onClick={() => editor.togglePanel('left')}><PanelLeftClose size={15} /></IconButton><span className="toolbar-separator" />
      <IconButton label="Undo" shortcut="Ctrl Z" onClick={editor.undo} disabled={!editor.past.length}><Undo2 size={15} /></IconButton><IconButton label="Redo" shortcut="Ctrl Y" onClick={editor.redo} disabled={!editor.future.length}><Redo2 size={15} /></IconButton>
      <div className="zoom-control"><button onClick={() => editor.setZoom(editor.zoom * .9)}>−</button><button className="zoom-value" onClick={() => editor.setZoom(1)}>{Math.round(editor.zoom * 100)}%</button><button onClick={() => editor.setZoom(editor.zoom * 1.1)}>+</button></div><span className="toolbar-separator" />
      <button className="export-button" onClick={() => setExportOpen(true)}><Download size={14} /> Export <ChevronDown size={12} /></button>
      <IconButton label="Toggle properties panel" active={editor.rightPanelOpen} onClick={() => editor.togglePanel('right')}><PanelRightClose size={15} /></IconButton>
    </div>
  </header>{exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}</>
}

function downloadDocument(document: EdonDocument) {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `${document.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'edon-file'}.edon.json`; anchor.click(); URL.revokeObjectURL(url)
}
