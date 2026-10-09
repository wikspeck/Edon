import { useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { EdonElement, VectorNode } from '../model/document'
import { nodesToPath, updateNode, updateHandle, vectorDragDelta } from './vector-path'

export function VectorEditOverlay({ element, zoom, onChange, onStart, onEnd }: { element: EdonElement; zoom: number; onChange: (nodes: VectorNode[]) => void; onStart: () => void; onEnd: () => void }) {
 const [drag,setDrag]=useState<{id:string; handle?:'in'|'out';startX:number;startY:number;nodes:VectorNode[]}|null>(null)
 if(!element.vectorNodes?.length)return null
 const down=(event:ReactPointerEvent,id:string,handle?:'in'|'out')=>{event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);onStart();setDrag({id,handle,startX:event.clientX,startY:event.clientY,nodes:structuredClone(element.vectorNodes!)})}
 const move=(event:ReactPointerEvent)=>{
  if(!drag)return
  const source=drag.nodes.find(node=>node.id===drag.id)!
  const delta=vectorDragDelta(event.clientX-drag.startX,event.clientY-drag.startY,zoom,element.rotation,element.scaleX,element.scaleY,event.altKey?.1:1)
  if(event.shiftKey){if(Math.abs(delta.x)>Math.abs(delta.y))delta.y=0;else delta.x=0}
  const point=drag.handle?source[drag.handle]!:source
  const target={x:point.x+delta.x,y:point.y+delta.y}
  onChange(drag.handle?updateHandle(drag.nodes,drag.id,drag.handle,target,!event.altKey):updateNode(drag.nodes,drag.id,target))
 }
 const finish=(event:ReactPointerEvent)=>{if(!drag)return;setDrag(null);onEnd();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 const interaction={onPointerMove:move,onPointerUp:finish,onPointerCancel:finish,onLostPointerCapture:finish}
 return <svg className="vector-edit-overlay" style={{left:element.x,top:element.y,width:element.width,height:element.height,transform:`rotate(${element.rotation}deg) scale(${element.scaleX}, ${element.scaleY})`}} viewBox={`0 0 ${element.width} ${element.height}`} overflow="visible">
 <path d={nodesToPath(element.vectorNodes,element.closed)}/>
 {element.vectorNodes.flatMap(node=>[
  node.in&&<line key={`${node.id}-il`} x1={node.x} y1={node.y} x2={node.in.x} y2={node.in.y}/>,
  node.out&&<line key={`${node.id}-ol`} x1={node.x} y1={node.y} x2={node.out.x} y2={node.out.y}/>,
  node.in&&<circle key={`${node.id}-i`} className="vector-handle" cx={node.in.x} cy={node.in.y} r={4/zoom} onPointerDown={event=>down(event,node.id,'in')} {...interaction}/>,
  node.out&&<circle key={`${node.id}-o`} className="vector-handle" cx={node.out.x} cy={node.out.y} r={4/zoom} onPointerDown={event=>down(event,node.id,'out')} {...interaction}/>,
  <circle key={node.id} className="vector-node" cx={node.x} cy={node.y} r={5/zoom} onPointerDown={event=>down(event,node.id)} {...interaction}/>
 ])}</svg>
}
