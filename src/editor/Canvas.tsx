import { useEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Crosshair, Move, MousePointer2 } from 'lucide-react'
import { createElement, type EdonElement, type ElementType, type VectorPoint } from '../model/document'
import { CanvasElement } from './CanvasElement'
import { ContextMenu } from './ContextMenu'
import { DRAWABLE_TOOLS, useEditor } from './editor-state'
import { boundsOf, descendantsOf, type Bounds } from './geometry'
import { imageElementFromFile } from './image-import'
import { SelectionOverlay, type ResizeHandle } from './SelectionOverlay'
import { VectorEditOverlay } from './VectorEditOverlay'
import { fitPath, nodesToPath, pointsToNodes } from './vector-path'
import { createRasterStroke, paintEnclosedRegion, sampleVisibleColor } from './raster-engine'

type Point = { x: number; y: number }
type Guide = { axis: 'x' | 'y'; value: number }
type Gesture =
  | { kind: 'draw'; start: Point; current: Point; type: Exclude<ElementType, 'group' | 'image' | 'path' | 'text'> }
  | { kind: 'marquee'; start: Point; current: Point; additive: boolean }
  | { kind: 'move'; start: Point; ids: string[]; targets: EdonElement[]; selectionBounds: Bounds }
  | { kind: 'resize'; start: Point; handle: Exclude<ResizeHandle, 'rotate'>; targets: EdonElement[]; selectionBounds: Bounds }
  | { kind: 'rotate'; startAngle: number; targets: EdonElement[]; selectionBounds: Bounds }
  | { kind: 'pan'; start: Point; origin: Point }
  | { kind: 'pencil'; points: Point[] }
  | { kind: 'raster'; points: Point[]; erase: boolean }

