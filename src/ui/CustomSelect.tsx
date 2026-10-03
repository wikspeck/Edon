import { Children, isValidElement, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { ViewportLayer } from './ViewportLayer'

interface Props { value?: string | number; defaultValue?: string | number; disabled?: boolean; children: ReactNode; onChange?: (event: { target: { value: string } }) => void; 'aria-label'?: string; className?: string }
interface Option { value: string; label: ReactNode; disabled?: boolean }
function optionsFrom(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child): Option[] => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return []
    if (child.type === 'option') return [{ value: String(child.props.value ?? child.props.children ?? ''), label: child.props.children, disabled: child.props.disabled }]
    return optionsFrom(child.props.children)
  })
}
export function CustomSelect({ value, defaultValue, children, disabled, onChange, 'aria-label': label, className = '' }: Props) {
  const options = optionsFrom(children)
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ''))
  const selected = String(value ?? internal)
  const [menuWidth, setMenuWidth] = useState(150)
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const anchor = useRef<HTMLButtonElement>(null)
  const id = useId()
  const choose = (option: Option) => { if (option.disabled) return; setInternal(option.value); onChange?.({ target: { value: option.value } }); setOpen(false); anchor.current?.focus() }
  const move = (direction: number) => { let next = index; for (let count = 0; count < options.length; count++) { next = (next + direction + options.length) % options.length; if (!options[next].disabled) break } setIndex(next) }
  return <><button ref={anchor} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${index}` : undefined} disabled={disabled} className={`custom-select ${className}`} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); setMenuWidth(event.currentTarget.offsetWidth); setIndex(Math.max(0, options.findIndex((option) => option.value === selected))); setOpen(!open) }} onKeyDown={(event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) { setOpen(true); setIndex(Math.max(0, options.findIndex((option) => option.value === selected))) } else move(event.key === 'ArrowDown' ? 1 : -1) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (open && options[index]) choose(options[index]); else setOpen(true) }
    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setOpen(true); const enabled = options.map((option, at) => option.disabled ? -1 : at).filter((at) => at >= 0); setIndex((event.key === 'Home' ? enabled[0] : enabled.at(-1)) ?? 0) }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
    else if (event.key === 'Tab') setOpen(false)
    else if (event.key.length === 1) { const found = options.findIndex((option) => !option.disabled && String(option.label).toLowerCase().startsWith(event.key.toLowerCase())); if (found >= 0) { setIndex(found); setOpen(true) } }
  }}><span>{options.find((option) => option.value === selected)?.label ?? 'Choose…'}</span><ChevronDown size={12} /></button>{open && <ViewportLayer anchor={anchor} onDismiss={() => setOpen(false)}><div id={id} role="listbox" aria-label={label} className="custom-select-menu" style={{ minWidth: menuWidth }} onPointerDown={(event) => event.stopPropagation()}>{options.map((option, at) => <div key={option.value} id={`${id}-${at}`} role="option" aria-selected={option.value === selected} aria-disabled={option.disabled} className={at === index ? 'is-highlighted' : ''} onMouseDown={(event) => event.preventDefault()} onPointerMove={() => setIndex(at)} onClick={(event) => { event.stopPropagation(); choose(option) }}><span>{option.label}</span>{option.value === selected && <Check size={12} />}</div>)}</div></ViewportLayer>}</>
}
