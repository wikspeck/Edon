import { createId, type VectorNode, type VectorPoint } from '../model/document'

const distanceToSegment = (point: VectorPoint, start: VectorPoint, end: VectorPoint) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (!dx && !dy) return Math.hypot(point.x - start.x, point.y - start.y)
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t))
}

export function simplifyPoints(points: VectorPoint[], tolerance: number): VectorPoint[] {
  if (points.length < 3 || tolerance <= 0) return points
  let furthest = 0
  let index = 0
  for (let current = 1; current < points.length - 1; current += 1) {
    const distance = distanceToSegment(points[current], points[0], points.at(-1)!)
    if (distance > furthest) { furthest = distance; index = current }
  }
  if (furthest <= tolerance) return [points[0], points.at(-1)!]
  const left = simplifyPoints(points.slice(0, index + 1), tolerance)
  const right = simplifyPoints(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

export function pointsToNodes(points: VectorPoint[], smoothing: number): VectorNode[] {
  const strength = Math.max(0, Math.min(1, smoothing / 100)) / 3
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const dx = (next.x - previous.x) * strength
    const dy = (next.y - previous.y) * strength
    return { id: createId('node'), x: point.x, y: point.y, kind: strength ? 'smooth' : 'corner', ...(strength ? { in: { x: point.x - dx, y: point.y - dy }, out: { x: point.x + dx, y: point.y + dy } } : {}) }
  })
}

export function nodesToPath(nodes: VectorNode[], closed = false): string {
  if (!nodes.length) return ''
  let path = `M ${round(nodes[0].x)} ${round(nodes[0].y)}`
  for (let index = 1; index < nodes.length; index += 1) {
    const previous = nodes[index - 1]
    const node = nodes[index]
    path += previous.out || node.in
      ? ` C ${round(previous.out?.x ?? previous.x)} ${round(previous.out?.y ?? previous.y)} ${round(node.in?.x ?? node.x)} ${round(node.in?.y ?? node.y)} ${round(node.x)} ${round(node.y)}`
      : ` L ${round(node.x)} ${round(node.y)}`
  }
  if (closed && nodes.length > 2) {
    const last = nodes.at(-1)!
    const first = nodes[0]
    path += last.out || first.in
      ? ` C ${round(last.out?.x ?? last.x)} ${round(last.out?.y ?? last.y)} ${round(first.in?.x ?? first.x)} ${round(first.in?.y ?? first.y)} ${round(first.x)} ${round(first.y)} Z`
      : ' Z'
  }
  return path
}

export function fitPath(points: VectorPoint[], smoothing: number, simplify: number) {
  const simplified = simplifyPoints(points, .3 + simplify * .08)
  const minX = Math.min(...simplified.map((point) => point.x))
  const minY = Math.min(...simplified.map((point) => point.y))
  const maxX = Math.max(...simplified.map((point) => point.x))
  const maxY = Math.max(...simplified.map((point) => point.y))
  const local = simplified.map((point) => ({ x: point.x - minX, y: point.y - minY }))
  const nodes = pointsToNodes(local, smoothing)
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY), nodes, pathData: nodesToPath(nodes), sourcePoints: points.map((point) => ({ x: point.x - minX, y: point.y - minY })) }
}

export function updateNode(nodes: VectorNode[], id: string, point: VectorPoint): VectorNode[] {
  return nodes.map((node) => {
    if (node.id !== id) return node
    const dx = point.x - node.x
    const dy = point.y - node.y
    return { ...node, x: point.x, y: point.y, in: node.in ? { x: node.in.x + dx, y: node.in.y + dy } : undefined, out: node.out ? { x: node.out.x + dx, y: node.out.y + dy } : undefined }
  })
}

const round = (value: number) => Number(value.toFixed(2))

export function vectorDragDelta(dx: number, dy: number, zoom: number, rotation: number, scaleX: number, scaleY: number, precision = 1): VectorPoint {
 const angle=-rotation*Math.PI/180
 return {x:(dx*Math.cos(angle)-dy*Math.sin(angle))/zoom/(scaleX||1)*precision,y:(dx*Math.sin(angle)+dy*Math.cos(angle))/zoom/(scaleY||1)*precision}
}
export function updateHandle(nodes: VectorNode[], id: string, handle: 'in'|'out', point: VectorPoint, linked = true): VectorNode[] {
 return nodes.map(node=>{
  if(node.id!==id)return node
  const opposite=handle==='in'?'out':'in'
  const other=node[opposite]
  if(!linked||node.kind!=='smooth'||!other)return {...node,[handle]:point}
  const dx=point.x-node.x,dy=point.y-node.y,length=Math.hypot(dx,dy)
  const ratio=length?Math.hypot(other.x-node.x,other.y-node.y)/length:0
  return {...node,[handle]:point,[opposite]:{x:node.x-dx*ratio,y:node.y-dy*ratio}}
 })
}

export function nodesFromPathData(path: string): VectorNode[] | undefined {
 if((path.match(/M/g)??[]).length!==1 || /[a-zASTQ]/.test(path)) return undefined
 const tokens=path.match(/[MLHVCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)??[]
 const nodes:VectorNode[]=[];let command='',index=0,x=0,y=0
 const number=()=>Number(tokens[index++])
 while(index<tokens.length){
  if(/^[A-Z]$/.test(tokens[index]))command=tokens[index++]
  if(command==='Z')break
  if(command==='C'){
   const out={x:number(),y:number()},incoming={x:number(),y:number()};x=number();y=number()
   if(!nodes.length)return undefined
   nodes[nodes.length-1].out=out
   nodes.push({id:createId('node'),x,y,kind:'smooth',in:incoming})
  }else if(['M','L','H','V'].includes(command)){
   if(command==='H')x=number();else if(command==='V')y=number();else{x=number();y=number()}
   nodes.push({id:createId('node'),x,y,kind:'corner'});if(command==='M')command='L'
  }else return undefined
 }
 if(nodes.length>1 && nodes.at(-1)!.x===nodes[0].x&&nodes.at(-1)!.y===nodes[0].y){nodes[0].in=nodes.pop()!.in;nodes[0].kind=nodes[0].in?'smooth':nodes[0].kind}
 return nodes
}

export function resizeVectorElement(element: import('../model/document').EdonElement, patch: Partial<import('../model/document').EdonElement>): import('../model/document').EdonElement {
 const result={...element,...patch}
 if(element.type!=='path'||patch.pathData!==undefined||patch.vectorNodes!==undefined||(!('width' in patch)&&!('height' in patch)))return result
 const sx=result.width/element.width,sy=result.height/element.height
 const point=(p:VectorPoint)=>({x:p.x*sx,y:p.y*sy})
 if(element.vectorNodes){result.vectorNodes=element.vectorNodes.map(node=>({...node,...point(node),in:node.in?point(node.in):undefined,out:node.out?point(node.out):undefined}));result.pathData=nodesToPath(result.vectorNodes,result.closed)}
 else if(element.pathData)result.pathData=element.pathData.replace(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi,(_segment,command:string,coordinates:string)=>{
  const kind=command.toUpperCase();let index=0
  return command+coordinates.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi,number=>{
   const current=index++;let factor=kind==='H'?sx:kind==='V'?sy:current%2?sy:sx
   if(kind==='A'){const position=current%7;factor=position===0||position===5?sx:position===1||position===6?sy:1}
   return String(Number((Number(number)*factor).toFixed(5)))
  })
 })
 if(element.sourcePoints)result.sourcePoints=element.sourcePoints.map(point)
 return result
}