export function Canvas() {
  const editor = useEditor()
  const viewportRef = useRef<HTMLDivElement>(null)
  const artboardRef = useRef<HTMLDivElement>(null)
  const lastTextPointer = useRef<{ id: string; time: number } | null>(null)
  const lastPathPointer = useRef<{ id: string; time: number } | null>(null)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [spacePressed, setSpacePressed] = useState(false)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [penPoints, setPenPoints] = useState<Point[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const down = (event: KeyboardEvent) => event.code === 'Space' && !isTyping(event.target) && setSpacePressed(true)
    const up = (event: KeyboardEvent) => event.code === 'Space' && setSpacePressed(false)
    const blur = () => setSpacePressed(false)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])

  useEffect(() => {
    const finish = (event: KeyboardEvent) => {
      if (editor.tool !== 'pen') return
      if (event.key === 'Enter' && penPoints.length > 1) { event.preventDefault(); addPenPath(penPoints, false, editor); setPenPoints([]) }
      if (event.key === 'Escape') setPenPoints([])
    }
    window.addEventListener('keydown', finish)
    return () => window.removeEventListener('keydown', finish)
  }, [editor, penPoints])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const zoomAtCursor = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const nextZoom = Math.min(8, Math.max(.05, editor.zoom * Math.exp(-event.deltaY * .0015)))
      const cursorX = event.clientX - (rect.left + rect.width / 2); const cursorY = event.clientY - (rect.top + rect.height / 2); const ratio = nextZoom / editor.zoom
      editor.setPan({ x: cursorX - (cursorX - editor.pan.x) * ratio, y: cursorY - (cursorY - editor.pan.y) * ratio }); editor.setZoom(nextZoom)
    }
    viewport.addEventListener('wheel', zoomAtCursor, { passive: false })
    return () => viewport.removeEventListener('wheel', zoomAtCursor)
  }, [editor])

  const pointInArtboard = (clientX: number, clientY: number): Point | null => {
    const rect = artboardRef.current?.getBoundingClientRect()
    if (!rect || clientX < rect.left || clientY < rect.top || clientX > rect.right || clientY > rect.bottom) return null
    return { x: (clientX - rect.left) / editor.zoom, y: (clientY - rect.top) / editor.zoom }
  }

  const capture = (event: ReactPointerEvent) => viewportRef.current?.setPointerCapture(event.pointerId)
  const runBucket = async (point: Point) => {
    setNotice('Finding enclosed region…')
    const result = await paintEnclosedRegion(editor.page, point, editor.artSettings)
    if (result.element) { editor.addElement(result.element); editor.rememberColor(editor.artSettings.color); setNotice(`Filled ${result.pixelCount.toLocaleString()} pixels`) }
    else setNotice(result.reason ?? 'That region could not be filled.')
    window.setTimeout(() => setNotice(null), 2800)
  }
  const sampleAt = async (point: Point) => { const color = await sampleVisibleColor(editor.page, point); editor.rememberColor(color); setNotice(`Sampled ${color.toUpperCase()}`); window.setTimeout(() => setNotice(null), 1400) }
  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    setContextMenu(null)
    if (event.button === 2) return
    if (event.button === 1 || editor.tool === 'hand' || spacePressed) {
      capture(event); setGesture({ kind: 'pan', start: { x: event.clientX, y: event.clientY }, origin: editor.pan }); return
    }
    const point = pointInArtboard(event.clientX, event.clientY)
    if (!point) { editor.select(null); return }
    if (editor.tool === 'fill') { void runBucket(point); return }
    if (editor.tool === 'eyedropper') { void sampleAt(point); return }
    if (editor.tool === 'brush' || editor.tool === 'eraser') { capture(event); setGesture({ kind: 'raster', points: [point], erase: editor.tool === 'eraser' }); return }
    if (editor.tool === 'pencil') { capture(event); setGesture({ kind: 'pencil', points: [point] }); return }
    if (editor.tool === 'pen') {
      const first = penPoints[0]
      if (first && penPoints.length > 2 && Math.hypot(point.x - first.x, point.y - first.y) < 12 / editor.zoom) { addPenPath(penPoints, true, editor); setPenPoints([]) }
      else setPenPoints((points) => [...points, point])
      return
    }
    if (editor.tool === 'select') {
      if (!event.shiftKey) editor.select(null)
      capture(event); setGesture({ kind: 'marquee', start: point, current: point, additive: event.shiftKey }); return
    }
    if (!DRAWABLE_TOOLS.includes(editor.tool as ElementType)) return
    capture(event)
    if (editor.tool === 'text') { editor.addElement(createElement('text', point.x, point.y)); editor.setTool('select'); return }
    setGesture({ kind: 'draw', start: point, current: point, type: editor.tool as Exclude<ElementType, 'group' | 'image' | 'path' | 'text'> })
  }

  const elementPointerDown = (event: ReactPointerEvent, element: EdonElement) => {
    if (element.locked || editingTextId === element.id) return
    if (editor.tool === 'eyedropper') {
      event.stopPropagation()
      const point = pointInArtboard(event.clientX, event.clientY); if (point) void sampleAt(point)
      return
    }
    if (editor.tool === 'fill') {
      event.stopPropagation()
      if (['frame', 'rectangle', 'ellipse', 'polygon', 'star', 'text'].includes(element.type) || element.type === 'path' && element.closed) editor.updateElement(element.id, { fill: editor.artSettings.color, fillPaint: { type: 'solid', color: editor.artSettings.color } })
      else { const point = pointInArtboard(event.clientX, event.clientY); if (point) void runBucket(point) }
      return
    }
    if (editor.tool !== 'select') return
    event.stopPropagation(); setContextMenu(null)
    const selectableId = !event.ctrlKey && !event.metaKey && element.parentId ? element.parentId : element.id
    if (element.type === 'text') {
      const previous = lastTextPointer.current
      lastTextPointer.current = { id: element.id, time: event.timeStamp }
      if (previous?.id === element.id && event.timeStamp - previous.time < 500) { editor.select(element.id); setEditingTextId(element.id); lastTextPointer.current = null; return }
    }
    if (element.type === 'path') {
      const previous = lastPathPointer.current
      lastPathPointer.current = { id: element.id, time: event.timeStamp }
      if (previous?.id === element.id && event.timeStamp - previous.time < 500) { editor.select(element.id); editor.setVectorEdit(element.id); lastPathPointer.current = null; return }
    }
    if (event.shiftKey) { editor.select(selectableId, true); return }
    const alreadySelected = editor.selectionIds.includes(selectableId)
    if (!alreadySelected) editor.select(selectableId)
    let ids = alreadySelected ? editor.selectionIds : [selectableId]
    let targets = descendantsOf(editor.page.elements, ids)
    if (event.altKey && alreadySelected && !targets.some((target) => target.type === 'group')) {
      const duplicateIds = editor.duplicate(0)
      const sourceRoots = ids.map((id) => editor.page.elements.find((item) => item.id === id)).filter((item): item is EdonElement => Boolean(item))
      targets = sourceRoots.map((item, index) => ({ ...item, id: duplicateIds[index] }))
      ids = duplicateIds
    }
    capture(event); editor.beginTransaction('Move selection')
    setGesture({ kind: 'move', start: { x: event.clientX, y: event.clientY }, ids, targets: targets.map((target) => ({ ...target })), selectionBounds: boundsOf(targets.filter((target) => ids.includes(target.id))) })
  }

  const handlePointerDown = (event: ReactPointerEvent, handle: ResizeHandle) => {
    event.stopPropagation(); capture(event)
    const targets = descendantsOf(editor.page.elements, editor.selectionIds).map((target) => ({ ...target }))
    const selectionBounds = boundsOf(editor.selectedElements)
    editor.beginTransaction(handle === 'rotate' ? 'Rotate selection' : 'Resize selection')
    if (handle === 'rotate') {
      setGesture({ kind: 'rotate', startAngle: angleFromCenter(event.clientX, event.clientY, selectionBounds, artboardRef.current, editor.zoom), targets, selectionBounds })
    } else setGesture({ kind: 'resize', start: { x: event.clientX, y: event.clientY }, handle, targets, selectionBounds })
  }

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (['eyedropper', 'brush', 'eraser'].includes(editor.tool)) { const rect = event.currentTarget.getBoundingClientRect(); setCursorPoint({ x: event.clientX - rect.left, y: event.clientY - rect.top }) }
    if (!gesture) return
    if (gesture.kind === 'pan') { editor.setPan({ x: gesture.origin.x + event.clientX - gesture.start.x, y: gesture.origin.y + event.clientY - gesture.start.y }); return }
    if (gesture.kind === 'pencil') {
      const point = pointInArtboard(event.clientX, event.clientY)
      if (!point) return
      const previous = gesture.points.at(-1)!
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1.2 / editor.zoom) return
      const stabilizer = editor.artSettings.stabilization / 100 * .72
      const filtered = { x: point.x * (1 - stabilizer) + previous.x * stabilizer, y: point.y * (1 - stabilizer) + previous.y * stabilizer }
      setGesture({ ...gesture, points: [...gesture.points, filtered] }); return
    }
    if (gesture.kind === 'raster') {
      const point = pointInArtboard(event.clientX, event.clientY); if (!point) return
      const previous = gesture.points.at(-1)!; if (Math.hypot(point.x - previous.x, point.y - previous.y) < .75 / editor.zoom) return
      setGesture({ ...gesture, points: [...gesture.points, point] }); return
    }
    if (gesture.kind === 'draw' || gesture.kind === 'marquee') { const point = pointInArtboard(event.clientX, event.clientY); if (point) setGesture({ ...gesture, current: point }); return }
    if (gesture.kind === 'move') {
      let dx = (event.clientX - gesture.start.x) / editor.zoom
      let dy = (event.clientY - gesture.start.y) / editor.zoom
      if (event.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0
        else dx = 0
      }
      const snapped = snapMove(editor.page.elements, gesture.ids, gesture.selectionBounds, dx, dy, 6 / editor.zoom, editor.page.width, editor.page.height)
      setGuides(snapped.guides)
      const origins = new Map(gesture.targets.map((target) => [target.id, target]))
      editor.mutateElements((elements) => elements.map((element) => { const origin = origins.get(element.id); return origin ? { ...element, x: Math.round(origin.x + snapped.dx), y: Math.round(origin.y + snapped.dy) } : element }), true)
      return
    }
    if (gesture.kind === 'resize') {
      const dx = (event.clientX - gesture.start.x) / editor.zoom
      const dy = (event.clientY - gesture.start.y) / editor.zoom
      const nextBounds = resizedBounds(gesture.selectionBounds, gesture.handle, dx, dy, event.shiftKey, event.altKey)
      const origins = new Map(gesture.targets.map((target) => [target.id, target]))
      editor.mutateElements((elements) => elements.map((element) => { const origin = origins.get(element.id); if (!origin) return element; const relX = gesture.selectionBounds.width ? (origin.x - gesture.selectionBounds.x) / gesture.selectionBounds.width : 0; const relY = gesture.selectionBounds.height ? (origin.y - gesture.selectionBounds.y) / gesture.selectionBounds.height : 0; return { ...element, x: nextBounds.x + relX * nextBounds.width, y: nextBounds.y + relY * nextBounds.height, width: Math.max(1, origin.width * nextBounds.width / Math.max(1, gesture.selectionBounds.width)), height: Math.max(1, origin.height * nextBounds.height / Math.max(1, gesture.selectionBounds.height)) } }), true)
      return
    }
    const angle = angleFromCenter(event.clientX, event.clientY, gesture.selectionBounds, artboardRef.current, editor.zoom)
    let delta = angle - gesture.startAngle
    if (event.shiftKey) delta = Math.round(delta / 15) * 15
    const radians = delta * Math.PI / 180
    const origins = new Map(gesture.targets.map((target) => [target.id, target]))
    editor.mutateElements((elements) => elements.map((element) => { const origin = origins.get(element.id); if (!origin) return element; const centerX = origin.x + origin.width / 2; const centerY = origin.y + origin.height / 2; const relX = centerX - gesture.selectionBounds.centerX; const relY = centerY - gesture.selectionBounds.centerY; const rotatedX = relX * Math.cos(radians) - relY * Math.sin(radians); const rotatedY = relX * Math.sin(radians) + relY * Math.cos(radians); return { ...element, x: gesture.selectionBounds.centerX + rotatedX - origin.width / 2, y: gesture.selectionBounds.centerY + rotatedY - origin.height / 2, rotation: origin.rotation + delta } }), true)
  }

  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture) return
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) viewportRef.current.releasePointerCapture(event.pointerId)
    if (gesture.kind === 'draw') createDrawnElement(gesture, editor.addElement)
    else if (gesture.kind === 'pencil' && gesture.points.length > 1) addPencilPath(gesture.points, editor)
    else if (gesture.kind === 'raster' && gesture.points.length) {
      const existing = editor.selectedElement?.type === 'raster' ? editor.selectedElement : gesture.erase ? [...editor.page.elements].reverse().find((element) => element.type === 'raster') ?? null : null
      void createRasterStroke(editor.page, existing, gesture.points, editor.artSettings, gesture.erase).then((element) => { if (existing) editor.updateElement(existing.id, { imageUrl: element.imageUrl }); else editor.addElement(element) })
    }
    else if (gesture.kind === 'marquee') {
      const box = normalizedRect(gesture.start, gesture.current)
      const hits = editor.page.elements.filter((element) => element.type !== 'group' && element.visible && !element.locked && intersects(box, element)).map((element) => element.parentId ?? element.id)
      editor.selectMany(gesture.additive ? [...editor.selectionIds, ...hits] : hits)
    } else if (gesture.kind === 'move' || gesture.kind === 'resize' || gesture.kind === 'rotate') editor.endTransaction()
    if (gesture.kind === 'draw') editor.setTool('select')
    setGesture(null); setGuides([])
  }

  const context = (event: React.MouseEvent, element?: EdonElement) => { event.preventDefault(); event.stopPropagation(); if (element) { const id = element.parentId ?? element.id; if (!editor.selectionIds.includes(id)) editor.select(id) } const rect = viewportRef.current?.getBoundingClientRect(); if (rect) setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top }) }
  const drop = (event: DragEvent) => { event.preventDefault(); const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/')); const point = pointInArtboard(event.clientX, event.clientY); if (!point) return; void Promise.all(files.map((file, index) => imageElementFromFile(file, editor.page, { x: point.x + index * 20, y: point.y + index * 20 }))).then((elements) => elements.forEach(editor.addElement)) }

  const cursor = gesture?.kind === 'pan' ? 'grabbing' : editor.tool === 'hand' || spacePressed ? 'grab' : DRAWABLE_TOOLS.includes(editor.tool as ElementType) || ['pencil', 'pen', 'brush', 'eraser', 'eyedropper', 'fill'].includes(editor.tool) ? 'crosshair' : 'default'
  const preview = gesture?.kind === 'draw' || gesture?.kind === 'marquee' ? normalizedRect(gesture.start, gesture.current) : null
  const elementMap = new Map(editor.page.elements.map((element) => [element.id, element]))

  return <section className="canvas-viewport" ref={viewportRef} style={{ cursor }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onContextMenu={(event) => context(event)} onDragOver={(event) => { if ([...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) event.preventDefault() }} onDrop={drop}>
    <div className="canvas-ruler canvas-ruler-x" /><div className="canvas-ruler canvas-ruler-y" />
    <div className="canvas-stage" style={{ width: editor.page.width * editor.zoom, height: editor.page.height * editor.zoom, transform: `translate(calc(-50% + ${editor.pan.x}px), calc(-50% + ${editor.pan.y}px))` }}>
      <div ref={artboardRef} className={`canvas-artboard ${editor.silhouettePreview ? 'is-silhouette-preview' : ''}`} style={{ width: editor.page.width, height: editor.page.height, background: editor.page.background, transform: `scale(${editor.zoom})` }}>
        {editor.page.elements.map((element) => isHierarchyVisible(element, elementMap) && <CanvasElement key={element.id} element={isHierarchyLocked(element, elementMap) ? { ...element, locked: true } : element} selected={editor.selectionIds.includes(element.id) || Boolean(element.parentId && editor.selectionIds.includes(element.parentId))} editingText={editingTextId === element.id} silhouette={editor.silhouettePreview} onPointerDown={elementPointerDown} onContextMenu={context} onBeginTextEdit={setEditingTextId} onBeginVectorEdit={(id) => { editor.select(id); editor.setVectorEdit(id) }} onTextEdit={(id, text, height) => { editor.updateElement(id, { text, height }); setEditingTextId(null) }} />)}
        {!editor.vectorEditId && editor.tool === 'select' && <SelectionOverlay elements={editor.selectedElements} zoom={editor.zoom} onHandleDown={handlePointerDown} />}
        {editor.vectorEditId && editor.page.elements.find((element) => element.id === editor.vectorEditId)?.vectorNodes && (() => { const element = editor.page.elements.find((item) => item.id === editor.vectorEditId)!; return <VectorEditOverlay element={element} zoom={editor.zoom} onStart={() => editor.beginTransaction('Edit vector path')} onChange={(nodes) => editor.updateElement(element.id, { vectorNodes: nodes, pathData: nodesToPath(nodes, element.closed) }, true)} onEnd={editor.endTransaction} /> })()}
        {preview && <div className={`${gesture?.kind === 'marquee' ? 'marquee-preview' : `draw-preview draw-${gesture?.kind === 'draw' ? gesture.type : ''}`}`} style={{ left: preview.x, top: preview.y, width: preview.width, height: preview.height, borderWidth: 1 / editor.zoom }} />}
        {gesture?.kind === 'pencil' && <svg className="path-drawing-preview" width="100%" height="100%"><polyline points={gesture.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={editor.artSettings.color} strokeWidth={editor.artSettings.size} strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {gesture?.kind === 'raster' && <svg className={`path-drawing-preview ${editor.artSettings.antiAlias ? '' : 'is-pixel'}`} width="100%" height="100%"><polyline points={gesture.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={gesture.erase ? '#ffffff88' : editor.artSettings.color} strokeWidth={editor.artSettings.size} strokeLinecap={editor.artSettings.antiAlias ? 'round' : 'square'} strokeLinejoin="round" /></svg>}
        {penPoints.length > 0 && <svg className="path-drawing-preview" width="100%" height="100%"><polyline points={penPoints.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke={editor.artSettings.color} strokeWidth={Math.max(1, editor.artSettings.size)} strokeLinecap="round" />{penPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={5 / editor.zoom} />)}</svg>}
        {guides.map((guide, index) => <i key={`${guide.axis}-${guide.value}-${index}`} className={`snap-guide guide-${guide.axis}`} style={guide.axis === 'x' ? { left: guide.value, width: 1 / editor.zoom } : { top: guide.value, height: 1 / editor.zoom }} />)}
      </div>
    </div>
    {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)} />}
    {editor.tool === 'eyedropper' && cursorPoint && <div className="eyedropper-cursor-preview" style={{ left: cursorPoint.x + 14, top: cursorPoint.y + 14, background: editor.artSettings.color }} />}
    {(editor.tool === 'brush' || editor.tool === 'eraser') && cursorPoint && !gesture && <div className="brush-cursor-preview" style={{ left: cursorPoint.x, top: cursorPoint.y, width: editor.artSettings.size * editor.zoom, height: editor.artSettings.size * editor.zoom }} />}
    {notice && <div className="canvas-notice">{notice}</div>}
    <div className="canvas-status"><span>{editor.tool === 'select' ? <MousePointer2 size={12} /> : editor.tool === 'hand' ? <Move size={12} /> : <Crosshair size={12} />}{editor.tool}</span><span>{editor.page.width} × {editor.page.height}</span>{editor.selectionIds.length > 1 && <span>{editor.selectionIds.length} selected</span>}</div>
  </section>
}

function createDrawnElement(gesture: Extract<Gesture, { kind: 'draw' }>, add: (element: EdonElement) => void) {
  if (gesture.type === 'line' || gesture.type === 'arrow') {
    const dx = gesture.current.x - gesture.start.x; const dy = gesture.current.y - gesture.start.y; const length = Math.hypot(dx, dy)
    if (length > 3) add({ ...createElement(gesture.type, gesture.start.x, gesture.start.y - 12, length, 24), rotation: Math.atan2(dy, dx) * 180 / Math.PI })
    return
  }
  const box = normalizedRect(gesture.start, gesture.current)
  if (box.width > 3 && box.height > 3) add(createElement(gesture.type, box.x, box.y, box.width, box.height))
}

function addPencilPath(points: VectorPoint[], editor: ReturnType<typeof useEditor>) {
  const fitted = fitPath(points, editor.artSettings.smoothing, editor.artSettings.simplify)
  const element = createElement('path', fitted.x, fitted.y, fitted.width, fitted.height)
  element.name = `${editor.artSettings.brushPreset[0].toUpperCase()}${editor.artSettings.brushPreset.slice(1)} stroke`
  element.fill = '#00000000'
  element.fillPaint = { type: 'solid', color: '#00000000' }
  element.stroke = editor.artSettings.color
  element.strokeWidth = editor.artSettings.size
  element.opacity = editor.artSettings.opacity
  element.strokeOpacity = editor.artSettings.opacity
  element.pathData = fitted.pathData
  element.vectorNodes = fitted.nodes
  element.sourcePoints = fitted.sourcePoints
  element.closed = false
  element.brushPreset = editor.artSettings.brushPreset
  element.smoothing = editor.artSettings.smoothing
  element.stabilization = editor.artSettings.stabilization
  editor.addElement(element)
  editor.rememberColor(editor.artSettings.color)
}

function addPenPath(points: VectorPoint[], closed: boolean, editor: ReturnType<typeof useEditor>) {
  const minX = Math.min(...points.map((point) => point.x)); const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x)); const maxY = Math.max(...points.map((point) => point.y))
  const local = points.map((point) => ({ x: point.x - minX, y: point.y - minY }))
  const nodes = pointsToNodes(local, 0)
  const element = createElement('path', minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY))
  element.name = closed ? 'Pen shape' : 'Pen path'
  element.fill = closed ? editor.artSettings.color : '#00000000'
  element.fillPaint = { type: 'solid', color: element.fill }
  element.stroke = editor.artSettings.color
  element.strokeWidth = editor.artSettings.size
  element.pathData = nodesToPath(nodes, closed)
  element.vectorNodes = nodes
  element.closed = closed
  editor.addElement(element)
  editor.setTool('select')
  editor.setVectorEdit(element.id)
}

