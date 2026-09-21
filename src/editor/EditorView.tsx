import { useEffect } from 'react'
import type { EdonDocument } from '../model/document'
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
  const { document, tool, leftPanelOpen, rightPanelOpen } = useEditor()
  useEditorShortcuts()

  useEffect(() => onChange(document), [document, onChange])

  return <main className={`editor-shell tool-${tool}`}>
    <TopBar onBack={onBack} />
    <div className={`editor-body ${leftPanelOpen ? '' : 'left-closed'} ${rightPanelOpen ? '' : 'right-closed'}`}>
      <Toolbar />
      {leftPanelOpen && <LayersPanel />}
      <div className="canvas-column"><ToolOptions /><Canvas /></div>
      {rightPanelOpen && <PropertiesPanel />}
    </div>
    <div className="screen-too-small"><span>edon</span><strong>A little more room, please.</strong><p>The editor is designed for a desktop-sized workspace. Widen the window to continue editing.</p></div>
  </main>
}
