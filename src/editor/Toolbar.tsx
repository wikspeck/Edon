import { useRef } from 'react'
import { Circle, Frame, Hand, Image, MousePointer2, Square, Type } from 'lucide-react'
import { createElement } from '../model/document'
import { IconButton } from '../ui/IconButton'
import { TOOL_LABELS, useEditor, type EditorTool } from './editor-state'

const tools: Array<{ id: EditorTool; icon: typeof MousePointer2; shortcut: string }> = [
  { id: 'select', icon: MousePointer2, shortcut: 'V' },
  { id: 'frame', icon: Frame, shortcut: 'F' },
  { id: 'rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', icon: Circle, shortcut: 'O' },
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
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return
      const image = new window.Image()
      image.addEventListener('load', () => {
        const maxWidth = Math.min(640, page.width * 0.6)
        const ratio = Math.min(1, maxWidth / image.naturalWidth)
        const element = createElement('image', page.width / 2 - image.naturalWidth * ratio / 2, page.height / 2 - image.naturalHeight * ratio / 2, image.naturalWidth * ratio, image.naturalHeight * ratio)
        element.name = file.name.replace(/\.[^.]+$/, '') || 'Image'
        element.imageUrl = reader.result as string
        addElement(element)
        setTool('select')
      })
      image.src = reader.result
    })
    reader.readAsDataURL(file)
  }
  return (
    <aside className="editor-toolbar" aria-label="Design tools">
      {tools.map(({ id, icon: Icon, shortcut }, index) => (
        <div key={id} className={index === 1 || index === 6 ? 'tool-group-start' : ''}>
          <IconButton label={TOOL_LABELS[id]} shortcut={shortcut} active={tool === id} onClick={() => chooseTool(id)}><Icon size={17} strokeWidth={1.8} /></IconButton>
        </div>
      ))}
      <input ref={imageInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { importImage(event.target.files?.[0]); event.target.value = '' }} />
    </aside>
  )
}
