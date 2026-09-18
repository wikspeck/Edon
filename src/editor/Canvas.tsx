import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import { Crosshair, Move, MousePointer2 } from 'lucide-react'
import { createElement, type EdonElement, type ElementType } from '../model/document'
import { DRAWABLE_TOOLS, useEditor } from './editor-state'

type Point = { x: number; y: number }
type Gesture =
  | { kind: 'draw'; start: Point; current: Point; type: Exclude<ElementType, 'image'> }
  | { kind: 'move'; id: string; start: Point; origin: Point }
  | { kind: 'resize'; id: string; start: Point; origin: { width: number; height: number } }
  | { kind: 'pan'; start: Point; origin: Point }

export function Canvas() {
  const { page, tool, zoom, pan, selectedId, selectedElement, setZoom, setPan, select, setTool, addElement, updateElement, beginTransaction, endTransaction } = useEditor()
  const viewportRef = useRef<HTMLDivElement>(null)
  const artboardRef = useRef<HTMLDivElement>(null)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)

  useEffect(() => {
    const down = (event: KeyboardEvent) => event.code === 'Space' && setSpacePressed(true)
    const up = (event: KeyboardEvent) => event.code === 'Space' && setSpacePressed(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const pointInArtboard = (clientX: number, clientY: number): Point | null => {
    const rect = artboardRef.current?.getBoundingClientRect()
    if (!rect || clientX < rect.left || clientY < rect.top || clientX > rect.right || clientY > rect.bottom) return null
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom }
  }

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 1 || tool === 'hand' || spacePressed) {
      event.currentTarget.setPointerCapture(event.pointerId)
      setGesture({ kind: 'pan', start: { x: event.clientX, y: event.clientY }, origin: pan })
      return
    }
    const point = pointInArtboard(event.clientX, event.clientY)
    if (!point) { select(null); return }
    if (tool === 'select') { select(null); return }
    if (!DRAWABLE_TOOLS.includes(tool as ElementType)) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === 'text') {
      addElement(createElement('text', point.x, point.y))
      setTool('select')
      return
    }
    setGesture({ kind: 'draw', start: point, current: point, type: tool as Exclude<ElementType, 'image' | 'text'> })
  }

  const elementPointerDown = (event: ReactPointerEvent, element: EdonElement) => {
    if (tool !== 'select' || element.locked) return
    event.stopPropagation()
    viewportRef.current?.setPointerCapture(event.pointerId)
    select(element.id)
    beginTransaction()
    setGesture({ kind: 'move', id: element.id, start: { x: event.clientX, y: event.clientY }, origin: { x: element.x, y: element.y } })
  }

  const resizePointerDown = (event: ReactPointerEvent) => {
    if (!selectedElement || selectedElement.locked) return
    event.stopPropagation()
    viewportRef.current?.setPointerCapture(event.pointerId)
    beginTransaction()
    setGesture({ kind: 'resize', id: selectedElement.id, start: { x: event.clientX, y: event.clientY }, origin: { width: selectedElement.width, height: selectedElement.height } })
  }

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture) return
    if (gesture.kind === 'pan') {
      setPan({ x: gesture.origin.x + event.clientX - gesture.start.x, y: gesture.origin.y + event.clientY - gesture.start.y })
      return
    }
    if (gesture.kind === 'draw') {
      const point = pointInArtboard(event.clientX, event.clientY)
      if (point) setGesture({ ...gesture, current: point })
      return
    }
    if (gesture.kind === 'move') {
      updateElement(gesture.id, {
        x: Math.round(gesture.origin.x + (event.clientX - gesture.start.x) / zoom),
        y: Math.round(gesture.origin.y + (event.clientY - gesture.start.y) / zoom),
      }, true)
      return
    }
    updateElement(gesture.id, {
      width: Math.max(4, Math.round(gesture.origin.width + (event.clientX - gesture.start.x) / zoom)),
      height: Math.max(4, Math.round(gesture.origin.height + (event.clientY - gesture.start.y) / zoom)),
    }, true)
  }

  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!gesture) return
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) viewportRef.current.releasePointerCapture(event.pointerId)
    if (gesture.kind === 'draw') {
      const x = Math.min(gesture.start.x, gesture.current.x)
      const y = Math.min(gesture.start.y, gesture.current.y)
      const width = Math.abs(gesture.current.x - gesture.start.x)
      const height = Math.abs(gesture.current.y - gesture.start.y)
      if (width > 3 && height > 3) addElement(createElement(gesture.type, x, y, width, height))
      setTool('select')
    } else if (gesture.kind === 'move' || gesture.kind === 'resize') {
      endTransaction()
    }
    setGesture(null)
  }

  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    setZoom(zoom * (event.deltaY > 0 ? 0.9 : 1.1))
  }

  const cursor = gesture?.kind === 'pan' ? 'grabbing' : tool === 'hand' || spacePressed ? 'grab' : DRAWABLE_TOOLS.includes(tool as ElementType) ? 'crosshair' : 'default'
  const drawRect = gesture?.kind === 'draw' ? normalizeRect(gesture.start, gesture.current) : null

  return (
    <section className="canvas-viewport" ref={viewportRef} style={{ cursor }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel}>
      <div className="canvas-ruler canvas-ruler-x" /><div className="canvas-ruler canvas-ruler-y" />
      <div className="canvas-stage" style={{ width: page.width * zoom, height: page.height * zoom, transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))` }}>
        <div ref={artboardRef} className="canvas-artboard" style={{ width: page.width, height: page.height, background: page.background, transform: `scale(${zoom})` }}>
          {page.elements.map((element) => element.visible && <CanvasElement key={element.id} element={element} selected={element.id === selectedId} zoom={zoom} onPointerDown={elementPointerDown} onResizePointerDown={resizePointerDown} />)}
          {drawRect && <div className={`draw-preview draw-${gesture?.kind === 'draw' ? gesture.type : ''}`} style={{ left: drawRect.x, top: drawRect.y, width: drawRect.width, height: drawRect.height, borderWidth: 1 / zoom }} />}
        </div>
      </div>
      <div className="canvas-status"><span>{tool === 'select' ? <MousePointer2 size={12} /> : tool === 'hand' ? <Move size={12} /> : <Crosshair size={12} />}{tool}</span><span>{page.width} × {page.height}</span></div>
    </section>
  )
}

function CanvasElement({ element, selected, zoom, onPointerDown, onResizePointerDown }: { element: EdonElement; selected: boolean; zoom: number; onPointerDown: (event: ReactPointerEvent, element: EdonElement) => void; onResizePointerDown: (event: ReactPointerEvent) => void }) {
  const style: CSSProperties = {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    opacity: element.opacity,
    transform: `rotate(${element.rotation}deg)`,
    background: element.type === 'image' ? undefined : element.fill,
    border: `${element.strokeWidth}px solid ${element.stroke}`,
    borderRadius: element.type === 'ellipse' ? '50%' : element.cornerRadius,
    color: element.fill,
  }
  return <div className={`canvas-element type-${element.type} ${selected ? 'is-selected' : ''} ${element.locked ? 'is-locked' : ''}`} style={style} onPointerDown={(event) => onPointerDown(event, element)}>
    {element.type === 'text' && <span style={{ fontFamily: element.fontFamily, fontSize: element.fontSize, fontWeight: element.fontWeight, textAlign: element.textAlign, lineHeight: element.lineHeight, letterSpacing: element.letterSpacing }}>{element.text}</span>}
    {element.type === 'image' && element.imageUrl && <img src={element.imageUrl} alt="" draggable={false} />}
    {selected && <div className="selection-outline" style={{ borderWidth: 1 / zoom }}><i className="handle nw" style={handleStyle(zoom)} /><i className="handle ne" style={handleStyle(zoom)} /><i className="handle sw" style={handleStyle(zoom)} /><i className="handle se" style={handleStyle(zoom)} onPointerDown={onResizePointerDown} /></div>}
  </div>
}

const handleStyle = (zoom: number): CSSProperties => ({ width: 8 / zoom, height: 8 / zoom, borderWidth: 1 / zoom })
const normalizeRect = (a: Point, b: Point) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) })
