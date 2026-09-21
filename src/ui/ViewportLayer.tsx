import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

type Side = 'bottom' | 'top' | 'right' | 'left'
interface ViewportLayerProps {
  anchor?: RefObject<HTMLElement | null>
  point?: { x: number; y: number }
  preferred?: Side
  className?: string
  onDismiss?: () => void
  children: ReactNode
}

const MARGIN = 8
const GAP = 6

export function ViewportLayer({ anchor, point, preferred = 'bottom', className, onDismiss, children }: ViewportLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: MARGIN, top: MARGIN, maxHeight: 300, ready: false })
  const pointX = point?.x; const pointY = point?.y

  useLayoutEffect(() => {
    const update = () => {
      const layer = layerRef.current
      if (!layer) return
      const anchorRect = anchor?.current?.getBoundingClientRect()
      const origin = anchorRect ?? (pointX !== undefined && pointY !== undefined ? new DOMRect(pointX, pointY, 0, 0) : new DOMRect())
      const width = layer.offsetWidth; const height = layer.offsetHeight
      const room = { bottom: innerHeight - origin.bottom, top: origin.top, right: innerWidth - origin.right, left: origin.left }
      const opposite: Record<Side, Side> = { bottom: 'top', top: 'bottom', right: 'left', left: 'right' }
      const needed = preferred === 'bottom' || preferred === 'top' ? height : width
      const side = room[preferred] >= needed + GAP || room[preferred] >= room[opposite[preferred]] ? preferred : opposite[preferred]
      let left = side === 'right' ? origin.right + GAP : side === 'left' ? origin.left - width - GAP : origin.left
      let top = side === 'bottom' ? origin.bottom + GAP : side === 'top' ? origin.top - height - GAP : origin.top
      left = Math.min(innerWidth - width - MARGIN, Math.max(MARGIN, left))
      top = Math.min(innerHeight - Math.min(height, innerHeight - MARGIN * 2) - MARGIN, Math.max(MARGIN, top))
      setPosition({ left, top, maxHeight: Math.max(120, innerHeight - top - MARGIN), ready: true })
    }
    update()
    const observer = new ResizeObserver(update); if (layerRef.current) observer.observe(layerRef.current)
    addEventListener('resize', update); addEventListener('scroll', update, true)
    return () => { observer.disconnect(); removeEventListener('resize', update); removeEventListener('scroll', update, true) }
  }, [anchor, pointX, pointY, preferred])

  useLayoutEffect(() => {
    if (!onDismiss) return
    const pointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!layerRef.current?.contains(target) && !anchor?.current?.contains(target)) onDismiss()
    }
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onDismiss()
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key) }
  }, [anchor, onDismiss])

  return createPortal(<div ref={layerRef} className={`viewport-layer ${className ?? ''}`} style={{ position: 'fixed', left: position.left, top: position.top, maxHeight: position.maxHeight, visibility: position.ready ? 'visible' : 'hidden' }}>{children}</div>, document.body)
}
