import { roundedRectPath, shapeGradient } from './shape-geometry'
import { serializeMask } from './masks'
import type { EdonDocument, EdonElement, EdonPage } from '../model/document'
import { cssPaint, elementFilter, maskClipPath, polygonPoints, serializeOutlineFilters } from './rendering'
import { descendantsOf } from './geometry'
import { flattenRenderOrder } from './scene-tree'
import { cleanDocHtml } from './doc-format'

export type ArtworkFormat = 'png' | 'jpeg' | 'webp' | 'svg'
export interface ExportOptions { format: ArtworkFormat; scale: 1 | 2 | 4; transparent: boolean; selectionIds?: string[] }

export async function previewArtwork(document: EdonDocument, slideId = document.activePageId) {
 const page = document.pages.find(page => page.id === slideId)
 if (!page) throw new Error('Page not found')
 await window.document.fonts.ready
 const elements = flattenRenderOrder(page.elements).filter(element => hierarchyVisible(page.elements, element) && element.includeInExport !== false)
 const { serializeRasterScene } = await import('./raster-scene')
 const image = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serializeRasterScene(elements, {x:0,y:0,width:page.width,height:page.height}, page.background)))
 const scale = Math.min(1, 1024 / Math.max(page.width, page.height))
 const canvas = window.document.createElement('canvas')
 canvas.width = Math.max(1, Math.round(page.width * scale)); canvas.height = Math.max(1, Math.round(page.height * scale))
 const context = canvas.getContext('2d'); if (!context) throw new Error('Preview is unavailable')
 context.drawImage(image, 0, 0, canvas.width, canvas.height)
 return { documentId: document.id, slideId: page.id, revision: document.revision, mimeType: 'image/png', data: canvas.toDataURL('image/png').split(',')[1], width: canvas.width, height: canvas.height }
}

export async function exportArtwork(document: EdonDocument, options: ExportOptions): Promise<void> {
  const page = document.pages.find((item) => item.id === document.activePageId) ?? document.pages[0]
  const selected = options.selectionIds?.length ? new Set(descendantsOf(page.elements, options.selectionIds).map((element) => element.id)) : null
  const elements = flattenRenderOrder(page.elements).filter((element) => hierarchyVisible(page.elements, element) && element.includeInExport !== false && (!selected || selected.has(element.id)))
  const scope = exportScope(page, elements, Boolean(options.selectionIds?.length))
  await window.document.fonts.ready
  const svg = serializeArtwork(page, elements, scope, options.transparent)
  if (options.format === 'svg') return download(new Blob([svg], { type: 'image/svg+xml' }), `${slug(document.name)}.svg`)
  const { serializeRasterScene } = await import('./raster-scene')
  const rasterSvg = serializeRasterScene(elements, scope, !options.transparent || options.format === 'jpeg' ? page.background : undefined)
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(rasterSvg)
  {
    const image = await loadImage(url)
    const canvas = window.document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(scope.width * options.scale))
    canvas.height = Math.max(1, Math.round(scope.height * options.scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas export is unavailable')
    context.scale(options.scale, options.scale)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    if (!options.transparent || options.format === 'jpeg') { context.fillStyle = page.background; context.fillRect(0, 0, scope.width, scope.height) }
    context.drawImage(image, 0, 0, scope.width, scope.height)
    const mime = `image/${options.format}`
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not encode artwork')), mime, .94))
    download(blob, `${slug(document.name)}@${options.scale}x.${options.format === 'jpeg' ? 'jpg' : options.format}`)
  }
}

export function serializeArtwork(page: EdonPage, elements: EdonElement[], scope = { x: 0, y: 0, width: page.width, height: page.height }, transparent = false): string {
  const included = new Set(elements.map((element) => element.id)); const content = flattenRenderOrder(page.elements).filter((element) => included.has(element.id)).map((element) => serializeElement(element, scope.x, scope.y)).join('')
  const definitions = elements.map((element) => serializeOutlineFilters(element) + serializeMask(element) + serializePaint(element)).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scope.width}" height="${scope.height}" viewBox="0 0 ${scope.width} ${scope.height}"><defs>${definitions}</defs>${transparent ? '' : `<rect width="100%" height="100%" fill="${page.background}"/>`}${content}</svg>`
}

