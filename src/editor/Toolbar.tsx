import { useRef } from 'react'
import { Brush, Circle, Eraser, Frame, Hand, Hexagon, Image, Minus, MousePointer2, MoveRight, PaintBucket, PenLine, Pencil, Pipette, Square, Star, Type } from 'lucide-react'
import { imageElementFromFile } from './image-import'
import { IconButton } from '../ui/IconButton'
import { TOOL_LABELS, useEditor, type EditorTool } from './editor-state'
import { TOOL_SHORTCUTS } from './shortcuts'

const tools: Array<{ id: EditorTool; icon: typeof MousePointer2 }> = [
  { id: 'select', icon: MousePointer2 },
  { id: 'pen', icon: PenLine },
  { id: 'pencil', icon: Pencil },
  { id: 'brush', icon: Brush },
  { id: 'eraser', icon: Eraser },
  { id: 'fill', icon: PaintBucket },
  { id: 'eyedropper', icon: Pipette },
  { id: 'frame', icon: Frame },
  { id: 'rectangle', icon: Square },
  { id: 'ellipse', icon: Circle },
  { id: 'line', icon: Minus },
  { id: 'arrow', icon: MoveRight },
  { id: 'polygon', icon: Hexagon },
  { id: 'star', icon: Star },
  { id: 'text', icon: Type },
  { id: 'image', icon: Image },
  { id: 'hand', icon: Hand },
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
      {tools.map(({ id, icon: Icon }, index) => (
        <div key={id} className={index === 1 || index === 7 || index === 15 ? 'tool-group-start' : ''}>
          <IconButton label={TOOL_LABELS[id]} shortcut={TOOL_SHORTCUTS[id]} active={tool === id} onClick={() => chooseTool(id)}><Icon size={17} strokeWidth={1.8} /></IconButton>
        </div>
      ))}
      <input ref={imageInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={(event) => { importImage(event.target.files?.[0]); event.target.value = '' }} />
    </aside>
  )
}
