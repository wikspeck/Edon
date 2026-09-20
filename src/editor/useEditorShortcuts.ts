import { useEffect } from 'react'
import { useEditor, type EditorTool } from './editor-state'

const toolShortcuts: Record<string, EditorTool> = { v: 'select', f: 'frame', r: 'rectangle', o: 'ellipse', l: 'line', a: 'arrow', p: 'polygon', s: 'star', t: 'text', h: 'hand' }
const isTypingTarget = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]')

export function useEditorShortcuts(): void {
  const editor = useEditor()
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      const modifier = event.ctrlKey || event.metaKey
      const run = (action: () => void) => { event.preventDefault(); action() }

      if (modifier && key === 'c') return run(editor.copy)
      if (modifier && key === 'x') return run(editor.cut)
      if (modifier && key === 'v') return run(editor.paste)
      if (modifier && key === 'd') return run(() => editor.duplicate())
      if (modifier && key === 'a') return run(editor.selectAll)
      if (modifier && key === 'g' && event.shiftKey) return run(editor.ungroup)
      if (modifier && key === 'g') return run(editor.group)
      if (modifier && key === 'z' && event.shiftKey) return run(editor.redo)
      if (modifier && key === 'z') return run(editor.undo)
      if (modifier && key === 'y') return run(editor.redo)
      if (modifier && key === ']') return run(() => editor.reorder(event.shiftKey ? 'front' : 'forward'))
      if (modifier && key === '[') return run(() => editor.reorder(event.shiftKey ? 'back' : 'backward'))
      if (modifier && event.shiftKey && key === 'l') return run(() => editor.toggleSelection('locked'))
      if (modifier && event.shiftKey && key === 'h') return run(() => editor.toggleSelection('visible'))
      if (key === 'delete' || key === 'backspace') return run(editor.removeSelected)
      if (key === 'escape') return run(() => { editor.setVectorEdit(null); editor.select(null); editor.setTool('select') })
      if (key === '+' || key === '=') return run(() => editor.setZoom(editor.zoom * 1.1))
      if (key === '-') return run(() => editor.setZoom(editor.zoom * .9))
      if (key === '1') return run(() => editor.setZoom(1))
      if (key === '2') return run(() => editor.setZoom(.5))
      if (!modifier && !event.altKey) {
        if (editor.artMode && key === 'n') return run(() => editor.setTool('pencil'))
        if (editor.artMode && key === 'p') return run(() => editor.setTool('pen'))
        if (editor.artMode && key === 'i') return run(() => editor.setTool('eyedropper'))
        const tool = toolShortcuts[key]
        if (tool) run(() => editor.setTool(tool))
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [editor])
}
