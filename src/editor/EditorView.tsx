import { useEffect } from 'react'
import type { EdonDocument } from '../model/document'
import { Canvas } from './Canvas'
import { EditorProvider, useEditor, type EditorTool } from './editor-state'
import { LayersPanel } from './LayersPanel'
import { PropertiesPanel } from './PropertiesPanel'
import { Toolbar } from './Toolbar'
import { TopBar } from './TopBar'

interface EditorViewProps {
  document: EdonDocument
  onChange: (document: EdonDocument) => void
  onBack: () => void
}

export function EditorView({ document, onChange, onBack }: EditorViewProps) {
  return <EditorProvider initialDocument={document}><EditorWorkspace onChange={onChange} onBack={onBack} /></EditorProvider>
}

const toolShortcuts: Record<string, EditorTool> = { v: 'select', f: 'frame', r: 'rectangle', o: 'ellipse', t: 'text', h: 'hand' }

function EditorWorkspace({ onChange, onBack }: Omit<EditorViewProps, 'document'>) {
  const { document, tool, leftPanelOpen, rightPanelOpen, setTool, setZoom, zoom, removeSelected, undo, redo } = useEditor()

  useEffect(() => onChange(document), [document, onChange])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select, [contenteditable="true"]')) return
      const modifier = event.ctrlKey || event.metaKey
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSelected(); return }
      if (event.key === 'Escape') { setTool('select'); return }
      if (event.key === '+' || event.key === '=') { setZoom(zoom + 0.1); return }
      if (event.key === '-') { setZoom(zoom - 0.1); return }
      if (event.key === '1') { setZoom(1); return }
      if (event.key === '2') { setZoom(0.5); return }
      const shortcut = toolShortcuts[event.key.toLowerCase()]
      if (shortcut) setTool(shortcut)
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [redo, removeSelected, setTool, setZoom, undo, zoom])

  return <main className={`editor-shell tool-${tool}`}>
    <TopBar onBack={onBack} />
    <div className={`editor-body ${leftPanelOpen ? '' : 'left-closed'} ${rightPanelOpen ? '' : 'right-closed'}`}>
      <Toolbar />
      {leftPanelOpen && <LayersPanel />}
      <Canvas />
      {rightPanelOpen && <PropertiesPanel />}
    </div>
    <div className="screen-too-small"><span>edon</span><strong>A little more room, please.</strong><p>The editor is designed for a desktop-sized workspace. Widen the window to continue editing.</p></div>
  </main>
}