function resizedBounds(bounds: Bounds, handle: Exclude<ResizeHandle, 'rotate'>, dx: number, dy: number, constrain: boolean, centered: boolean): Bounds {
  let left = bounds.x; let top = bounds.y; let right = bounds.right; let bottom = bounds.bottom
  if (handle.includes('w')) left += dx; if (handle.includes('e')) right += dx; if (handle.includes('n')) top += dy; if (handle.includes('s')) bottom += dy
  if (centered) { if (handle.includes('w')) right -= dx; if (handle.includes('e')) left -= dx; if (handle.includes('n')) bottom -= dy; if (handle.includes('s')) top -= dy }
  if (constrain && handle.length === 2) {
    const ratio = bounds.width / Math.max(1, bounds.height); const width = right - left; const height = bottom - top
    if (Math.abs(width - bounds.width) > Math.abs(height - bounds.height)) { const nextHeight = width / ratio; if (handle.includes('n')) top = bottom - nextHeight; else bottom = top + nextHeight }
    else { const nextWidth = height * ratio; if (handle.includes('w')) left = right - nextWidth; else right = left + nextWidth }
  }
  if (right - left < 4) { if (handle.includes('w')) left = right - 4; else right = left + 4 }
  if (bottom - top < 4) { if (handle.includes('n')) top = bottom - 4; else bottom = top + 4 }
  return { x: left, y: top, width: right - left, height: bottom - top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 }
}

