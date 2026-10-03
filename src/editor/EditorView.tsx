import { CustomSelect } from '../ui/CustomSelect'
import { useEffect, useState } from 'react'
import { DocEditor } from './DocEditor'
import { ContextMenu } from './ContextMenu'
import { documentKind, type EdonDocument } from '../model/document'
import { Canvas } from './Canvas'
import { EditorProvider, useEditor } from './editor-state'
import { LayersPanel } from './LayersPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { Toolbar } from './Toolbar'
import { TopBar } from './TopBar'
import { useEditorShortcuts } from './useEditorShortcuts'
import { ToolOptions } from './ToolOptions'

interface EditorViewProps {
  document: EdonDocument
  onChange: (document: EdonDocument) => void
  onBack: () => void
}

export function EditorView({ document, onChange, onBack }: EditorViewProps) {
  return <EditorProvider initialDocument={document}><EditorWorkspace onChange={onChange} onBack={onBack} /></EditorProvider>
}

function EditorWorkspace({ onChange, onBack }: Omit<EditorViewProps, 'document'>) {
  const editor = useEditor()
  const { document, tool, leftPanelOpen, rightPanelOpen } = editor
  const mode = documentKind(document) === 'doc' ? 'doc' : 'canvas'
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const drawingMode = editor.drawingMode
  useEditorShortcuts(mode === 'canvas')

  useEffect(() => onChange(document), [document, onChange])

  return <main className={`editor-shell tool-${tool}`} onContextMenu={(event) => { if (mode === 'doc') { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY }) } }}>
    <TopBar onBack={onBack} workspace={mode} />
    <div className="workspace-switcher"><strong className="workspace-kind">{mode === 'doc' ? 'Document' : 'Canvas'}</strong><span className="workspace-description">{mode === 'doc' ? 'Write, format & compose' : 'Design with pixels and vectors together'}</span>{mode === 'canvas' && <div className="workspace-tabs" aria-label="Drawing mode">{(['vector', 'pixel'] as const).map((value) => <button key={value} aria-pressed={drawingMode === value} onClick={() => editor.setDrawingMode(value)}>{value === 'pixel' ? 'Pixel' : 'Vector'}</button>)}</div>}{mode === 'canvas' && <button className="grid-toggle" aria-pressed={editor.pixelGridVisible} onClick={() => editor.setPixelGridVisible(!editor.pixelGridVisible)}>Grid</button>}<div className="workspace-pages"><CustomSelect aria-label="Active page" value={document.activePageId} onChange={(event) => editor.switchPage(event.target.value)}>{document.pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}</CustomSelect><button onClick={editor.addPage}>+ Page</button></div></div>
    {mode === 'doc' ? <DocEditor key={document.activePageId} /> :
    <div className={`editor-body ${leftPanelOpen ? '' : 'left-closed'} ${rightPanelOpen ? '' : 'right-closed'}`}>
      <Toolbar />
      {leftPanelOpen && <LayersPanel />}
      <div className="canvas-column"><ToolOptions /><Canvas key={document.activePageId} /></div>
      {rightPanelOpen && <PropertiesPanel />}
    </div>}
    {contextMenu && <ContextMenu workspace={mode} x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />}
    <div className="screen-too-small"><span>edon</span><strong>A little more room, please.</strong><p>The editor is designed for a desktop-sized workspace. Widen the window to continue editing.</p></div>
  </main>
}
