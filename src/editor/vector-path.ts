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
