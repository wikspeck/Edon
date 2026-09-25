import { createContext, useContext, useReducer, useRef, type ReactNode } from 'react'
import { createId, getActivePage, type BrushPreset, type EdonDocument, type EdonElement, type ElementType, type PaletteColor } from '../model/document'
import { alignSelection, copyPayload, deleteSelection, distributeSelection, duplicateSelection, groupSelection, pastePayload, renameElement, reorderSelection, ungroupSelection, updateElements, type AlignMode, type DistributeMode, type LayerOrder, type SceneResult } from './scene-commands'
import { booleanElements, canBoolean, type BooleanOperation } from './vector-boolean'
import { insertAboveSelection, moveLayer } from './scene-tree'

export type EditorTool = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'star' | 'text' | 'image' | 'hand' | 'pencil' | 'pen' | 'brush' | 'eraser' | 'eyedropper' | 'fill'
export type GapClosing = 'off' | 'small' | 'medium' | 'large'
export interface ArtToolSettings { color: string; size: number; opacity: number; hardness: number; smoothing: number; stabilization: number; simplify: number; brushPreset: BrushPreset; antiAlias: boolean; fillTolerance: number; gapClosing: GapClosing; contiguous: boolean }
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
  silhouettePreview: boolean
  vectorEditId: string | null
  artSettings: ArtToolSettings
  recentColors: string[]
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
  | { type: 'SET_SILHOUETTE'; value: boolean }
  | { type: 'SET_VECTOR_EDIT'; id: string | null }
  | { type: 'SET_ART_SETTINGS'; patch: Partial<ArtToolSettings> }
  | { type: 'REMEMBER_COLOR'; color: string }

const touch = (document: EdonDocument, previousRevision = document.revision): EdonDocument => ({ ...document, revision: previousRevision + 1, updatedAt: new Date().toISOString() })

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_SELECTION': return { ...state, selectionIds: action.ids }
    case 'SET_TOOL': return { ...state, tool: action.tool }
    case 'SET_ZOOM': return { ...state, zoom: Math.min(8, Math.max(.05, action.zoom)) }
    case 'SET_PAN': return { ...state, pan: action.pan }
    case 'TOGGLE_PANEL': return action.panel === 'left' ? { ...state, leftPanelOpen: !state.leftPanelOpen } : { ...state, rightPanelOpen: !state.rightPanelOpen }
    case 'COMMIT_DOCUMENT': return { ...state, document: touch(action.document, state.document.revision), selectionIds: action.selectionIds ?? state.selectionIds, past: [...state.past.slice(-99), { document: state.document, label: action.label }], future: [] }
    case 'LIVE_DOCUMENT': return { ...state, document: action.document }
    case 'BEGIN_TRANSACTION': return state.transactionBase ? state : { ...state, transactionBase: state.document, transactionLabel: action.label }
    case 'END_TRANSACTION':
      if (!state.transactionBase || state.transactionBase === state.document) return { ...state, transactionBase: null, transactionLabel: '' }
      return { ...state, document: touch(state.document, state.transactionBase.revision), past: [...state.past.slice(-99), { document: state.transactionBase, label: state.transactionLabel }], future: [], transactionBase: null, transactionLabel: '' }
    case 'UNDO': {
      const previous = state.past.at(-1)
      if (!previous) return state
      const document = touch(previous.document, state.document.revision)
      return { ...state, document, past: state.past.slice(0, -1), future: [{ document: state.document, label: previous.label }, ...state.future], selectionIds: state.selectionIds.filter((id) => getActivePage(document).elements.some((element) => element.id === id)) }
    }
    case 'REDO': {
      const next = state.future[0]
      if (!next) return state
      const document = touch(next.document, state.document.revision)
      return { ...state, document, past: [...state.past, { document: state.document, label: next.label }], future: state.future.slice(1), selectionIds: state.selectionIds.filter((id) => getActivePage(document).elements.some((element) => element.id === id)) }
    }
    case 'SET_CAN_PASTE': return { ...state, canPaste: action.value }
    case 'SET_SILHOUETTE': return { ...state, silhouettePreview: action.value }
    case 'SET_VECTOR_EDIT': return { ...state, vectorEditId: action.id }
    case 'SET_ART_SETTINGS': return { ...state, artSettings: { ...state.artSettings, ...action.patch } }
    case 'REMEMBER_COLOR': return { ...state, recentColors: [action.color, ...state.recentColors.filter((color) => color !== action.color)].slice(0, 8), artSettings: { ...state.artSettings, color: action.color } }
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
  removeElement: (id: string) => void
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
  reorderLayer: (id: string, targetId: string, position: 'above' | 'below') => void
  align: (mode: AlignMode) => void
  distribute: (mode: DistributeMode) => void
  toggleSelection: (property: 'visible' | 'locked') => void
  toggleElement: (id: string, property: 'visible' | 'locked') => void
  booleanOperation: (operation: BooleanOperation) => void
  beginTransaction: (label?: string) => void
  endTransaction: () => void
  undo: () => void
  redo: () => void
  setSilhouettePreview: (value: boolean) => void
  setVectorEdit: (id: string | null) => void
  setArtSettings: (patch: Partial<ArtToolSettings>) => void
  rememberColor: (color: string) => void
  addPaletteColor: (name: string, color: string) => void
  updatePaletteColor: (id: string, patch: Partial<PaletteColor>) => void
  removePaletteColor: (id: string) => void
  createShadowShape: () => void
  selectSame: (mode: 'fill' | 'stroke' | 'type') => void
  replaceColor: (from: string, to: string) => void
  flip: (axis: 'horizontal' | 'vertical', duplicate?: boolean) => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

