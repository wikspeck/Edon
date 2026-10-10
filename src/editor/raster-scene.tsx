import { resolveVectorFills } from './vector-fill'
import { renderToStaticMarkup } from 'react-dom/server'
import type { EdonElement } from '../model/document'
import { CanvasElement } from './CanvasElement'
import { ImageOutline } from './ImageOutline'
import { MaskDefinition } from './MaskDefinition'

// The raster export uses the same element component as the interactive canvas.
// Editor decorations are omitted; appearance and stacking stay shared.
export function serializeRasterScene(elements:EdonElement[],scope:{x:number;y:number;width:number;height:number},background?:string):string {
 elements=resolveVectorFills(elements)
 const noop=()=>{}
 const content=renderToStaticMarkup(<div style={{position:'relative',width:scope.width,height:scope.height,overflow:'hidden',background:background??'transparent',isolation:'isolate'}}><style>{`*{box-sizing:border-box}.canvas-element{position:absolute;transform-origin:center}.canvas-element.type-text{display:flex;align-items:flex-start;white-space:pre-wrap;overflow:hidden}.canvas-text-content{display:block;width:100%;overflow-wrap:break-word}.canvas-text-content p{margin:0}.canvas-text-content ul,.canvas-text-content ol{margin:0;padding-left:1.4em}.canvas-element svg{display:block;overflow:visible}.effect-definitions,.image-outline-definitions{position:absolute;width:0;height:0;overflow:hidden}`}</style>{elements.map(element=><MaskDefinition key={`m-${element.id}`} element={element}/>)}{elements.map(element=><ImageOutline key={`f-${element.id}`} element={element}/>)}{elements.map(element=><CanvasElement key={element.id} element={{...element,x:element.x-scope.x,y:element.y-scope.y}} selected={false} editingText={false} silhouette={false} exportMode onPointerDown={noop} onContextMenu={noop} onTextEdit={noop} onBeginTextEdit={noop} onBeginVectorEdit={noop}/>)}</div>)
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${scope.width}" height="${scope.height}" viewBox="0 0 ${scope.width} ${scope.height}"><foreignObject width="100%" height="100%">${content.replace('<div','<div xmlns="http://www.w3.org/1999/xhtml"').replace(/<svg /g,'<svg xmlns="http://www.w3.org/2000/svg" ').replace(/<br>/g,'<br/>').replace(/<img([^>]*?)(?<!\/)\s*>/g,'<img$1/>')}</foreignObject></svg>`
}
