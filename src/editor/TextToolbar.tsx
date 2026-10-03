import { CustomSelect } from '../ui/CustomSelect'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, List, ListOrdered, Underline } from 'lucide-react'
import type { EdonElement } from '../model/document'
import { useEditor } from './editor-state'
import { FONT_FAMILIES } from './text-style'
import { cleanDocHtml } from './doc-format'

interface Props { targetRef?: RefObject<HTMLDivElement | null>; element?: EdonElement; onChange?: () => void }

export function TextToolbar({ targetRef, element, onChange }: Props) {
  const editor = useEditor()
  const savedRange = useRef<Range | null>(null)
  const [font, setFont] = useState<string>(element?.fontFamily ?? FONT_FAMILIES[0].value)
  const [size, setSize] = useState(element?.fontSize ?? 16)
  const [marks, setMarks] = useState({ active: false, bold: false, italic: false, underline: false })
  const target = () => targetRef?.current ?? (element ? document.querySelector<HTMLDivElement>(`[data-element-id="${element.id}"] [contenteditable="true"]`) : null)
  useEffect(() => {
    const capture = () => {
      const root = targetRef?.current ?? (element?.id ? document.querySelector<HTMLElement>(`[data-element-id="${element.id}"] [contenteditable="true"]`) : null)
      const selection = window.getSelection()
      if (!root) setMarks((current) => current.active ? { ...current, active: false } : current)
      if (root && selection?.rangeCount && root.contains(selection.anchorNode) && root.contains(selection.focusNode)) {
        savedRange.current = selection.getRangeAt(0).cloneRange()
        if (document.activeElement === root) {
          let node: Node | null = selection.anchorNode
          if (node instanceof Element) node = node.childNodes[selection.anchorOffset] ?? node
          while (node instanceof Element && node.firstChild) node = node.firstChild
          const owner = node instanceof Element ? node : node?.parentElement
          if (owner) {
            const style = getComputedStyle(owner); const family = FONT_FAMILIES.find((item) => item.value.toLowerCase() === style.fontFamily.toLowerCase())
            if (family) setFont(family.value)
            setSize(Math.round(parseFloat(style.fontSize)))
          }
          setMarks({ active: true, bold: document.queryCommandState('bold'), italic: document.queryCommandState('italic'), underline: document.queryCommandState('underline') })
        }
      }
    }
    document.addEventListener('selectionchange', capture)
    return () => document.removeEventListener('selectionchange', capture)
  }, [element?.id, targetRef])
  const rememberSelection = () => {
    const selection = window.getSelection(); const root = target()
    if (root && selection?.rangeCount && root.contains(selection.anchorNode) && root.contains(selection.focusNode)) savedRange.current = selection.getRangeAt(0).cloneRange()
  }
  const restoreSelection = () => {
    const root = target(); if (!root) return null
    root.focus(); const selection = window.getSelection()
    if (savedRange.current && root.contains(savedRange.current.commonAncestorContainer)) { selection?.removeAllRanges(); selection?.addRange(savedRange.current) }
    return root
  }
  const save = () => {
    const root = target()
    if (root && element) editor.updateElement(element.id, { text: root.innerText, textHtml: cleanDocHtml(root.innerHTML), height: Math.max(element.height, root.scrollHeight) })
    onChange?.(); rememberSelection()
  }
  const inlineStyle = (property: 'fontFamily' | 'fontSize', value: string) => {
    const root = restoreSelection(); const selection = window.getSelection()
    if (!root || !selection?.rangeCount || !root.contains(selection.anchorNode)) return
    const range = selection.getRangeAt(0); const span = document.createElement('span'); span.style[property] = value
    const collapsed = range.collapsed; span.append(range.extractContents()); if (collapsed) span.textContent = '\u200b'
    range.insertNode(span); const next = document.createRange(); next.selectNodeContents(span); if (collapsed) next.collapse(false)
    selection.removeAllRanges(); selection.addRange(next); save()
  }
  const format = (command: string, patch?: Partial<EdonElement>) => {
    const root = restoreSelection()
    if (root) { document.execCommand(command, false); save() }
    else if (element && patch) editor.updateElement(element.id, patch)
    else if (element && (command === 'insertUnorderedList' || command === 'insertOrderedList')) {
      const tag = command === 'insertOrderedList' ? 'ol' : 'ul'
      const holder = document.createElement('div')
      holder.innerHTML = cleanDocHtml(element.textHtml ?? (element.text ?? '').split('\n').map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join(''))
      if (holder.firstElementChild?.tagName.toLowerCase() === tag) holder.innerHTML = [...holder.querySelectorAll('li')].map((item) => `<p>${item.innerHTML}</p>`).join('')
      else holder.innerHTML = `<${tag}>${[...holder.childNodes].map((node) => `<li>${node instanceof Element ? node.outerHTML : node.textContent?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') ?? ''}</li>`).join('')}</${tag}>`
      editor.updateElement(element.id, { textHtml: cleanDocHtml(holder.innerHTML) })
    }
  }
  const iconButton = (label: string, command: string, icon: React.ReactNode, patch?: Partial<EdonElement>, active?: boolean) => <button type="button" title={label} aria-label={label} aria-pressed={active} onMouseDown={(event) => event.preventDefault()} onClick={() => format(command, patch)}>{icon}</button>
  return <div className="text-format-toolbar" aria-label="Text formatting" onPointerDownCapture={rememberSelection} onFocusCapture={rememberSelection}>
    <CustomSelect aria-label="Font family" value={font} onChange={(event) => { const value = event.target.value; setFont(value); if (target()) inlineStyle('fontFamily', value); else if (element) editor.updateElement(element.id, { fontFamily: value }) }}>{FONT_FAMILIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</CustomSelect>
    <input aria-label="Font size in pixels" title="Font size (px)" type="number" min={1} max={512} value={size} onChange={(event) => setSize(Number(event.target.value))} onBlur={() => { const value = Math.max(1, Math.min(512, size || 16)); setSize(value); if (target()) inlineStyle('fontSize', `${value}px`); else if (element) editor.updateElement(element.id, { fontSize: value }) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }} /><span className="text-unit">px</span>
    <i className="format-divider" />
    {iconButton('Bold', 'bold', <Bold size={16} />, { fontWeight: (element?.fontWeight ?? 400) >= 600 ? 400 : 700 }, marks.active ? marks.bold : (element?.fontWeight ?? 400) >= 600)}
    {iconButton('Italic', 'italic', <Italic size={16} />, { italic: !element?.italic }, marks.active ? marks.italic : element?.italic)}
    {iconButton('Underline', 'underline', <Underline size={16} />, { underline: !element?.underline }, marks.active ? marks.underline : element?.underline)}
    <i className="format-divider" />
    {iconButton('Align left', 'justifyLeft', <AlignLeft size={16} />, { textAlign: 'left' })}
    {iconButton('Align center', 'justifyCenter', <AlignCenter size={16} />, { textAlign: 'center' })}
    {iconButton('Align right', 'justifyRight', <AlignRight size={16} />, { textAlign: 'right' })}
    {iconButton('Justify', 'justifyFull', <AlignJustify size={16} />, { textAlign: 'justify' })}
    <i className="format-divider" />
    {iconButton('Bullet list', 'insertUnorderedList', <List size={16} />)}
    {iconButton('Numbered list', 'insertOrderedList', <ListOrdered size={16} />)}
  </div>
}