export function EditorProvider({ initialDocument, children }: { initialDocument: EdonDocument; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    document: initialDocument, selectionIds: [], tool: 'select' as EditorTool, zoom: .5, pan: { x: 0, y: 0 },
    leftPanelOpen: true, rightPanelOpen: true, past: [], future: [], transactionBase: null, transactionLabel: '', canPaste: false,
    silhouettePreview: false, vectorEditId: null, recentColors: [],
    artSettings: { color: '#171719', size: 6, opacity: 1, hardness: 100, smoothing: 55, stabilization: 35, simplify: 24, brushPreset: 'inking' as BrushPreset, antiAlias: true, fillTolerance: 24, gapClosing: 'medium' as GapClosing, contiguous: true },
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
    addElement: (element) => commit(updateElements(state.document, (elements) => insertAboveSelection(elements, element, state.selectionIds)), `Create ${element.name}`, [element.id]),
    removeElement: (id) => commit(updateElements(state.document, (elements) => elements.filter((element) => element.id !== id)), 'Remove empty layer', state.selectionIds.filter((selectionId) => selectionId !== id)),
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
    reorderLayer: (id, targetId, position) => commit(updateElements(state.document, (elements) => moveLayer(elements, id, targetId, position)), 'Reorder layers'),
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
    setSilhouettePreview: (value) => dispatch({ type: 'SET_SILHOUETTE', value }),
    setVectorEdit: (id) => dispatch({ type: 'SET_VECTOR_EDIT', id }),
    setArtSettings: (patch) => dispatch({ type: 'SET_ART_SETTINGS', patch }),
    rememberColor: (color) => dispatch({ type: 'REMEMBER_COLOR', color }),
    addPaletteColor: (name, color) => commit({ ...state.document, palette: [...state.document.palette, { id: createId('swatch'), name: name.trim() || 'Color', color }] }, 'Add palette color'),
    updatePaletteColor: (id, patch) => commit({ ...state.document, palette: state.document.palette.map((item) => item.id === id ? { ...item, ...patch } : item) }, 'Edit palette color'),
    removePaletteColor: (id) => commit({ ...state.document, palette: state.document.palette.filter((item) => item.id !== id) }, 'Remove palette color'),
    createShadowShape: () => {
      if (!selectedElements.length) return
      const shadowIds: string[] = []
      const selected = new Set(state.selectionIds)
      commit(updateElements(state.document, (elements) => {
        const next: EdonElement[] = []
        for (const element of elements) {
          if (selected.has(element.id) && element.type !== 'group') {
            const id = createId(element.type)
            shadowIds.push(id)
            next.push({ ...structuredClone(element), id, name: `${element.name} shadow`, x: element.x + 12, y: element.y + 12, fill: '#241D2A', fillPaint: { type: 'solid', color: '#241D2A' }, stroke: '#241D2A', effects: [], opacity: .82 })
          }
          next.push(element)
        }
        return next
      }), 'Create shadow shape', shadowIds)
    },
    selectSame: (mode) => {
      if (!selectedElement) return
      dispatch({ type: 'SET_SELECTION', ids: page.elements.filter((element) => mode === 'type' ? element.type === selectedElement.type : mode === 'fill' ? element.fill.toLowerCase() === selectedElement.fill.toLowerCase() : element.stroke.toLowerCase() === selectedElement.stroke.toLowerCase()).map((element) => element.id) })
    },
    replaceColor: (from, to) => commit(updateElements(state.document, (elements) => elements.map((element) => ({ ...element, fill: element.fill.toLowerCase() === from.toLowerCase() ? to : element.fill, fillPaint: element.fillPaint.type === 'solid' && element.fillPaint.color.toLowerCase() === from.toLowerCase() ? { type: 'solid', color: to } : element.fillPaint, stroke: element.stroke.toLowerCase() === from.toLowerCase() ? to : element.stroke }))), 'Replace color'),
    flip: (axis, duplicate = false) => {
      let ids = state.selectionIds
      let document = state.document
      if (duplicate) { const result = duplicateSelection(document, ids, 16); document = result.document; ids = result.selectionIds }
      commit(updateElements(document, (elements) => elements.map((element) => ids.includes(element.id) ? { ...element, [axis === 'horizontal' ? 'scaleX' : 'scaleY']: -element[axis === 'horizontal' ? 'scaleX' : 'scaleY'] } : element)), `${duplicate ? 'Mirror duplicate' : 'Flip'} ${axis}`, ids)
    },
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor(): EditorContextValue { const context = useContext(EditorContext); if (!context) throw new Error('useEditor must be used inside EditorProvider'); return context }

export const TOOL_LABELS: Record<EditorTool, string> = { select: 'Select', frame: 'Frame', rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Line', arrow: 'Arrow', polygon: 'Polygon', star: 'Star', text: 'Text', image: 'Image', hand: 'Hand', pencil: 'Pencil', pen: 'Pen', brush: 'Brush', eraser: 'Eraser', eyedropper: 'Eyedropper', fill: 'Paint Bucket' }
export const DRAWABLE_TOOLS: ElementType[] = ['frame', 'rectangle', 'ellipse', 'line', 'arrow', 'polygon', 'star', 'text']