function serializeElement(element: EdonElement, offsetX: number, offsetY: number): string {
  const x = element.x - offsetX; const y = element.y - offsetY
  const transform = `translate(${x + element.width / 2} ${y + element.height / 2}) rotate(${element.rotation}) scale(${element.scaleX} ${element.scaleY}) translate(${-element.width / 2} ${-element.height / 2})`
  const appearance = `filter:${elementFilter(element) ?? 'none'};clip-path:${maskClipPath(element) ?? 'none'};mix-blend-mode:${element.blendMode}`
  const common = `transform="${transform}" opacity="${element.opacity}" style="${escapeXml(appearance)}"`
  const fill = element.fillPaint.type === 'solid' ? element.fill : `url(#paint-${element.id})`
  const stroke = `stroke="${element.stroke}" stroke-width="${element.strokeWidth}" stroke-opacity="${element.strokeOpacity ?? 1}" stroke-linecap="${element.strokeCap ?? 'round'}" stroke-linejoin="${element.strokeJoin ?? 'round'}" stroke-dasharray="${element.strokeDash.join(' ')}" ${['rectangle','frame','ellipse'].includes(element.type) ? '' : 'vector-effect="non-scaling-stroke"'}`
  if (element.type === 'rectangle' || element.type === 'frame') return `<g ${common}><path d="${roundedRectPath(element.width,element.height,element.cornerRadii)}" fill="${fill}"/><path d="${roundedRectPath(element.width,element.height,element.cornerRadii,element.strokeWidth / 2)}" fill="none" ${stroke}/></g>`
  if (element.type === 'ellipse') return `<g ${common}><ellipse cx="${element.width / 2}" cy="${element.height / 2}" rx="${element.width / 2}" ry="${element.height / 2}" fill="${fill}"/><ellipse cx="${element.width / 2}" cy="${element.height / 2}" rx="${Math.max(0,element.width / 2-element.strokeWidth / 2)}" ry="${Math.max(0,element.height / 2-element.strokeWidth / 2)}" fill="none" ${stroke}/></g>`
  if (element.type === 'polygon' || element.type === 'star') return `<svg ${common} width="${element.width}" height="${element.height}" viewBox="0 0 100 100" overflow="visible"><polygon points="${polygonPoints(element.points, element.type === 'star' ? element.innerRadius : undefined, element.imperfection, element.imperfectionSeed)}" fill="${fill}" ${stroke}/></svg>`
  if (element.type === 'path') return `<svg ${common} width="${element.width}" height="${element.height}" viewBox="0 0 ${element.width} ${element.height}" overflow="visible"><path d="${escapeXml(element.pathData ?? '')}" fill="${fill}" fill-rule="evenodd" ${stroke}/></svg>`
  if (element.type === 'line' || element.type === 'arrow') return `<svg ${common} width="${element.width}" height="${element.height}" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><defs>${element.type === 'arrow' ? `<marker id="arrow-${element.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="${element.stroke}"/></marker>` : ''}</defs><line x1="1" y1="50" x2="99" y2="50" ${stroke} marker-end="${element.type === 'arrow' ? `url(#arrow-${element.id})` : 'none'}"/></svg>`
  if (element.type === 'text') return `<foreignObject ${common} width="${element.width}" height="${element.height}"><div xmlns="http://www.w3.org/1999/xhtml" style="display:block;width:100%;overflow-wrap:break-word;font-family:${escapeXml(element.fontFamily ?? 'sans-serif')};font-size:${element.fontSize}px;font-weight:${element.fontWeight};font-style:${element.italic ? 'italic' : 'normal'};text-decoration:${element.underline ? 'underline' : 'none'};text-align:${element.textAlign ?? 'left'};line-height:${element.lineHeight};letter-spacing:${element.letterSpacing}px;color:${element.fill};${element.fillPaint.type !== 'solid' ? `background:${cssPaint(element.fillPaint)};-webkit-background-clip:text;-webkit-text-fill-color:transparent;` : ''}white-space:pre-wrap"><style>p{margin:0}ul,ol{margin:0;padding-left:1.4em}</style>${element.textHtml ? cleanDocHtml(element.textHtml).replace(/<br>/g, '<br/>') : escapeXml(element.text ?? '')}</div></foreignObject>`
  if ((element.type === 'image' || element.type === 'raster') && element.imageUrl) {
    const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 }
    return `<g ${common}><svg width="${element.width}" height="${element.height}" overflow="${crop.width < 1 || crop.height < 1 ? 'hidden' : 'visible'}"><image x="${-crop.x / crop.width * element.width}" y="${-crop.y / crop.height * element.height}" width="${element.width / crop.width}" height="${element.height / crop.height}" href="${escapeXml(element.imageUrl)}" preserveAspectRatio="${element.type === 'raster' ? 'none' : 'xMidYMid slice'}" style="image-rendering:${element.type === 'raster' ? 'pixelated' : 'auto'}"/></svg></g>`
  }
  return ''
}

