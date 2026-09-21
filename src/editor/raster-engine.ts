import { createElement, type EdonElement, type EdonPage, type VectorPoint } from '../model/document'
import { polygonPoints } from './rendering'
import type { ArtToolSettings, GapClosing } from './editor-state'
import { flattenRenderOrder } from './scene-tree'

export interface BucketResult { element: EdonElement | null; reason?: string; pixelCount: number }

export async function createRasterStroke(page: EdonPage, existing: EdonElement | null, points: VectorPoint[], settings: ArtToolSettings, erase = false): Promise<EdonElement | null> {
  const canvas = document.createElement('canvas'); canvas.width = page.width; canvas.height = page.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  if (existing?.imageUrl) drawRasterLayer(context, await loadImage(existing.imageUrl), existing)
  renderRasterStroke(context, points, settings, erase)
  const cropped = cropTransparentCanvas(canvas)
  if (!cropped) return null
  const element = existing ? { ...existing } : createElement('raster', cropped.x, cropped.y, cropped.width, cropped.height)
  element.x = cropped.x; element.y = cropped.y; element.width = cropped.width; element.height = cropped.height
  element.rotation = 0; element.scaleX = 1; element.scaleY = 1
  element.name = existing?.name ?? 'Brush Stroke'
  element.imageUrl = cropped.canvas.toDataURL('image/png')
  element.fill = '#00000000'; element.fillPaint = { type: 'solid', color: '#00000000' }; element.stroke = '#00000000'; element.strokeWidth = 0
  return element
}

export function renderRasterStroke(context: CanvasRenderingContext2D, points: VectorPoint[], settings: ArtToolSettings, erase = false) {
  if (!points.length) return
  context.save()
  context.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
  const color = parseHex(settings.color); context.fillStyle = `rgba(${color.r},${color.g},${color.b},${settings.opacity * color.a})`; context.strokeStyle = context.fillStyle
  const radius = Math.max(.5, settings.size / 2)
  if (settings.antiAlias) {
    if (settings.hardness >= 98) {
      context.lineCap = 'round'; context.lineJoin = 'round'; context.lineWidth = settings.size
      context.beginPath(); context.moveTo(points[0].x, points[0].y); for (const point of points.slice(1)) context.lineTo(point.x, point.y); context.stroke()
    } else {
      const opacity = settings.opacity * color.a
      forEachStamp(points, Math.max(.5, radius * .2), (x, y) => {
        const gradient = context.createRadialGradient(x, y, radius * settings.hardness / 100, x, y, radius)
        gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${opacity})`)
        gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`)
        context.fillStyle = gradient; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill()
      })
    }
  } else {
    forEachStamp(points, Math.max(1, radius * .35), (x, y) => stampHardCircle(context, Math.round(x), Math.round(y), Math.max(1, Math.round(radius))))
  }
  context.restore()
}

export function drawRasterLayer(context: CanvasRenderingContext2D, image: CanvasImageSource, element: EdonElement) {
  context.save(); context.translate(element.x + element.width / 2, element.y + element.height / 2); context.rotate(element.rotation * Math.PI / 180); context.scale(element.scaleX, element.scaleY); context.drawImage(image, -element.width / 2, -element.height / 2, element.width, element.height); context.restore()
}

