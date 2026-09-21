import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { createPortal } from 'react-dom'

let topLayer = 200
const EDGE = 8

export function FloatingWindow({ id, title, subtitle, initialPosition, onClose, children, footer }: { id: string; title: string; subtitle?: string; initialPosition: { x: number; y: number }; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const panelRef = useRef<HTMLElement>(null)
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [position, setPosition] = useState(() => readPosition(id, initialPosition))
  const positionRef = useRef(position)
  const [minimized, setMinimized] = useState(false)
  const [zIndex, setZIndex] = useState(() => ++topLayer)
  const focus = () => setZIndex(++topLayer)
  const clamp = (next: { x: number; y: number }) => {
    const rect = panelRef.current?.getBoundingClientRect(); const width = rect?.width ?? 320; const height = minimized ? 38 : rect?.height ?? 240
    return { x: Math.min(innerWidth - width - EDGE, Math.max(EDGE, next.x)), y: Math.min(innerHeight - height - EDGE, Math.max(EDGE, next.y)) }
  }
  const move = (event: PointerEvent) => {
    if (!dragRef.current) return
    const next = clamp({ x: dragRef.current.left + event.clientX - dragRef.current.x, y: dragRef.current.top + event.clientY - dragRef.current.y }); positionRef.current = next; setPosition(next)
  }
  const end = (event: PointerEvent) => {
    if (!dragRef.current) return
    event.currentTarget.releasePointerCapture(event.pointerId); dragRef.current = null
    sessionStorage.setItem(`edon.window.${id}`, JSON.stringify(positionRef.current))
  }
  useEffect(() => {
    const resize = () => setPosition((current) => { const next = clamp(current); positionRef.current = next; return next })
    addEventListener('resize', resize); return () => removeEventListener('resize', resize)
  })
  return createPortal(<section ref={panelRef} className={`floating-window ${minimized ? 'is-minimized' : ''}`} style={{ left: position.x, top: position.y, zIndex }} onPointerDown={focus} aria-label={title}>
    <header className="floating-window-titlebar" onDoubleClick={() => setMinimized((value) => !value)} onPointerDown={(event) => { if ((event.target as HTMLElement).closest('button')) return; focus(); dragRef.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y }; event.currentTarget.setPointerCapture(event.pointerId) }} onPointerMove={move} onPointerUp={end}>
      <div><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</div><nav><button aria-label={minimized ? `Restore ${title}` : `Minimize ${title}`} onClick={() => setMinimized((value) => !value)}>{minimized ? <Square size={11} /> : <Minus size={13} />}</button><button aria-label={`Close ${title}`} onClick={onClose}><X size={13} /></button></nav>
    </header>
    {!minimized && <><div className="floating-window-content">{children}</div>{footer && <footer>{footer}</footer>}</>}
  </section>, document.body)
}

function readPosition(id: string, fallback: { x: number; y: number }): { x: number; y: number } {
  try { const value = sessionStorage.getItem(`edon.window.${id}`); const parsed = value ? JSON.parse(value) as Partial<{ x: number; y: number }> : {}; return { x: typeof parsed.x === 'number' ? parsed.x : fallback.x, y: typeof parsed.y === 'number' ? parsed.y : fallback.y } } catch { return fallback }
}
