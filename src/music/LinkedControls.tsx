import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GroupContext } from './linked-control-context'
import type { Group, Parameter } from './linked-control-context'
import { linkedValue } from './dj-planner'

export function LinkedControls({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([])
  const parameters = useRef(new Map<string, Parameter>()); const inverse = useRef(false)
  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.code === 'Digit1' && !(event.target as HTMLElement).closest('textarea,input:not([type=range]),[contenteditable=true]')) inverse.current = true; if (event.key === 'Escape') setSelected([]) }
    const up = (event: KeyboardEvent) => { if (event.code === 'Digit1') inverse.current = false }
    const blur = () => { inverse.current = false }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [])
  const group: Group = {
    selected,
    register: (id, parameter) => { parameters.current.set(id, parameter); return () => { parameters.current.delete(id) } },
    select: (id) => setSelected((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]),
    change: (id, value) => {
      const source = parameters.current.get(id); if (!source) return
      if (!selected.includes(id) || selected.length < 2) { source.change(value); return }
      const delta = (value - source.value) / (source.max - source.min) * (inverse.current && id !== selected[0] ? -1 : 1)
      for (const target of selected) { const parameter = parameters.current.get(target); if (parameter) parameter.change(linkedValue(parameter.value, parameter.min, parameter.max, delta, inverse.current && target !== selected[0])) }
    },
  }
  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
}
