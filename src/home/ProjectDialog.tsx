import { useEffect, useRef, useState } from 'react'
import { FolderPlus, Trash2, X } from 'lucide-react'
import { IconButton } from '../ui/IconButton'

export function ProjectDialog({ title, initialName = '', destructive = false, detail, onClose, onConfirm }: { title: string; initialName?: string; destructive?: boolean; detail?: string; onClose: () => void; onConfirm: (name: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState(initialName)
  useEffect(() => { if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal() }, [])
  return <dialog ref={dialogRef} className="project-dialog" onCancel={onClose} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (destructive || name.trim()) onConfirm(name.trim()) }}>
    <header><div>{destructive ? <Trash2 size={16} /> : <FolderPlus size={16} />}<strong>{title}</strong></div><IconButton label="Close" onClick={onClose}><X size={14} /></IconButton></header>
    <div className="project-dialog-body">{detail && <p>{detail}</p>}{!destructive && <label><span>Project name</span><input autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} /></label>}</div>
    <footer><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button className={destructive ? 'button-danger' : 'button-primary'} disabled={!destructive && !name.trim()}>{destructive ? 'Delete project' : 'Save project'}</button></footer>
  </form></dialog>
}
