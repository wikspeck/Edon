import { floodRegion, snapRasterAlpha } from './flood-fill'
import { pointInElement } from './geometry'
import { createElement, type EdonElement, type EdonPage, type VectorPoint } from '../model/document'
import { polygonPoints } from './rendering'
import type { ArtToolSettings } from './editor-state'
import { flattenRenderOrder } from './scene-tree'
import { alignedPixelBounds, paintPixelCells, PIXEL_MODE_CELL_SIZE } from './pixel-grid'

export interface BucketResult { element: EdonElement | null; reason?: string; pixelCount: number }

export async function paintRasterRegion(element: EdonElement, point: VectorPoint, settings: ArtToolSettings): Promise<BucketResult> {
  if (!element.imageUrl || element.locked) return { element: null, pixelCount: 0, reason: 'This raster layer is locked or empty.' }
  const image = await loadImage(element.imageUrl)
  const local = pointInElement(element, point)
  if (local.x < 0 || local.y < 0 || local.x >= element.width || local.y >= element.height) return { element: null, pixelCount: 0, reason: 'Click inside the raster layer.' }
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })!; context.imageSmoothingEnabled = false; context.drawImage(image, 0, 0)
  const source = context.getImageData(0, 0, canvas.width, canvas.height)
  if (!settings.antiAlias) snapRasterAlpha(source.data)
  // Fill the original pixel buffer, never a resampled preview or a separate overlay.
  const x = Math.floor(local.x / element.width * canvas.width); const y = Math.floor(local.y / element.height * canvas.height)
  const region = floodRegion(source.data, canvas.width, canvas.height, x, y, settings.fillTolerance, settings.contiguous)
  const color = parseHex(settings.color); let pixelCount = 0
  for (let index = 0; index < region.length; index++) if (region[index]) {
    const offset = index * 4; pixelCount++
    source.data[offset] = color.r; source.data[offset + 1] = color.g; source.data[offset + 2] = color.b; source.data[offset + 3] = Math.round(settings.opacity * color.a * 255)
  }
  context.putImageData(source, 0, 0)
  return { element: { ...element, imageUrl: canvas.toDataURL('image/png') }, pixelCount }
}

export async function rasterizeElement(page: EdonPage, shape: EdonElement, settings: ArtToolSettings): Promise<EdonElement | null> {
  const canvas = document.createElement('canvas'); canvas.width = page.width; canvas.height = page.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  await renderElements(context, [shape], true)
  if (!settings.antiAlias) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    for (let offset = 3; offset < pixels.data.length; offset += 4) pixels.data[offset] = pixels.data[offset] >= 128 ? 255 : 0
    context.putImageData(pixels, 0, 0)
  }
  const cropped = cropTransparentCanvas(canvas, PIXEL_MODE_CELL_SIZE)
  if (!cropped) return null
  const element = createElement('raster', cropped.x, cropped.y, cropped.width, cropped.height)
  element.name = `Pixel ${shape.name}`; element.imageUrl = cropped.canvas.toDataURL('image/png'); element.opacity = settings.opacity
  return element
}

export async function createRasterStroke(page: EdonPage, existing: EdonElement | null, points: VectorPoint[], settings: ArtToolSettings, erase = false): Promise<EdonElement | null> {
  const canvas = document.createElement('canvas'); canvas.width = page.width; canvas.height = page.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!; context.imageSmoothingEnabled = settings.antiAlias
  if (existing?.imageUrl) drawRasterLayer(context, await loadImage(existing.imageUrl), existing)
  renderRasterStroke(context, points, settings, erase)
  const cropped = cropTransparentCanvas(canvas, settings.antiAlias ? 1 : PIXEL_MODE_CELL_SIZE)
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
  context.imageSmoothingEnabled = settings.antiAlias
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
    paintPixelCells(context, points, context.canvas.width, context.canvas.height, settings.size)
  }
  context.restore()
}

