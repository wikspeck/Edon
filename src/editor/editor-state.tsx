import { createContext, useContext, useReducer, useRef, type ReactNode } from 'react'
import { getActivePage, type EdonDocument, type EdonElement, type ElementType } from '../model/document'
import { alignSelection, copyPayload, deleteSelection, distributeSelection, duplicateSelection, groupSelection, pastePayload, renameElement, reorderSelection, ungroupSelection, updateElements, type AlignMode, type DistributeMode, type LayerOrder, type SceneResult } from './scene-commands'
import { booleanElements, canBoolean, type BooleanOperation } from './vector-boolean'

export type EditorTool = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'star' | 'text' | 'image' | 'hand'
interface HistoryEntry { document: EdonDocument; label: string }

interface EditorState {
  document: EdonDocument
  selectionIds: string[]
  tool: EditorTool
  zoom: number
  pan: { x: number; y: number }
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  past: HistoryEntry[]
  future: HistoryEntry[]
  transactionBase: EdonDocument | null
  transactionLabel: string
  canPaste: boolean
}

type Action =
  | { type: 'SET_SELECTION'; ids: string[] }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | { type: 'TOGGLE_PANEL'; panel: 'left' | 'right' }
  | { type: 'COMMIT_DOCUMENT'; document: EdonDocument; label: string; selectionIds?: string[] }
  | { type: 'LIVE_DOCUMENT'; document: EdonDocument }
  | { type: 'BEGIN_TRANSACTION'; label: string }
  | { type: 'END_TRANSACTION' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_CAN_PASTE'; value: boolean }

const touch = (document: EdonDocument): EdonDocument => ({ ...document, updatedAt: new Date().toISOString() })

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_SELECTION': return { ...state, selectionIds: action.ids }
    case 'SET_TOOL': return { ...state, tool: action.tool }
    case 'SET_ZOOM': return { ...state, zoom: Math.min(8, Math.max(.05, action.zoom)) }
    case 'SET_PAN': return { ...state, pan: action.pan }
    case 'TOGGLE_PANEL': return action.panel === 'left' ? { ...state, leftPanelOpen: !state.leftPanelOpen } : { ...state, rightPanelOpen: !state.rightPanelOpen }
    case 'COMMIT_DOCUMENT': return { ...state, document: touch(action.document), selectionIds: action.selectionIds ?? state.selectionIds, past: [...state.past.slice(-99), { document: state.document, label: action.label }], future: [] }
    case 'LIVE_DOCUMENT': return { ...state, document: action.document }
    case 'BEGIN_TRANSACTION': return state.transactionBase ? state : { ...state, transactionBase: state.document, transactionLabel: action.label }
    case 'END_TRANSACTION':
      if (!state.transactionBase || state.transactionBase === state.document) return { ...state, transactionBase: null, transactionLabel: '' }
      return { ...state, document: touch(state.document), past: [...state.past.slice(-99), { document: state.transactionBase, label: state.transactionLabel }], future: [], transactionBase: null, transactionLabel: '' }
    case 'UNDO': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return { ...state, document: previous.document, past: state.past.slice(0, -1), future: [{ document: state.document, label: previous.label }, ...state.future], selectionIds: state.selectionIds.filter((id) => getActivePage(previous.document).elements.some((element) => element.id === id)) }
    }
    case 'REDO': {
      const next = state.future[0]
      if (!next) return state
      return { ...state, document: next.document, past: [...state.past, { document: state.document, label: next.label }], future: state.future.slice(1), selectionIds: state.selectionIds.filter((id) => getActivePage(next.document).elements.some((element) => element.id === id)) }
    }
    case 'SET_CAN_PASTE': return { ...state, canPaste: action.value }
  }
}