export async function paintEnclosedRegion(page: EdonPage, point: VectorPoint, settings: ArtToolSettings): Promise<BucketResult> {
  const boundaryCanvas = document.createElement('canvas'); boundaryCanvas.width = page.width; boundaryCanvas.height = page.height
  const context = boundaryCanvas.getContext('2d', { willReadFrequently: true })!
  await renderElements(context, flattenRenderOrder(page.elements).filter((element) => hierarchyVisible(page.elements, element)), false)
  const source = context.getImageData(0, 0, page.width, page.height)
  const threshold = Math.max(8, 255 - settings.fillTolerance * 3)
  let boundary: Uint8Array<ArrayBufferLike> = new Uint8Array(page.width * page.height)
  for (let index = 0; index < boundary.length; index += 1) boundary[index] = source.data[index * 4 + 3] >= threshold ? 1 : 0
  boundary = dilate(boundary, page.width, page.height, gapRadius(settings.gapClosing))
  const seed = nearestOpenPixel(boundary, page.width, page.height, Math.round(point.x), Math.round(point.y))
  if (!seed) return { element: null, reason: 'No open region was found at that point.', pixelCount: 0 }
  const region = new Uint8Array(boundary.length); const queue = new Int32Array(boundary.length); let head = 0; let tail = 0; let touchesEdge = false
  queue[tail++] = seed.y * page.width + seed.x; region[queue[0]] = 1
  while (head < tail) {
    const index = queue[head++]; const x = index % page.width; const y = Math.floor(index / page.width)
    if (x === 0 || y === 0 || x === page.width - 1 || y === page.height - 1) touchesEdge = true
    const neighbors = [index - 1, index + 1, index - page.width, index + page.width]
    for (const next of neighbors) {
      if (next < 0 || next >= boundary.length || region[next] || boundary[next]) continue
      const nx = next % page.width; if (Math.abs(nx - x) > 1) continue
      region[next] = 1; queue[tail++] = next
    }
  }
  if (touchesEdge && settings.contiguous) return { element: null, reason: `The region is open. Increase Gap Closing or close the boundary near (${Math.round(point.x)}, ${Math.round(point.y)}).`, pixelCount: tail }
  const output = document.createElement('canvas'); output.width = page.width; output.height = page.height
  const outputContext = output.getContext('2d')!; const image = outputContext.createImageData(page.width, page.height); const color = parseHex(settings.color)
  for (let index = 0; index < region.length; index += 1) {
    if (!region[index]) continue
    const offset = index * 4; image.data[offset] = color.r; image.data[offset + 1] = color.g; image.data[offset + 2] = color.b
    const edge = settings.antiAlias && [index - 1, index + 1, index - page.width, index + page.width].some((neighbor) => neighbor >= 0 && neighbor < boundary.length && boundary[neighbor])
    image.data[offset + 3] = Math.round(settings.opacity * color.a * (edge ? 176 : 255))
  }
  outputContext.putImageData(image, 0, 0)
  const cropped = cropTransparentCanvas(output)
  if (!cropped) return { element: null, reason: 'The selected region contains no visible pixels.', pixelCount: 0 }
  const element = createElement('raster', cropped.x, cropped.y, cropped.width, cropped.height); element.name = 'Fill'; element.imageUrl = cropped.canvas.toDataURL('image/png')
  return { element, pixelCount: tail }
}

