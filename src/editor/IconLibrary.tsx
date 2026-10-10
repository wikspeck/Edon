import { useEffect, useRef, useState } from 'react'
import { Shapes, X } from 'lucide-react'
import { nodesFromPathData } from './vector-path'
import { createElement } from '../model/document'
import { useEditor } from './editor-state'

const icons = [
 ['Search','Interface','M10 1 A9 9 0 1 1 4 17 A9 9 0 0 1 10 1 Z M10 4 A6 6 0 1 0 10 16 A6 6 0 0 0 10 4 Z M16 15 L23 22 L21 24 L14 17 Z'],
 ['Menu','Interface','M2 4 H22 V7 H2 Z M2 11 H22 V14 H2 Z M2 18 H22 V21 H2 Z'],
 ['Grid','Interface','M2 2 H10 V10 H2 Z M14 2 H22 V10 H14 Z M2 14 H10 V22 H2 Z M14 14 H22 V22 H14 Z'],
 ['Calendar','Interface','M3 4 H21 V23 H3 Z M5 9 V21 H19 V9 Z M6 1 H9 V7 H6 Z M15 1 H18 V7 H15 Z'],
 ['Desktop','Interface','M1 2 H23 V18 H14 V21 H19 V24 H5 V21 H10 V18 H1 Z M4 5 V15 H20 V5 Z'],
 ['Phone','Interface','M6 0 H18 V24 H6 Z M8 3 V19 H16 V3 Z M11 21 H13 V23 H11 Z'],
 ['Lock','Interface','M6 10 V6 A6 6 0 0 1 18 6 V10 H21 V23 H3 V10 Z M9 10 H15 V6 A3 3 0 0 0 9 6 Z'],
 ['Eye','Interface','M0 12 Q12 -5 24 12 Q12 29 0 12 Z M8 12 A4 4 0 1 0 16 12 A4 4 0 1 0 8 12 Z'],
 ['Download','Interface','M10 0 H14 V12 L18 8 L21 11 L12 20 L3 11 L6 8 L10 12 Z M1 21 H23 V24 H1 Z'],
 ['Upload','Interface','M10 20 H14 V8 L18 12 L21 9 L12 0 L3 9 L6 12 L10 8 Z M1 21 H23 V24 H1 Z'],
 ['Trash','Interface','M3 5 H21 V8 H3 Z M7 1 H17 V4 H7 Z M5 10 H19 L17 24 H7 Z'],
 ['Layers','Interface','M12 0 L24 7 L12 14 L0 7 Z M0 12 L12 19 L24 12 V16 L12 23 L0 16 Z'],
 ['Dashboard','Interface','M1 1 H11 V14 H1 Z M14 1 H23 V8 H14 Z M1 17 H11 V23 H1 Z M14 11 H23 V23 H14 Z'],
 ['Code','Interface','M7 4 L0 12 L7 20 L10 17 L5 12 L10 7 Z M17 4 L24 12 L17 20 L14 17 L19 12 L14 7 Z'],
 ['Chevron right','Navigation','M7 2 L17 12 L7 22 L4 19 L11 12 L4 5 Z'],
 ['Chevron down','Navigation','M2 7 L12 17 L22 7 L19 4 L12 11 L5 4 Z'],
 ['Radio','Interface','M12 0 A12 12 0 1 1 12 24 A12 12 0 1 1 12 0 Z M12 3 A9 9 0 1 0 12 21 A9 9 0 1 0 12 3 Z M12 7 A5 5 0 1 1 12 17 A5 5 0 1 1 12 7 Z'],
 ['Checkbox','Interface','M1 1 H23 V23 H1 Z M4 4 V20 H20 V4 Z M6 11 L10 15 L18 7 L20 9 L10 19 L4 13 Z'],
 ['Sliders','Interface','M0 4 H24 V7 H0 Z M0 11 H24 V14 H0 Z M0 18 H24 V21 H0 Z M5 1 H8 V10 H5 Z M16 8 H19 V17 H16 Z M9 15 H12 V24 H9 Z'],
 ['Cursor','Interface','M3 0 L22 14 L14 16 L10 24 Z'],
 ['Heart','Symbols','M12 21 C9 18 2 13 2 7 C2 1 9 0 12 5 C15 0 22 1 22 7 C22 13 15 18 12 21 Z'],
 ['Star','Symbols','M12 1 L15 8 L23 9 L17 14 L19 22 L12 18 L5 22 L7 14 L1 9 L9 8 Z'],
 ['Bolt','Symbols','M14 1 L3 14 L10 14 L9 23 L21 9 L14 9 Z'],
 ['Moon','Nature','M19 2 C5 1 0 17 10 22 C16 25 23 20 23 14 C13 19 8 7 19 2 Z'],
 ['Sun','Nature','M12 5 C21 5 21 19 12 19 C3 19 3 5 12 5 Z M11 0 H13 V3 H11 Z M11 21 H13 V24 H11 Z M0 11 H3 V13 H0 Z M21 11 H24 V13 H21 Z'],
 ['Leaf','Nature','M22 2 C4 0 0 9 5 18 C13 25 24 15 22 2 Z M5 18 L18 6 L6 20 Z'],
 ['Cloud','Nature','M7 20 C0 20 0 10 6 10 C5 0 19 0 20 10 C26 12 24 20 19 20 Z'],
 ['Mountain','Nature','M1 22 L9 7 L14 14 L18 9 L24 22 Z'],
 ['Arrow right','Navigation','M2 10 H16 L11 5 L14 2 L24 12 L14 22 L11 19 L16 14 H2 Z'],
 ['Arrow left','Navigation','M22 10 H8 L13 5 L10 2 L0 12 L10 22 L13 19 L8 14 H22 Z'],
 ['Arrow up','Navigation','M10 22 V8 L5 13 L2 10 L12 0 L22 10 L19 13 L14 8 V22 Z'],
 ['Check','Navigation','M1 12 L5 8 L10 13 L20 3 L24 7 L10 21 Z'],
 ['Plus','Navigation','M10 2 H14 V10 H22 V14 H14 V22 H10 V14 H2 V10 H10 Z'],
 ['Close','Navigation','M4 1 L12 9 L20 1 L23 4 L15 12 L23 20 L20 23 L12 15 L4 23 L1 20 L9 12 L1 4 Z'],
 ['Home','Interface','M0 11 L12 1 L24 11 L21 14 L21 23 L15 23 L15 16 L9 16 L9 23 L3 23 L3 14 Z'],
 ['Folder','Interface','M1 4 H9 L12 7 H23 V21 H1 Z'],
 ['Bookmark','Interface','M5 1 H19 V23 L12 18 L5 23 Z'],
 ['Play','Media','M5 2 L23 12 L5 22 Z'],
 ['Pause','Media','M4 2 H10 V22 H4 Z M14 2 H20 V22 H14 Z'],
 ['Stop','Media','M3 3 H21 V21 H3 Z'],
 ['Music','Media','M10 2 L22 0 V18 C22 24 13 24 13 19 C13 15 17 14 19 15 V6 L13 8 V20 C13 26 3 25 3 21 C3 17 7 16 10 17 Z'],
 ['Volume','Media','M1 9 H6 L13 3 V21 L6 15 H1 Z M16 7 C22 9 22 15 16 17 L16 14 C19 13 19 11 16 10 Z'],
 ['Chat','Interface','M2 2 H22 V18 H9 L2 24 Z'],
 ['Mail','Interface','M1 4 H23 V20 H1 Z M3 6 L12 13 L21 6 L12 16 Z'],
 ['Flag','Symbols','M3 1 H5 V3 H22 L18 8 L22 13 H5 V23 H3 Z'],
 ['Diamond','Symbols','M12 0 L24 12 L12 24 L0 12 Z'],
 ['Shield','Symbols','M12 1 L22 5 V13 C22 19 16 23 12 24 C8 23 2 19 2 13 V5 Z'],
 ['User','Interface','M12 1 C20 1 20 13 12 13 C4 13 4 1 12 1 Z M1 24 C1 10 23 10 23 24 Z'],
 ['Pin','Navigation','M12 1 C0 1 2 13 12 24 C22 13 24 1 12 1 Z M12 5 C17 5 17 13 12 13 C7 13 7 5 12 5 Z'],
 ['Crown','Symbols','M1 5 L7 10 L12 1 L17 10 L23 5 L20 22 H4 Z'],
] as const

