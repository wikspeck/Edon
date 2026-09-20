import { memo, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { EdonElement, GradientStop } from '../model/document'
import { baseElementStyle, cssPaint, elementFilter, maskClipPath, polygonPoints } from './rendering'

interface CanvasElementProps {
  element: EdonElement
  selected: boolean
  editingText: boolean
  onPointerDown: (event: ReactPointerEvent, element: EdonElement) => void
  onContextMenu: (event: React.MouseEvent, element: EdonElement) => void
  onTextEdit: (id: string, text: string, height: number) => void
  onBeginTextEdit: (id: string) => void
}

export const CanvasElement = memo(function CanvasElement({ element, selected, editingText, onPointerDown, onContextMenu, onTextEdit, onBeginTextEdit }: CanvasElementProps) {
  if (element.type === 'group') return null
  const paint = cssPaint(element.fillPaint)
  const style: CSSProperties = { ...baseElementStyle(element), filter: elementFilter(element), clipPath: maskClipPath(element), zIndex: selected ? 2 : undefined }
  const common = { className: `canvas-element type-${element.type} ${selected ? 'is-selected' : ''} ${element.locked ? 'is-locked' : ''}`, style, onPointerDown: (event: ReactPointerEvent) => onPointerDown(event, element), onContextMenu: (event: React.MouseEvent) => onContextMenu(event, element) }

  if (element.type === 'text') return <div {...common} onDoubleClick={(event) => { event.stopPropagation(); onBeginTextEdit(element.id) }}>
    <span
      contentEditable={editingText}
      suppressContentEditableWarning
      onPointerDown={(event) => editingText && event.stopPropagation()}
      onBlur={(event) => onTextEdit(element.id, event.currentTarget.textContent ?? '', Math.max(element.height, event.currentTarget.scrollHeight))}
      style={{ fontFamily: element.fontFamily, fontSize: element.fontSize, fontWeight: element.fontWeight, fontStyle: element.italic ? 'italic' : 'normal', textDecoration: element.underline ? 'underline' : 'none', textAlign: element.textAlign, lineHeight: element.lineHeight, letterSpacing: element.letterSpacing, color: element.fill, justifyContent: verticalJustify(element.verticalAlign), background: element.fillPaint.type === 'solid' ? undefined : paint, WebkitBackgroundClip: element.fillPaint.type === 'solid' ? undefined : 'text', WebkitTextFillColor: element.fillPaint.type === 'solid' ? undefined : 'transparent' }}
    >{element.text}</span>
  </div>

  if (element.type === 'image') {
    const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 }
    return <div {...common} style={{ ...style, overflow: element.mask || crop.width < 1 || crop.height < 1 ? 'hidden' : 'visible' }}>
      {element.imageUrl && <img src={element.imageUrl} alt="" draggable={false} style={{ position: 'absolute', width: `${100 / crop.width}%`, height: `${100 / crop.height}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%`, objectFit: 'cover' }} />}
    </div>
  }

  if (element.type === 'line' || element.type === 'arrow') return <div {...common}><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><defs>{element.type === 'arrow' && <marker id={`arrow-${element.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={element.stroke} /></marker>}</defs><line x1="1" y1="50" x2="99" y2="50" stroke={element.stroke} strokeWidth={element.strokeWidth} vectorEffect="non-scaling-stroke" strokeDasharray={element.strokeDash.join(' ')} markerEnd={element.type === 'arrow' ? `url(#arrow-${element.id})` : undefined} /></svg></div>

  if (element.type === 'polygon' || element.type === 'star') return <div {...common}><svg width="100%" height="100%" viewBox="0 0 100 100" overflow="visible"><PaintDefinition id={element.id} stops={element.fillPaint.type === 'solid' ? [] : element.fillPaint.stops} radial={element.fillPaint.type === 'radial-gradient'} angle={element.fillPaint.type === 'linear-gradient' ? element.fillPaint.angle : 0} /><polygon points={polygonPoints(element.points, element.type === 'star' ? element.innerRadius : undefined)} fill={element.fillPaint.type === 'solid' ? element.fill : `url(#paint-${element.id})`} stroke={element.stroke} strokeWidth={element.strokeWidth} vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg></div>

  if (element.type === 'path' && element.pathData) return <div {...common}><svg width="100%" height="100%" viewBox={`0 0 ${element.width} ${element.height}`} overflow="visible"><PaintDefinition id={element.id} stops={element.fillPaint.type === 'solid' ? [] : element.fillPaint.stops} radial={element.fillPaint.type === 'radial-gradient'} angle={element.fillPaint.type === 'linear-gradient' ? element.fillPaint.angle : 0} /><path d={element.pathData} fill={element.fillPaint.type === 'solid' ? element.fill : `url(#paint-${element.id})`} fillRule="evenodd" stroke={element.stroke} strokeWidth={element.strokeWidth} vectorEffect="non-scaling-stroke" /></svg></div>

  return <div {...common} style={{ ...style, background: paint, border: `${element.strokeWidth}px solid ${element.stroke}`, borderRadius: element.type === 'ellipse' ? '50%' : element.cornerRadii.map((radius) => `${radius}px`).join(' ') }} />
})

function PaintDefinition({ id, stops, radial, angle }: { id: string; stops: GradientStop[]; radial: boolean; angle: number }) {
  if (!stops.length) return null
  if (radial) return <radialGradient id={`paint-${id}`}>{stops.map((stop) => <stop key={stop.id} offset={stop.offset} stopColor={stop.color} />)}</radialGradient>
  const radians = (angle - 90) * Math.PI / 180
  const x = Math.cos(radians) * .5
  const y = Math.sin(radians) * .5
  return <linearGradient id={`paint-${id}`} x1={.5 - x} y1={.5 - y} x2={.5 + x} y2={.5 + y}>{stops.map((stop) => <stop key={stop.id} offset={stop.offset} stopColor={stop.color} />)}</linearGradient>
}

const verticalJustify = (align?: EdonElement['verticalAlign']) => align === 'middle' ? 'center' : align === 'bottom' ? 'flex-end' : 'flex-start'
