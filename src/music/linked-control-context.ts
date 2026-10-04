import { createContext, useContext, useEffect } from 'react'
export interface Parameter { value: number; min: number; max: number; change: (value: number) => void }
export interface Group { selected: string[]; register: (id: string, parameter: Parameter) => () => void; select: (id: string) => void; change: (id: string, value: number) => void }
export const GroupContext = createContext<Group | null>(null)
export function useLinkedControl(id: string, parameter: Parameter) {
  const group = useContext(GroupContext); const register = group?.register
  useEffect(() => register?.(id, parameter), [register, id, parameter])
  return { selected: group?.selected.includes(id) ?? false, select: () => group?.select(id), change: (value: number) => group ? group.change(id, value) : parameter.change(value) }
}
