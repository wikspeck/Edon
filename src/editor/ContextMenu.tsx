import { BringToFront, ClipboardCopy, Copy, EyeOff, Group, Layers2, Lock, Scissors, SendToBack, Trash2, Ungroup } from 'lucide-react'
import { useEditor } from './editor-state'

export function ContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const editor = useEditor()
  const hasGroup = editor.selectedElements.some((element) => element.type === 'group')
  const run = (action: () => void) => () => { action(); onClose() }
  return <div className="canvas-context-menu" style={{ left: x, top: y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
    <button onClick={run(editor.cut)}><Scissors size={13} /> Cut <kbd>Ctrl X</kbd></button>
    <button onClick={run(editor.copy)}><ClipboardCopy size={13} /> Copy <kbd>Ctrl C</kbd></button>
    <button onClick={run(() => editor.duplicate())}><Copy size={13} /> Duplicate <kbd>Ctrl D</kbd></button>
    <span />
    {editor.selectionIds.length > 1 && <button onClick={run(editor.group)}><Group size={13} /> Group <kbd>Ctrl G</kbd></button>}
    {hasGroup && <button onClick={run(editor.ungroup)}><Ungroup size={13} /> Ungroup <kbd>Ctrl ⇧ G</kbd></button>}
    <button onClick={run(() => editor.reorder('front'))}><BringToFront size={13} /> Bring to front <kbd>Ctrl ⇧ ]</kbd></button>
    <button onClick={run(() => editor.reorder('back'))}><SendToBack size={13} /> Send to back <kbd>Ctrl ⇧ [</kbd></button>
    <button onClick={run(() => editor.reorder('forward'))}><Layers2 size={13} /> Bring forward <kbd>Ctrl ]</kbd></button>
    <span />
    <button onClick={run(() => editor.toggleSelection('locked'))}><Lock size={13} /> {editor.selectedElements.every((element) => element.locked) ? 'Unlock' : 'Lock'} <kbd>Ctrl ⇧ L</kbd></button>
    <button onClick={run(() => editor.toggleSelection('visible'))}><EyeOff size={13} /> Hide <kbd>Ctrl ⇧ H</kbd></button>
    <button className="danger" onClick={run(editor.removeSelected)}><Trash2 size={13} /> Delete <kbd>Del</kbd></button>
  </div>
}
