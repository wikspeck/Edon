import { useEffect, useRef } from 'react'
import type { Slot } from './dj-transport'
import { crossfadeDelta } from './dj-planner'

export function useHeldDJKeys(actions: { onMove: (delta: number) => void; onNudge: (slot: Slot, direction: number) => void; focused: Slot }) {
  const current = useRef(actions)
  useEffect(() => { current.current = actions }, [actions])
  useEffect(() => {
    const keys = new Set<string>(); const nudges = new Map<string, Slot>(); let frame = 0; let previous = 0
    const ignored = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('textarea,input:not([type=range]),[contenteditable]:not([contenteditable=false]),[role=combobox],[role=listbox],[role=separator]'))
    const updateNudge = (slot: Slot) => { let direction = 0; for (const [key, deck] of nudges) if (deck === slot) direction += key === 'KeyV' ? 1 : -1; current.current.onNudge(slot, direction) }
    const clear = () => { keys.clear(); const slots = new Set(nudges.values()); nudges.clear(); for (const slot of slots) current.current.onNudge(slot, 0) }
    const down = (event: KeyboardEvent) => {
      if (ignored(event.target) || event.ctrlKey || event.metaKey || event.altKey) return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation()
        if (!keys.has(event.key) && ['ArrowLeft', 'ArrowRight'].includes(event.key)) current.current.onMove(0)
        keys.add(event.key)
      } else if (event.code === 'KeyZ' || event.code === 'KeyV') {
        event.preventDefault(); event.stopPropagation()
        if (!nudges.has(event.code)) { const slot = current.current.focused; nudges.set(event.code, slot); updateNudge(slot) }
      }
    }
    const up = (event: KeyboardEvent) => { keys.delete(event.key); const slot = nudges.get(event.code); if (slot !== undefined) { nudges.delete(event.code); updateNudge(slot) } }
    const focus = (event: FocusEvent) => { if (ignored(event.target)) clear() }
    const visibility = () => { if (document.hidden) clear() }
    const tick = (time: number) => { const delta = crossfadeDelta(keys, previous ? (time - previous) / 1000 : 0); previous = time; if (delta) current.current.onMove(delta); frame = requestAnimationFrame(tick) }
    window.addEventListener('keydown', down, true); window.addEventListener('keyup', up, true); window.addEventListener('blur', clear); window.addEventListener('focusin', focus); document.addEventListener('visibilitychange', visibility); frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up, true); window.removeEventListener('blur', clear); window.removeEventListener('focusin', focus); document.removeEventListener('visibilitychange', visibility); clear() }
  }, [])
}
