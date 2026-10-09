import { useState } from 'react'
import { CustomSelect } from '../ui/CustomSelect'
import type { EdonElement, VectorNode } from '../model/document'
import { nodesToPath, updateHandle, updateNode } from './vector-path'
import { useEditor } from './editor-state'

export function VectorProperties({element}:{element:EdonElement}) {
 const editor=useEditor()
 const [index,setIndex]=useState(0)
 const nodes=element.vectorNodes??[]
 const selected=Math.min(index,nodes.length-1),node=nodes[selected]
 if(!node)return null
 const save=(next:VectorNode[])=>editor.updateElement(element.id,{vectorNodes:next,pathData:nodesToPath(next,element.closed)})
 const field=(label:string,value:number,onChange:(value:number)=>void)=><label className="property-input"><span>{label}</span><input aria-label={`Node ${label}`} type="number" step="0.1" value={Number(value.toFixed(2))} onChange={event=>{const value=Number(event.target.value);if(Number.isFinite(value))onChange(value)}}/></label>
 return <details className="property-section" open><summary>Vector points</summary><div className="vector-node-controls"><CustomSelect aria-label="Vector point" value={String(selected)} onChange={event=>setIndex(Number(event.target.value))}>{nodes.map((node,index)=><option key={node.id} value={index}>Point {index+1}</option>)}</CustomSelect><div className="property-grid">{field('X',node.x,x=>save(updateNode(nodes,node.id,{x,y:node.y})))}{field('Y',node.y,y=>save(updateNode(nodes,node.id,{x:node.x,y})))}</div><CustomSelect aria-label="Point type" value={node.kind} onChange={event=>save(nodes.map(item=>item.id!==node.id?item:event.target.value==='corner'?{...item,kind:'corner',in:undefined,out:undefined}:{...item,kind:'smooth',in:{x:item.x-20,y:item.y},out:{x:item.x+20,y:item.y}}))}><option value="corner">Corner</option><option value="smooth">Smooth curve</option></CustomSelect>{(['in','out'] as const).map(handle=>node[handle]&&<div className="property-grid" key={handle}>{field(`${handle} X`,node[handle]!.x,x=>save(updateHandle(nodes,node.id,handle,{x,y:node[handle]!.y})))}{field(`${handle} Y`,node[handle]!.y,y=>save(updateHandle(nodes,node.id,handle,{x:node[handle]!.x,y})))}</div>)}<button className="auto-enhance" onClick={()=>editor.setVectorEdit(editor.vectorEditId===element.id?null:element.id)}>{editor.vectorEditId===element.id?'Finish point editing':'Edit points on canvas'}</button><p className="tool-hint">Shift locks an axis. Alt gives fine control and separates curve handles.</p></div></details>
}