function snapMove(elements: EdonElement[], movingIds: string[], bounds: Bounds, dx: number, dy: number, tolerance: number, pageWidth: number, pageHeight: number): { dx: number; dy: number; guides: Guide[] } {
  const ignored = new Set(descendantsOf(elements, movingIds).map((element) => element.id)); const guides: Guide[] = []
  const xTargets = [0, pageWidth / 2, pageWidth, ...elements.filter((element) => !ignored.has(element.id) && element.visible).flatMap((element) => [element.x, element.x + element.width / 2, element.x + element.width])]
  const yTargets = [0, pageHeight / 2, pageHeight, ...elements.filter((element) => !ignored.has(element.id) && element.visible).flatMap((element) => [element.y, element.y + element.height / 2, element.y + element.height])]
  const movedX = [bounds.x + dx, bounds.centerX + dx, bounds.right + dx]; const movedY = [bounds.y + dy, bounds.centerY + dy, bounds.bottom + dy]
  const snapX = closestSnap(movedX, xTargets, tolerance); const snapY = closestSnap(movedY, yTargets, tolerance)
  if (snapX) { dx += snapX.delta; guides.push({ axis: 'x', value: snapX.target }) }
  if (snapY) { dy += snapY.delta; guides.push({ axis: 'y', value: snapY.target }) }
  return { dx, dy, guides }
}

