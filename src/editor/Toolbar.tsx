import { useRef } from 'react'
import { Circle, Frame, Hand, Hexagon, Image, Minus, MousePointer2, MoveRight, Square, Star, Type } from 'lucide-react'
import { imageElementFromFile } from './image-import'
import { IconButton } from '../ui/IconButton'
import { TOOL_LABELS, useEditor, type EditorTool } from './editor-state'

const tools: Array<{ id: EditorTool; icon: typeof MousePointer2; shortcut: string }> = [
  { id: 'select', icon: MousePointer2, shortcut: 'V' },
  { id: 'frame', icon: Frame, shortcut: 'F' },
  { id: 'rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', icon: Circle, shortcut: 'O' },
  { id: 'line', icon: Minus, shortcut: 'L' },
  { id: 'arrow', icon: MoveRight, shortcut: 'A' },
  { id: 'polygon', icon: Hexagon, shortcut: 'P' },
  { id: 'star', icon: Star, shortcut: 'S' },
  { id: 'text', icon: Type, shortcut: 'T' },
  { id: 'image', icon: Image, shortcut: 'I' },
  { id: 'hand', icon: Hand, shortcut: 'H' },
]

export function Toolbar() {
  const { tool, setTool, addElement, page } = useEditor()
  const imageInput = useRef<HTMLInputElement>(null)

  const chooseTool = (id: EditorTool) => {
    if (id === 'image') imageInput.current?.click()
    else setTool(id)
  }

  const importImage = (file?: File) => {
    if (!file) return
    void imageElementFromFile(file, page).then((element) => { addElement(element); setTool('select') })
  }
  return (
    <aside className="editor-toolbar" aria-label="Design tools">
      {tools.map(({ id, icon: Icon, shortcut }, index) => (
        <div key={id} className={index === 1 || index === 6 ? 'tool-group-start' : ''}>
          <IconButton label={TOOL_LABELS[id]} shortcut={shortcut} active={tool === id} onClick={() => chooseTool(id)}><Icon size={17} strokeWidth={1.8} /></IconButton>
        </div>
      ))}
      <input ref={imageInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(event) => { importImage(event.target.files?.[0]); event.target.value = '' }} />
    </aside>
  )
}