export function drawRasterLayer(context: CanvasRenderingContext2D, image: CanvasImageSource, element: EdonElement) {
  context.save(); context.imageSmoothingEnabled = false; context.translate(element.x + element.width / 2, element.y + element.height / 2); context.rotate(element.rotation * Math.PI / 180); context.scale(element.scaleX, element.scaleY); context.drawImage(image, -element.width / 2, -element.height / 2, element.width, element.height); context.restore()
}

export async function paintEnclosedRegion(page: EdonPage, point: VectorPoint, settings: ArtToolSettings): Promise<BucketResult> {
  const canvas = document.createElement('canvas'); canvas.width = page.width; canvas.height = page.height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.imageSmoothingEnabled = settings.antiAlias
  await renderElements(context, flattenRenderOrder(page.elements).filter((element) => hierarchyVisible(page.elements, element)), true)
  const source = context.getImageData(0, 0, page.width, page.height)
  if (!settings.antiAlias) snapRasterAlpha(source.data)
  const region = floodRegion(source.data, page.width, page.height, Math.floor(point.x), Math.floor(point.y), settings.fillTolerance, settings.contiguous)
  const output = context.createImageData(page.width, page.height)
  const color = parseHex(settings.color)
  let pixelCount = 0
  for (let index = 0; index < region.length; index++) {
    if (!region[index]) continue
    pixelCount++
    const offset = index * 4
    output.data[offset] = color.r; output.data[offset + 1] = color.g; output.data[offset + 2] = color.b
    output.data[offset + 3] = Math.round(255 * settings.opacity * color.a)
  }
  context.putImageData(output, 0, 0)
  const cropped = cropTransparentCanvas(canvas)
  if (!cropped) return { element: null, reason: 'The fill has no visible pixels. Check the colour opacity.', pixelCount: 0 }
  const element = createElement('raster', cropped.x, cropped.y, cropped.width, cropped.height)
  element.name = 'Fill'; element.imageUrl = cropped.canvas.toDataURL('image/png')
  return { element, pixelCount }
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

function forEachStamp(points: VectorPoint[], spacing: number, draw: (x: number, y: number) => void) { draw(points[0].x, points[0].y); for (let index = 1; index < points.length; index += 1) { const a = points[index - 1]; const b = points[index]; const distance = Math.hypot(b.x - a.x, b.y - a.y); const steps = Math.max(1, Math.ceil(distance / spacing)); for (let step = 1; step <= steps; step += 1) draw(a.x + (b.x - a.x) * step / steps, a.y + (b.y - a.y) * step / steps) } }
function cropTransparentCanvas(source: HTMLCanvasElement, alignment = 1) {
  const context = source.getContext('2d', { willReadFrequently: true })!; const { data } = context.getImageData(0, 0, source.width, source.height)
  let left = source.width; let top = source.height; let right = -1; let bottom = -1
  for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) if (data[(y * source.width + x) * 4 + 3]) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y) }
  if (right < left || bottom < top) return null
  const aligned = alignedPixelBounds(left, top, right, bottom, alignment)
  left = Math.max(0, aligned.left); top = Math.max(0, aligned.top); right = Math.min(source.width - 1, aligned.right); bottom = Math.min(source.height - 1, aligned.bottom)
  const canvas = document.createElement('canvas'); canvas.width = right - left + 1; canvas.height = bottom - top + 1
  canvas.getContext('2d')!.drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  return { canvas, x: left, y: top, width: canvas.width, height: canvas.height }
}
function parseHex(hex: string) { const normalized = hex.replace('#', '').padEnd(8, 'f'); return { r: Number.parseInt(normalized.slice(0, 2), 16), g: Number.parseInt(normalized.slice(2, 4), 16), b: Number.parseInt(normalized.slice(4, 6), 16), a: Number.parseInt(normalized.slice(6, 8), 16) / 255 } }
const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source })
function hierarchyVisible(elements: EdonElement[], element: EdonElement) { let current: EdonElement | undefined = element; while (current) { if (!current.visible) return false; current = current.parentId ? elements.find((item) => item.id === current?.parentId) : undefined } return true }