function closestSnap(values: number[], targets: number[], tolerance: number): { delta: number; target: number } | null { let best: { delta: number; target: number } | null = null; for (const value of values) for (const target of targets) { const delta = target - value; if (Math.abs(delta) <= tolerance && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta, target } } return best }
function angleFromCenter(clientX: number, clientY: number, bounds: Bounds, artboard: HTMLDivElement | null, zoom: number): number { const rect = artboard?.getBoundingClientRect(); if (!rect) return 0; const centerX = rect.left + bounds.centerX * zoom; const centerY = rect.top + bounds.centerY * zoom; return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI + 90 }
function normalizedRect(a: Point, b: Point) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) } }
function intersects(box: { x: number; y: number; width: number; height: number }, element: EdonElement) { return element.x < box.x + box.width && element.x + element.width > box.x && element.y < box.y + box.height && element.y + element.height > box.y }
function isTyping(target: EventTarget | null) { return target instanceof HTMLElement && target.matches('input, textarea, [contenteditable="true"]') }
function isHierarchyVisible(element: EdonElement, elements: Map<string, EdonElement>): boolean { let current: EdonElement | undefined = element; while (current) { if (!current.visible) return false; current = current.parentId ? elements.get(current.parentId) : undefined } return true }
function isHierarchyLocked(element: EdonElement, elements: Map<string, EdonElement>): boolean { let current: EdonElement | undefined = element; while (current) { if (current.locked) return true; current = current.parentId ? elements.get(current.parentId) : undefined } return false }
