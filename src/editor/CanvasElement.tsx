import { memo, useEffect, useLayoutEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { roundedRectPath, shapeGradient } from './shape-geometry'
import { cleanDocHtml } from './doc-format'
import type { EdonElement, GradientStop } from '../model/document'
import { baseElementStyle, cssPaint, elementFilter, maskClipPath, polygonPoints } from './rendering'
import { registerAlphaImage } from './alpha-hit-test'

interface CanvasElementProps {
  exportMode?: boolean
  element: EdonElement
  selected: boolean
  editingText: boolean
  silhouette: boolean
  hidden?: boolean
  onPointerDown: (event: ReactPointerEvent, element: EdonElement) => void
  onContextMenu: (event: React.MouseEvent, element: EdonElement) => void
  onTextEdit: (id: string, text: string, width: number, height: number, html?: string, keepEditing?: boolean) => void
  onBeginTextEdit: (id: string) => void
  onBeginVectorEdit: (id: string) => void
}

export const CanvasElement = memo(function CanvasElement({ exportMode, element, selected, editingText, silhouette, hidden, onPointerDown, onContextMenu, onTextEdit, onBeginTextEdit, onBeginVectorEdit }: CanvasElementProps) {
  const textRef = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const html = element.textHtml ? cleanDocHtml(element.textHtml) : (element.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    if (textRef.current && cleanDocHtml(textRef.current.innerHTML) !== html) textRef.current.innerHTML = html
  }, [element.text, element.textHtml])
  useEffect(() => { if (editingText) textRef.current?.focus() }, [editingText])
  if (element.type === 'group') return null
  const paint = silhouette ? '#050506' : cssPaint(element.fillPaint)
  const style: CSSProperties = { ...baseElementStyle(element), filter: silhouette ? undefined : elementFilter(element), clipPath: maskClipPath(element), visibility: hidden ? 'hidden' : undefined }
  const common = { 'data-element-id': element.id, className: `canvas-element type-${element.type} ${selected ? 'is-selected' : ''} ${element.locked ? 'is-locked' : ''} ${element.reference ? 'is-reference' : ''}`, style, onPointerDown: (event: ReactPointerEvent) => onPointerDown(event, element), onContextMenu: (event: React.MouseEvent) => onContextMenu(event, element) }

  if (element.type === 'text') return <div {...common} onDoubleClick={(event) => { event.stopPropagation(); onBeginTextEdit(element.id) }}>
    <span
      ref={textRef}
      className="canvas-text-content"
      dangerouslySetInnerHTML={exportMode ? { __html: element.textHtml ? cleanDocHtml(element.textHtml) : (element.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') } : undefined}
      contentEditable={editingText}
      suppressContentEditableWarning
      onPointerDown={(event) => editingText && event.stopPropagation()}
      onInput={(event) => onTextEdit(element.id, event.currentTarget.innerText, Math.max(1, event.currentTarget.scrollWidth), Math.max(1, event.currentTarget.scrollHeight), cleanDocHtml(event.currentTarget.innerHTML), true)}
      onBlur={(event) => { if (event.relatedTarget instanceof HTMLElement && event.relatedTarget.closest('.text-format-toolbar')) return; onTextEdit(element.id, event.currentTarget.innerText ?? '', Math.max(1, event.currentTarget.scrollWidth), Math.max(1, event.currentTarget.scrollHeight), cleanDocHtml(event.currentTarget.innerHTML)) }}
      onPaste={(event) => { if (!editingText) return; event.preventDefault(); const plain = event.clipboardData.getData('text/plain'); document.execCommand('insertHTML', false, cleanDocHtml(event.clipboardData.getData('text/html') || plain.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'))) }}
      style={{ fontFamily: element.fontFamily, fontSize: element.fontSize, fontWeight: element.fontWeight, fontStyle: element.italic ? 'italic' : 'normal', textDecoration: element.underline ? 'underline' : 'none', textAlign: element.textAlign, lineHeight: element.lineHeight, letterSpacing: element.letterSpacing, color: silhouette ? '#050506' : element.fill, justifyContent: verticalJustify(element.verticalAlign), background: !silhouette && element.fillPaint.type !== 'solid' ? paint : undefined, WebkitBackgroundClip: !silhouette && element.fillPaint.type !== 'solid' ? 'text' : undefined, WebkitTextFillColor: !silhouette && element.fillPaint.type !== 'solid' ? 'transparent' : undefined }}
    />
  </div>

  if (element.type === 'image' || element.type === 'raster') {
    const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 }
    return <div {...common} style={{ ...style, overflow: element.mask || crop.width < 1 || crop.height < 1 ? 'hidden' : 'visible' }}>
      {element.imageUrl && <img src={element.imageUrl} alt="" draggable={false} onLoad={(event) => registerAlphaImage(element.imageUrl!, event.currentTarget)} style={{ position: 'absolute', width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%`, objectFit: element.type === 'raster' ? 'fill' : 'cover', imageRendering: element.type === 'raster' ? 'pixelated' : 'auto' }} />}
    </div>
  }

  if (element.type === 'line' || element.type === 'arrow') return <div {...common}><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><defs>{element.type === 'arrow' && <marker id={`arrow-${element.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={silhouette ? '#050506' : element.stroke} /></marker>}</defs><line x1="1" y1="50" x2="99" y2="50" stroke={silhouette ? '#050506' : element.stroke} strokeOpacity={element.strokeOpacity} strokeWidth={element.strokeWidth} strokeLinecap={element.strokeCap} strokeLinejoin={element.strokeJoin} vectorEffect="non-scaling-stroke" strokeDasharray={element.strokeDash.join(' ')} markerEnd={element.type === 'arrow' ? `url(#arrow-${element.id})` : undefined} /></svg></div>

  if (element.type === 'polygon' || element.type === 'star') return <div {...common}><svg width="100%" height="100%" viewBox="0 0 100 100" overflow="visible"><PaintDefinition id={element.id} stops={element.fillPaint.type === 'solid' ? [] : element.fillPaint.stops} radial={element.fillPaint.type === 'radial-gradient'} angle={element.fillPaint.type === 'linear-gradient' ? element.fillPaint.angle : 0} /><polygon points={polygonPoints(element.points, element.type === 'star' ? element.innerRadius : undefined, element.imperfection, element.imperfectionSeed)} fill={silhouette ? '#050506' : element.fillPaint.type === 'solid' ? element.fill : `url(#paint-${element.id})`} stroke={silhouette ? '#050506' : element.stroke} strokeOpacity={element.strokeOpacity} strokeWidth={element.strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin={element.strokeJoin} strokeDasharray={element.strokeDash.join(' ')} /></svg></div>

  if (element.type === 'path' && element.pathData) return <div {...common} onDoubleClick={(event) => { event.stopPropagation(); onBeginVectorEdit(element.id) }}><svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`} overflow="visible"><PaintDefinition id={element.id} stops={element.fillPaint.type === 'solid' ? [] : element.fillPaint.stops} radial={element.fillPaint.type === 'radial-gradient'} angle={element.fillPaint.type === 'linear-gradient' ? element.fillPaint.angle : 0} /><path d={element.pathData} fill={silhouette ? '#050506' : element.fillPaint.type === 'solid' ? element.fill : `url(#paint-${element.id})`} fillRule="evenodd" stroke={silhouette ? '#050506' : element.stroke} strokeOpacity={element.strokeOpacity} strokeWidth={element.strokeWidth} strokeLinecap={element.strokeCap} strokeLinejoin={element.strokeJoin} strokeDasharray={element.strokeDash.join(' ')} vectorEffect="non-scaling-stroke" /></svg></div>

  const fill = silhouette ? '#050506' : element.fillPaint.type === 'solid' ? element.fill : `url(#paint-${element.id})`
  const stroke = { stroke: silhouette ? '#050506' : element.stroke, strokeWidth: element.strokeWidth, strokeOpacity: element.strokeOpacity, strokeDasharray: element.strokeDash.join(' '), strokeLinecap: element.strokeCap, strokeLinejoin: element.strokeJoin }
  return <div {...common}><svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`} overflow="visible"><PaintDefinition id={element.id} stops={element.fillPaint.type === 'solid' ? [] : element.fillPaint.stops} radial={element.fillPaint.type === 'radial-gradient'} angle={element.fillPaint.type === 'linear-gradient' ? element.fillPaint.angle : 0} shape={{width:element.width,height:element.height}} />{element.type === 'ellipse' ? <><ellipse cx={element.width/2} cy={element.height/2} rx={element.width/2} ry={element.height/2} fill={fill}/><ellipse cx={element.width/2} cy={element.height/2} rx={Math.max(0,element.width/2-element.strokeWidth/2)} ry={Math.max(0,element.height/2-element.strokeWidth/2)} fill="none" {...stroke}/></> : <><path d={roundedRectPath(element.width,element.height,element.cornerRadii)} fill={fill}/><path d={roundedRectPath(element.width,element.height,element.cornerRadii,element.strokeWidth/2)} fill="none" {...stroke}/></>}</svg></div>
})

function PaintDefinition({ id, stops, radial, angle, shape }: { id: string; stops: GradientStop[]; radial: boolean; angle: number; shape?: {width:number;height:number} }) {
  if (!stops.length) return null
  if (shape) {
    const children = [...stops].sort((a,b)=>a.offset-b.offset).map(stop=><stop key={stop.id} offset={stop.offset} stopColor={stop.color}/>)
    return radial ? <radialGradient id={`paint-${id}`} gradientUnits="userSpaceOnUse" cx={shape.width/2} cy={shape.height/2} r={Math.hypot(shape.width,shape.height)/2}>{children}</radialGradient> : <linearGradient id={`paint-${id}`} gradientUnits="userSpaceOnUse" {...shapeGradient(shape.width,shape.height,angle)}>{children}</linearGradient>
  }
  if (radial) return <radialGradient id={`paint-${id}`}>{stops.map((stop) => <stop key={stop.id} offset={stop.offset} stopColor={stop.color} />)}</radialGradient>
  const radians = (angle - 90) * Math.PI / 180
  const x = Math.cos(radians) * .5
  const y = Math.sin(radians) * .5
  return <linearGradient id={`paint-${id}`} x1={.5 - x} y1={.5 - y} x2={.5 + x} y2={.5 + y}>{stops.map((stop) => <stop key={stop.id} offset={stop.offset} stopColor={stop.color} />)}</linearGradient>
}

const verticalJustify = (align?: EdonElement['verticalAlign']) => align === 'middle' ? 'center' : align === 'bottom' ? 'flex-end' : 'flex-start'
