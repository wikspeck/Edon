import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { EdonElement, VectorNode } from '../model/document'
import { nodesToPath, updateNode } from './vector-path'

export function VectorEditOverlay({ element, zoom, onChange, onStart, onEnd }: { element: EdonElement; zoom: number; onChange: (nodes: VectorNode[]) => void; onStart: () => void; onEnd: () => void }) {
  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; nodes: VectorNode[] } | null>(null)
  if (!element.vectorNodes?.length) return null
  const down = (event: ReactPointerEvent, id: string) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    onStart()
    setDrag({ id, startX: event.clientX, startY: event.clientY, nodes: structuredClone(element.vectorNodes!) })
  }
  const move = (event: ReactPointerEvent) => {
    if (!drag) return
    const source = drag.nodes.find((node) => node.id === drag.id)!
    onChange(updateNode(drag.nodes, drag.id, { x: source.x + (event.clientX - drag.startX) / zoom, y: source.y + (event.clientY - drag.startY) / zoom }))
  }
  const up = (event: ReactPointerEvent) => {
    if (!drag) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    onEnd()
    setDrag(null)
  }
  return <svg className="vector-edit-overlay" style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: `rotate(${element.rotation}deg) scale(${element.scaleX}, ${element.scaleY})` }} viewBox={`0 0 ${element.width} ${element.height}`} overflow="visible">
    <path d={nodesToPath(element.vectorNodes, element.closed)} />
    {element.vectorNodes.flatMap((node) => [
      node.in && <line key={`${node.id}-in-line`} x1={node.x} y1={node.y} x2={node.in.x} y2={node.in.y} />,
      node.out && <line key={`${node.id}-out-line`} x1={node.x} y1={node.y} x2={node.out.x} y2={node.out.y} />,
      node.in && <circle key={`${node.id}-in`} className="vector-handle" cx={node.in.x} cy={node.in.y} r={3.5 / zoom} />,
      node.out && <circle key={`${node.id}-out`} className="vector-handle" cx={node.out.x} cy={node.out.y} r={3.5 / zoom} />,
      <circle key={node.id} className="vector-node" cx={node.x} cy={node.y} r={5 / zoom} onPointerDown={(event) => down(event, node.id)} onPointerMove={move} onPointerUp={up} />,
    ])}
  </svg>
}