export async function sampleVisibleColor(page: EdonPage, point: VectorPoint): Promise<string> {
  const canvas = document.createElement('canvas'); canvas.width = page.width; canvas.height = page.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  await renderElements(context, flattenRenderOrder(page.elements).filter((element) => hierarchyVisible(page.elements, element)), true)
  const [r, g, b, a] = context.getImageData(Math.max(0, Math.min(page.width - 1, Math.round(point.x))), Math.max(0, Math.min(page.height - 1, Math.round(point.y))), 1, 1).data
  return `#${[r, g, b, a].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

async function renderElements(context: CanvasRenderingContext2D, elements: EdonElement[], colors: boolean) {
  for (const element of elements) {
    if (element.type === 'group') continue
    context.save(); context.globalAlpha = element.opacity; context.translate(element.x + element.width / 2, element.y + element.height / 2); context.rotate(element.rotation * Math.PI / 180); context.scale(element.scaleX, element.scaleY); context.translate(-element.width / 2, -element.height / 2)
    const fill = colors ? element.fill : '#ffffff'; const stroke = colors ? element.stroke : '#ffffff'; context.fillStyle = fill; context.strokeStyle = stroke; context.lineWidth = Math.max(1, element.strokeWidth); context.lineCap = element.strokeCap ?? 'round'; context.lineJoin = element.strokeJoin ?? 'round'
    if ((element.type === 'image' || element.type === 'raster') && element.imageUrl) context.drawImage(await loadImage(element.imageUrl), 0, 0, element.width, element.height)
    else if (element.type === 'path' && element.pathData) { const path = new Path2D(element.pathData); if (element.closed || element.fill !== '#00000000') context.fill(path, 'evenodd'); if (element.strokeWidth) context.stroke(path) }
    else if (element.type === 'rectangle' || element.type === 'frame') { context.beginPath(); context.roundRect(0, 0, element.width, element.height, element.cornerRadius); context.fill(); if (element.strokeWidth) context.stroke() }
    else if (element.type === 'ellipse') { context.beginPath(); context.ellipse(element.width / 2, element.height / 2, element.width / 2, element.height / 2, 0, 0, Math.PI * 2); context.fill(); if (element.strokeWidth) context.stroke() }
    else if (element.type === 'polygon' || element.type === 'star') { const points = polygonPoints(element.points, element.type === 'star' ? element.innerRadius : undefined).split(' ').map((pair) => pair.split(',').map(Number)); context.beginPath(); points.forEach(([x, y], index) => (index ? context.lineTo(x / 100 * element.width, y / 100 * element.height) : context.moveTo(x / 100 * element.width, y / 100 * element.height))); context.closePath(); context.fill(); if (element.strokeWidth) context.stroke() }
    else if (element.type === 'line' || element.type === 'arrow') { context.beginPath(); context.moveTo(0, element.height / 2); context.lineTo(element.width, element.height / 2); context.stroke() }
    else if (element.type === 'text') { context.font = `${element.fontWeight ?? 400} ${element.fontSize ?? 16}px ${element.fontFamily ?? 'sans-serif'}`; context.textBaseline = 'top'; context.fillText(element.text ?? '', 0, 0) }
    context.restore()
  }
}

const gapRadius = (gap: GapClosing) => gap === 'small' ? 4 : gap === 'medium' ? 12 : gap === 'large' ? 24 : 0
function dilate(source: Uint8Array, width: number, height: number, radius: number) { if (!radius) return source; const result = new Uint8Array(source); for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (source[y * width + x]) for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) if (dx * dx + dy * dy <= radius * radius) { const nx = x + dx; const ny = y + dy; if (nx >= 0 && ny >= 0 && nx < width && ny < height) result[ny * width + nx] = 1 } return result }
function nearestOpenPixel(boundary: Uint8Array, width: number, height: number, x: number, y: number) { for (let radius = 0; radius <= 12; radius += 1) for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) { const nx = x + dx; const ny = y + dy; if (nx >= 0 && ny >= 0 && nx < width && ny < height && !boundary[ny * width + nx]) return { x: nx, y: ny } } return null }
function forEachStamp(points: VectorPoint[], spacing: number, draw: (x: number, y: number) => void) { draw(points[0].x, points[0].y); for (let index = 1; index < points.length; index += 1) { const a = points[index - 1]; const b = points[index]; const distance = Math.hypot(b.x - a.x, b.y - a.y); const steps = Math.max(1, Math.ceil(distance / spacing)); for (let step = 1; step <= steps; step += 1) draw(a.x + (b.x - a.x) * step / steps, a.y + (b.y - a.y) * step / steps) } }
function stampHardCircle(context: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) { for (let y = -radius; y <= radius; y += 1) for (let x = -radius; x <= radius; x += 1) if (x * x + y * y <= radius * radius) context.fillRect(centerX + x, centerY + y, 1, 1) }
function cropTransparentCanvas(source: HTMLCanvasElement) {
  const context = source.getContext('2d', { willReadFrequently: true })!; const { data } = context.getImageData(0, 0, source.width, source.height)
  let left = source.width; let top = source.height; let right = -1; let bottom = -1
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) if (data[(y * source.width + x) * 4 + 3]) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y) }
  if (right < left || bottom < top) return null
  left = Math.max(0, left - 1); top = Math.max(0, top - 1); right = Math.min(source.width - 1, right + 1); bottom = Math.min(source.height - 1, bottom + 1)
  const canvas = document.createElement('canvas'); canvas.width = right - left + 1; canvas.height = bottom - top + 1
  canvas.getContext('2d')!.drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  return { canvas, x: left, y: top, width: canvas.width, height: canvas.height }
}
function parseHex(hex: string) { const normalized = hex.replace('#', '').padEnd(8, 'f'); return { r: Number.parseInt(normalized.slice(0, 2), 16), g: Number.parseInt(normalized.slice(2, 4), 16), b: Number.parseInt(normalized.slice(4, 6), 16), a: Number.parseInt(normalized.slice(6, 8), 16) / 255 } }
const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source })
function hierarchyVisible(elements: EdonElement[], element: EdonElement) { let current: EdonElement | undefined = element; while (current) { if (!current.visible) return false; current = current.parentId ? elements.find((item) => item.id === current?.parentId) : undefined } return true }