export function IconLibrary({ onClose }: { onClose: () => void }) {
 const editor = useEditor()
 const dialog = useRef<HTMLDialogElement>(null)
 const [query,setQuery] = useState('')
 const [category,setCategory] = useState('All')
 useEffect(() => { dialog.current?.showModal() }, [])
 const insert = (name:string,path:string) => {
  const size=96
  const element=createElement('path',(editor.page.width-size)/2,(editor.page.height-size)/2,size,size)
  element.name=name; element.fill=editor.artSettings.color; element.fillPaint={type:'solid',color:element.fill}
  element.pathData=path.replace(/-?\d+(?:\.\d+)?/g,number=>String(Number(number)*4)); element.closed=true; element.vectorNodes=nodesFromPathData(element.pathData)
  editor.addElement(element); editor.setTool('select'); onClose()
 }
 const filtered=icons.filter(([name,group])=>(category==='All'||category===group)&&name.toLowerCase().includes(query.toLowerCase()))
 return <dialog ref={dialog} className="icon-library" aria-labelledby="icon-library-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose()}}><header><h2 id="icon-library-title"><Shapes size={20}/> Icons</h2><button aria-label="Close icon library" onClick={onClose}><X size={20}/></button></header><input autoFocus aria-label="Search icons" placeholder="Find an icon…" value={query} onChange={event=>setQuery(event.target.value)}/><div className="icon-categories">{['All','Symbols','Navigation','Interface','Media','Nature'].map(group=><button key={group} aria-pressed={category===group} onClick={()=>setCategory(group)}>{group}</button>)}</div><div className="icon-library-grid">{filtered.map(([name,,path])=><button key={name} onClick={()=>insert(name,path)} aria-label={`Insert ${name}`}><svg viewBox="0 0 24 24"><path d={path} fill="currentColor" fillRule="evenodd"/></svg><span>{name}</span></button>)}{!filtered.length&&<p>No icons found.</p>}</div><footer>Editable vectors · Your current color · Works offline</footer></dialog>
}
