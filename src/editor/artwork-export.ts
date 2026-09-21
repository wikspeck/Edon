import type { EdonDocument, EdonElement, EdonPage } from '../model/document'
import { polygonPoints } from './rendering'
import { descendantsOf } from './geometry'
import { flattenRenderOrder } from './scene-tree'

export type ArtworkFormat = 'png' | 'jpeg' | 'webp' | 'svg'
export interface ExportOptions { format: ArtworkFormat; scale: 1 | 2 | 4; transparent: boolean; selectionIds?: string[] }

export async function exportArtwork(document: EdonDocument, options: ExportOptions): Promise<void> {
  const page = document.pages.find((item) => item.id === document.activePageId) ?? document.pages[0]
  const selected = options.selectionIds?.length ? new Set(descendantsOf(page.elements, options.selectionIds).map((element) => element.id)) : null
  const elements = flattenRenderOrder(page.elements).filter((element) => hierarchyVisible(page.elements, element) && element.includeInExport !== false && (!selected || selected.has(element.id)))
  const scope = exportScope(page, elements, Boolean(options.selectionIds?.length))
  const svg = serializeArtwork(page, elements, scope, options.transparent)
  if (options.format === 'svg') return download(new Blob([svg], { type: 'image/svg+xml' }), `${slug(document.name)}.svg`)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = await loadImage(url)
    const canvas = window.document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(scope.width * options.scale))
    canvas.height = Math.max(1, Math.round(scope.height * options.scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas export is unavailable')
    context.scale(options.scale, options.scale)
    if (!options.transparent || options.format === 'jpeg') { context.fillStyle = page.background; context.fillRect(0, 0, scope.width, scope.height) }
    context.drawImage(image, 0, 0, scope.width, scope.height)
    const mime = `image/${options.format}`
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not encode artwork')), mime, .94))
    download(blob, `${slug(document.name)}@${options.scale}x.${options.format === 'jpeg' ? 'jpg' : options.format}`)
  } finally { URL.revokeObjectURL(url) }
}

export function serializeArtwork(page: EdonPage, elements: EdonElement[], scope = { x: 0, y: 0, width: page.width, height: page.height }, transparent = false): string {
  const included = new Set(elements.map((element) => element.id)); const content = flattenRenderOrder(page.elements).filter((element) => included.has(element.id)).map((element) => serializeElement(element, scope.x, scope.y)).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scope.width}" height="${scope.height}" viewBox="0 0 ${scope.width} ${scope.height}">${transparent ? '' : `<rect width="100%" height="100%" fill="${page.background}"/>`}${content}</svg>`
}

function serializeElement(element: EdonElement, offsetX: number, offsetY: number): string {
  const x = element.x - offsetX; const y = element.y - offsetY
  const transform = `translate(${x} ${y}) rotate(${element.rotation} ${element.width / 2} ${element.height / 2}) scale(${element.scaleX} ${element.scaleY})`
  const common = `transform="${transform}" opacity="${element.opacity}"`
  const fill = element.fillPaint.type === 'solid' ? element.fill : element.fillPaint.stops[0]?.color ?? element.fill
  const stroke = `stroke="${element.stroke}" stroke-width="${element.strokeWidth}" stroke-opacity="${element.strokeOpacity ?? 1}" stroke-linecap="${element.strokeCap ?? 'round'}" stroke-linejoin="${element.strokeJoin ?? 'round'}"`
  if (element.type === 'rectangle' || element.type === 'frame') return `<rect ${common} width="${element.width}" height="${element.height}" rx="${element.cornerRadius}" fill="${fill}" ${stroke}/>`
  if (element.type === 'ellipse') return `<ellipse ${common} cx="${element.width / 2}" cy="${element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}" ${stroke}/>`
  if (element.type === 'polygon' || element.type === 'star') return `<svg ${common} width="${element.width}" height="${element.height}" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="${polygonPoints(element.points, element.type === 'star' ? element.innerRadius : undefined, element.imperfection, element.imperfectionSeed)}" fill="${fill}" ${stroke}/></svg>`
  if (element.type === 'path') return `<svg ${common} width="${element.width}" height="${element.height}" viewBox="0 0 ${element.width} ${element.height}" overflow="visible"><path d="${escapeXml(element.pathData ?? '')}" fill="${fill}" fill-rule="evenodd" ${stroke}/></svg>`
  if (element.type === 'line' || element.type === 'arrow') return `<svg ${common} width="${element.width}" height="${element.height}" viewBox="0 0 100 100" overflow="visible"><line x1="1" y1="50" x2="99" y2="50" ${stroke}/></svg>`
  if (element.type === 'text') return `<foreignObject ${common} width="${element.width}" height="${element.height}"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:${escapeXml(element.fontFamily ?? 'sans-serif')};font-size:${element.fontSize}px;font-weight:${element.fontWeight};line-height:${element.lineHeight};letter-spacing:${element.letterSpacing}px;color:${fill};white-space:pre-wrap">${escapeXml(element.text ?? '')}</div></foreignObject>`
  if ((element.type === 'image' || element.type === 'raster') && element.imageUrl) return `<image ${common} width="${element.width}" height="${element.height}" href="${escapeXml(element.imageUrl)}" preserveAspectRatio="${element.type === 'raster' ? 'none' : 'xMidYMid slice'}"/>`
  return ''
}

function exportScope(page: EdonPage, elements: EdonElement[], selection: boolean) {
  if (!selection || !elements.length) return { x: 0, y: 0, width: page.width, height: page.height }
  const x = Math.min(...elements.map((element) => element.x)); const y = Math.min(...elements.map((element) => element.y))
  const right = Math.max(...elements.map((element) => element.x + element.width)); const bottom = Math.max(...elements.map((element) => element.y + element.height))
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) }
}

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not rasterize artwork')); image.src = url })
const download = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
const slug = (value: string) => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'edon-artwork'
const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!)
function hierarchyVisible(elements: EdonElement[], element: EdonElement) { let current: EdonElement | undefined = element; while (current) { if (!current.visible) return false; current = current.parentId ? elements.find((item) => item.id === current?.parentId) : undefined } return true }