interface EditorContextValue extends EditorState {
  page: ReturnType<typeof getActivePage>
  selectedElements: EdonElement[]
  selectedElement: EdonElement | null
  canBooleanSelection: boolean
  setTool: (tool: EditorTool) => void
  select: (id: string | null, additive?: boolean) => void
  selectMany: (ids: string[]) => void
  selectAll: () => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  togglePanel: (panel: 'left' | 'right') => void
  renameDocument: (name: string) => void
  renameLayer: (id: string, name: string) => void
  addElement: (element: EdonElement) => void
  updateElement: (id: string, patch: Partial<EdonElement>, live?: boolean) => void
  updateSelected: (patch: Partial<EdonElement>, live?: boolean) => void
  mutateElements: (updater: (elements: EdonElement[]) => EdonElement[], live?: boolean, label?: string) => void
  removeSelected: () => void
  duplicate: (offset?: number) => string[]
  copy: () => void
  cut: () => void
  paste: () => void
  group: () => void
  ungroup: () => void
  reorder: (mode: LayerOrder) => void
  reorderLayer: (id: string, targetId: string) => void
  align: (mode: AlignMode) => void
  distribute: (mode: DistributeMode) => void
  toggleSelection: (property: 'visible' | 'locked') => void
  toggleElement: (id: string, property: 'visible' | 'locked') => void
  booleanOperation: (operation: BooleanOperation) => void
  beginTransaction: (label?: string) => void
  endTransaction: () => void
  undo: () => void
  redo: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ initialDocument, children }: { initialDocument: EdonDocument; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    document: initialDocument, selectionIds: [], tool: 'select' as EditorTool, zoom: .5, pan: { x: 0, y: 0 },
    leftPanelOpen: true, rightPanelOpen: true, past: [], future: [], transactionBase: null, transactionLabel: '', canPaste: false,
  })
  const clipboard = useRef<EdonElement[]>([])
  const pasteCount = useRef(0)
  const page = getActivePage(state.document)
  const selectedElements = state.selectionIds.map((id) => page.elements.find((element) => element.id === id)).filter((element): element is EdonElement => Boolean(element))
  const selectedElement = selectedElements.at(-1) ?? null

  const commit = (document: EdonDocument, label: string, selectionIds?: string[]) => dispatch({ type: 'COMMIT_DOCUMENT', document, label, selectionIds })
  const commitResult = (result: SceneResult, label: string) => commit(result.document, label, result.selectionIds)

  const value: EditorContextValue = {
    ...state, page, selectedElements, selectedElement, canBooleanSelection: canBoolean(selectedElements),
    setTool: (tool) => dispatch({ type: 'SET_TOOL', tool }),
    select: (id, additive = false) => {
      if (!id) dispatch({ type: 'SET_SELECTION', ids: [] })
      else if (additive) dispatch({ type: 'SET_SELECTION', ids: state.selectionIds.includes(id) ? state.selectionIds.filter((selectedId) => selectedId !== id) : [...state.selectionIds, id] })
      else dispatch({ type: 'SET_SELECTION', ids: [id] })
    },
    selectMany: (ids) => dispatch({ type: 'SET_SELECTION', ids: [...new Set(ids)] }),
    selectAll: () => dispatch({ type: 'SET_SELECTION', ids: page.elements.filter((element) => !element.parentId && element.visible && !element.locked).map((element) => element.id) }),
    setZoom: (zoom) => dispatch({ type: 'SET_ZOOM', zoom }),
    setPan: (pan) => dispatch({ type: 'SET_PAN', pan }),
    togglePanel: (panel) => dispatch({ type: 'TOGGLE_PANEL', panel }),
    renameDocument: (name) => commit({ ...state.document, name }, 'Rename document'),
    renameLayer: (id, name) => commit(renameElement(state.document, id, name), 'Rename layer'),
    addElement: (element) => commit(updateElements(state.document, (elements) => [...elements, element]), `Create ${element.name}`, [element.id]),
    updateElement: (id, patch, live = false) => dispatch({ type: live ? 'LIVE_DOCUMENT' : 'COMMIT_DOCUMENT', document: updateElements(state.document, (elements) => elements.map((element) => element.id === id ? { ...element, ...patch } : element)), ...(live ? {} : { label: 'Edit properties' }) } as Action),
    updateSelected: (patch, live = false) => dispatch({ type: live ? 'LIVE_DOCUMENT' : 'COMMIT_DOCUMENT', document: updateElements(state.document, (elements) => elements.map((element) => state.selectionIds.includes(element.id) ? { ...element, ...patch } : element)), ...(live ? {} : { label: 'Edit selection' }) } as Action),
    mutateElements: (updater, live = false, label = 'Transform selection') => dispatch({ type: live ? 'LIVE_DOCUMENT' : 'COMMIT_DOCUMENT', document: updateElements(state.document, updater), ...(live ? {} : { label }) } as Action),
    removeSelected: () => state.selectionIds.length && commitResult(deleteSelection(state.document, state.selectionIds), 'Delete selection'),
    duplicate: (offset = 16) => { if (!state.selectionIds.length) return []; const result = duplicateSelection(state.document, state.selectionIds, offset); commitResult(result, 'Duplicate selection'); return result.selectionIds },
    copy: () => { clipboard.current = copyPayload(page.elements, state.selectionIds); pasteCount.current = 0; dispatch({ type: 'SET_CAN_PASTE', value: clipboard.current.length > 0 }) },
    cut: () => { clipboard.current = copyPayload(page.elements, state.selectionIds); pasteCount.current = 0; dispatch({ type: 'SET_CAN_PASTE', value: clipboard.current.length > 0 }); if (state.selectionIds.length) commitResult(deleteSelection(state.document, state.selectionIds), 'Cut selection') },
    paste: () => { if (clipboard.current.length) { pasteCount.current += 1; commitResult(pastePayload(state.document, clipboard.current, pasteCount.current * 16), 'Paste') } },
    group: () => commitResult(groupSelection(state.document, state.selectionIds), 'Group selection'),
    ungroup: () => commitResult(ungroupSelection(state.document, state.selectionIds), 'Ungroup selection'),
    reorder: (mode) => commit(reorderSelection(state.document, state.selectionIds, mode), `Move ${mode}`),
    reorderLayer: (id, targetId) => commit(updateElements(state.document, (elements) => { const next = [...elements]; const from = next.findIndex((element) => element.id === id); const to = next.findIndex((element) => element.id === targetId); if (from < 0 || to < 0 || from === to) return elements; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next }), 'Reorder layers'),
    align: (mode) => commit(alignSelection(state.document, state.selectionIds, mode), `Align ${mode}`),
    distribute: (mode) => commit(distributeSelection(state.document, state.selectionIds, mode), `Distribute ${mode}`),
    toggleSelection: (property) => { if (!selectedElements.length) return; const next = !selectedElements.every((element) => element[property]); commit(updateElements(state.document, (elements) => elements.map((element) => state.selectionIds.includes(element.id) ? { ...element, [property]: next } : element)), `${next ? 'Enable' : 'Disable'} ${property}`, property === 'visible' && !next ? [] : undefined) },
    toggleElement: (id, property) => { const element = page.elements.find((item) => item.id === id); if (element) commit(updateElements(state.document, (elements) => elements.map((item) => item.id === id ? { ...item, [property]: !item[property] } : item)), `${element[property] ? 'Disable' : 'Enable'} ${property}`) },
    booleanOperation: (operation) => {
      const ordered = page.elements.filter((element) => state.selectionIds.includes(element.id))
      if (!canBoolean(ordered)) return
      void booleanElements(ordered[0], ordered[1], operation).then((result) => {
        if (!result) return
        const ids = new Set(ordered.map((element) => element.id))
        commit(updateElements(state.document, (elements) => [...elements.filter((element) => !ids.has(element.id)), result]), `Boolean ${operation}`, [result.id])
      })
    },
    beginTransaction: (label = 'Transform selection') => dispatch({ type: 'BEGIN_TRANSACTION', label }),
    endTransaction: () => dispatch({ type: 'END_TRANSACTION' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor(): EditorContextValue { const context = useContext(EditorContext); if (!context) throw new Error('useEditor must be used inside EditorProvider'); return context }

export const TOOL_LABELS: Record<EditorTool, string> = { select: 'Select', frame: 'Frame', rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Line', arrow: 'Arrow', polygon: 'Polygon', star: 'Star', text: 'Text', image: 'Image', hand: 'Hand' }
export const DRAWABLE_TOOLS: ElementType[] = ['frame', 'rectangle', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'text']
