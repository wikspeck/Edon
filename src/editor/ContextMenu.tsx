import { BringToFront, ClipboardCopy, Copy, EyeOff, Group, Layers2, Lock, Scissors, SendToBack, Trash2, Ungroup, Paintbrush, Plus, Grid2X2 } from 'lucide-react'
import { useState } from 'react'
import { TOOL_LABELS, useEditor, type EditorTool } from './editor-state'
import { COMMAND_SHORTCUTS } from './shortcuts'
import { ViewportLayer } from '../ui/ViewportLayer'

export function ContextMenu({ x, y, onClose, workspace = 'canvas' }: { x: number; y: number; onClose: () => void; workspace?: 'doc' | 'canvas' }) {
  const editor = useEditor()
  const [query, setQuery] = useState('')
  const maskSelection = editor.selectedElements.length === 2 && editor.selectedElements[0].type !== 'group' && editor.selectedElements[0].parentId === editor.selectedElements[1].parentId && ['rectangle', 'ellipse', 'polygon', 'star', 'path'].includes(editor.selectedElements[1].type) && editor.selectedElements.every((element) => !element.locked)
  const hasGroup = editor.selectedElements.some((element) => element.type === 'group')
  const run = (action: () => void) => () => { action(); onClose() }
  return <ViewportLayer point={{ x, y }} onDismiss={onClose}><div className="canvas-context-menu" role="menu" onPointerDown={(event) => event.stopPropagation()}>
    <input className="context-search" aria-label="Search tools" placeholder="Search tools…" value={query} onChange={(event) => setQuery(event.target.value)} />

    {workspace === 'canvas' && <><div className="context-heading">Drawing mode</div><button onClick={run(() => editor.setDrawingMode('pixel'))}><Grid2X2 size={13} /> Pixel {editor.drawingMode === 'pixel' && '✓'}</button><button onClick={run(() => editor.setDrawingMode('vector'))}><Paintbrush size={13} /> Vector {editor.drawingMode === 'vector' && '✓'}</button><button onClick={run(() => editor.setPixelGridVisible(!editor.pixelGridVisible))}><Grid2X2 size={13} /> {editor.pixelGridVisible ? 'Hide' : 'Show'} grid</button>
    <details open={Boolean(query)}><summary className="context-heading">Tools</summary>{(Object.keys(TOOL_LABELS) as EditorTool[]).filter((tool) => tool !== 'image' && TOOL_LABELS[tool].toLowerCase().includes(query.toLowerCase())).map((tool) => <button key={tool} onClick={run(() => editor.setTool(tool))}>{TOOL_LABELS[tool]}</button>)}</details></>}
    <div className="context-heading">Pages</div><button onClick={run(editor.addPage)}><Plus size={13} /> Add page</button><details><summary className="context-heading">Go to page</summary>{editor.document.pages.map((page) => <button key={page.id} onClick={run(() => editor.switchPage(page.id))}>{page.name} {page.id === editor.page.id && '✓'}</button>)}</details>
    {workspace === 'canvas' && <><span /><button disabled={!editor.selectionIds.length} onClick={run(editor.cut)}><Scissors size={13} /> Cut <kbd>{COMMAND_SHORTCUTS.cut}</kbd></button>
    <button disabled={!editor.selectionIds.length} onClick={run(editor.copy)}><ClipboardCopy size={13} /> Copy <kbd>{COMMAND_SHORTCUTS.copy}</kbd></button>
    <button disabled={!editor.canPaste} onClick={run(editor.paste)}><ClipboardCopy size={13} /> Paste <kbd>{COMMAND_SHORTCUTS.paste}</kbd></button>
    {editor.selectionIds.length > 0 && <>
    <div className="context-heading">Mask</div>
    {maskSelection && <button onClick={run(editor.applySelectionMask)}>Use top shape as mask</button>}
    {editor.selectionIds.length === 1 && editor.selectedElement?.type !== 'group' && <><button onClick={run(() => editor.updateSelected({ mask: { id: `mask-${editor.selectedElement!.id}`, type: 'shape', shape: 'ellipse', cornerRadius: 24, sides: 6, inset: 0, inverted: false } }))}>Mask with ellipse</button><button onClick={run(() => editor.updateSelected({ mask: { id: `mask-${editor.selectedElement!.id}`, type: 'shape', shape: 'rounded-rectangle', cornerRadius: 24, sides: 6, inset: 0, inverted: false } }))}>Mask with rounded rectangle</button>{editor.selectedElement?.mask && <><button onClick={run(() => editor.updateSelected({ mask: { ...editor.selectedElement!.mask!, inverted: !editor.selectedElement!.mask!.inverted } }))}>Invert mask</button><button onClick={run(() => editor.updateSelected({ mask: undefined }))}>Remove mask</button></>}</>}
    {editor.canBooleanSelection && <><div className="context-heading">Boolean operations</div>{(['union', 'subtract', 'intersect', 'exclude'] as const).map((operation) => <button key={operation} onClick={run(() => editor.booleanOperation(operation))}>{operation === 'exclude' ? 'Exclude overlap' : operation[0].toUpperCase() + operation.slice(1)}</button>)}</>}
    <button onClick={run(() => editor.duplicate())}><Copy size={13} /> Duplicate <kbd>{COMMAND_SHORTCUTS.duplicate}</kbd></button>
    <span />
    {editor.selectionIds.length > 1 && <button onClick={run(editor.group)}><Group size={13} /> Group <kbd>{COMMAND_SHORTCUTS.group}</kbd></button>}
    {hasGroup && <button onClick={run(editor.ungroup)}><Ungroup size={13} /> Ungroup <kbd>Ctrl ⇧ G</kbd></button>}
    <button onClick={run(() => editor.reorder('front'))}><BringToFront size={13} /> Bring to front <kbd>Ctrl ⇧ ]</kbd></button>
    <button onClick={run(() => editor.reorder('back'))}><SendToBack size={13} /> Send to back <kbd>Ctrl ⇧ [</kbd></button>
    <button onClick={run(() => editor.reorder('forward'))}><Layers2 size={13} /> Bring forward <kbd>Ctrl ]</kbd></button>
    <span />
    <button onClick={run(() => editor.toggleSelection('locked'))}><Lock size={13} /> {editor.selectedElements.every((element) => element.locked) ? 'Unlock' : 'Lock'} <kbd>Ctrl ⇧ L</kbd></button>
    <button onClick={run(() => editor.toggleSelection('visible'))}><EyeOff size={13} /> Hide <kbd>Ctrl ⇧ H</kbd></button>
    <button className="danger" onClick={run(editor.removeSelected)}><Trash2 size={13} /> Delete <kbd>Del</kbd></button>
    </>}</>}
  </div></ViewportLayer>
}