function exportScope(page: EdonPage, elements: EdonElement[], selection: boolean) {
  if (!selection || !elements.length) return { x: 0, y: 0, width: page.width, height: page.height }
  const boxes = elements.filter(element => element.type !== 'group').map(element => {
    const angle=element.rotation*Math.PI/180, cx=element.x+element.width/2,cy=element.y+element.height/2
    let padding=element.strokeWidth * Math.max(Math.abs(element.scaleX),Math.abs(element.scaleY)) * (element.type === 'arrow' ? 5 : .5)
    for(const effect of element.effects) if(effect.enabled) {
      if(effect.type==='outline') padding+=effect.width
      if(effect.type==='gaussian-blur') padding+=effect.radius*3
      if(effect.type==='drop-shadow') padding+=Math.max(Math.abs(effect.offsetX),Math.abs(effect.offsetY))+effect.blur*3+effect.spread
      if(effect.type==='glow') padding+=(effect.blur*3+effect.spread)*Math.max(1,Math.round(effect.strength))
      if(effect.type==='stylized-shadow') padding+=effect.distance
    }
    const points=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy])=>{const dx=sx*element.width*element.scaleX/2,dy=sy*element.height*element.scaleY/2;return {x:cx+dx*Math.cos(angle)-dy*Math.sin(angle),y:cy+dx*Math.sin(angle)+dy*Math.cos(angle)}})
    return {x:Math.min(...points.map(point=>point.x))-padding,y:Math.min(...points.map(point=>point.y))-padding,right:Math.max(...points.map(point=>point.x))+padding,bottom:Math.max(...points.map(point=>point.y))+padding}
  })
  if(!boxes.length)return {x:0,y:0,width:page.width,height:page.height}
  const x=Math.floor(Math.min(...boxes.map(box=>box.x))), y=Math.floor(Math.min(...boxes.map(box=>box.y)))
  return { x, y, width: Math.max(1,Math.ceil(Math.max(...boxes.map(box=>box.right)))-x), height: Math.max(1,Math.ceil(Math.max(...boxes.map(box=>box.bottom)))-y) }
}

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Could not rasterize artwork')); image.src = url })
const download = (blob: Blob, name: string) => { const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
const slug = (value: string) => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'edon-artwork'
const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[character]!)
function hierarchyVisible(elements: EdonElement[], element: EdonElement) { let current: EdonElement | undefined = element; while (current) { if (!current.visible) return false; current = current.parentId ? elements.find((item) => item.id === current?.parentId) : undefined } return true }

function serializePaint(element: EdonElement): string {
 const paint=element.fillPaint
 if(paint.type==='solid')return ''
 const stops=[...paint.stops].sort((a,b)=>a.offset-b.offset).map(stop=>`<stop offset="${stop.offset}" stop-color="${escapeXml(stop.color)}"/>`).join('')
 const cssShape=['rectangle','frame','ellipse'].includes(element.type)
 if(cssShape && paint.type==='radial-gradient')return `<radialGradient id="paint-${element.id}" gradientUnits="userSpaceOnUse" cx="${element.width/2}" cy="${element.height/2}" r="${Math.hypot(element.width,element.height)/2}">${stops}</radialGradient>`
 if(cssShape && paint.type==='linear-gradient'){const {x1,y1,x2,y2}=shapeGradient(element.width,element.height,paint.angle);return `<linearGradient id="paint-${element.id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`}
 if(paint.type==='radial-gradient')return `<radialGradient id="paint-${element.id}">${stops}</radialGradient>`
 const angle=(paint.angle-90)*Math.PI/180,x=Math.cos(angle)*.5,y=Math.sin(angle)*.5
 return `<linearGradient id="paint-${element.id}" x1="${.5-x}" y1="${.5-y}" x2="${.5+x}" y2="${.5+y}">${stops}</linearGradient>`
}
