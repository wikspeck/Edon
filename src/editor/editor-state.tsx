import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { getActivePage, type EdonDocument, type EdonElement, type ElementType } from '../model/document'

export type EditorTool = 'select' | 'frame' | 'rectangle' | 'ellipse' | 'text' | 'image' | 'hand'

interface EditorState {
  document: EdonDocument
  selectedId: string | null
  tool: EditorTool
  zoom: number
  pan: { x: number; y: number }
  leftPanelOpen: boolean
  rightPanelOpen: boolean
  past: EdonDocument[]
  future: EdonDocument[]
  transactionBase: EdonDocument | null
}

type Action =
  | { type: 'SELECT'; id: string | null }
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | { type: 'TOGGLE_PANEL'; panel: 'left' | 'right' }
  | { type: 'COMMIT_DOCUMENT'; document: EdonDocument }
  | { type: 'LIVE_DOCUMENT'; document: EdonDocument }
  | { type: 'BEGIN_TRANSACTION' }
  | { type: 'END_TRANSACTION' }
  | { type: 'UNDO' }
  | { type: 'REDO' }

const touch = (document: EdonDocument): EdonDocument => ({ ...document, updatedAt: new Date().toISOString() })

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SELECT':
      return { ...state, selectedId: action.id }
    case 'SET_TOOL':
      return { ...state, tool: action.tool }
    case 'SET_ZOOM':
      return { ...state, zoom: Math.min(4, Math.max(0.1, action.zoom)) }
    case 'SET_PAN':
      return { ...state, pan: action.pan }
    case 'TOGGLE_PANEL':
      return action.panel === 'left'
        ? { ...state, leftPanelOpen: !state.leftPanelOpen }
        : { ...state, rightPanelOpen: !state.rightPanelOpen }
    case 'COMMIT_DOCUMENT':
      return {
        ...state,
        document: touch(action.document),
        past: [...state.past.slice(-79), state.document],
        future: [],
      }
    case 'LIVE_DOCUMENT':
      return { ...state, document: action.document }
    case 'BEGIN_TRANSACTION':
      return { ...state, transactionBase: state.document }
    case 'END_TRANSACTION':
      if (!state.transactionBase || state.transactionBase === state.document) {
        return { ...state, transactionBase: null }
      }
      return {
        ...state,
        document: touch(state.document),
        past: [...state.past.slice(-79), state.transactionBase],
        future: [],
        transactionBase: null,
      }
    case 'UNDO': {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        ...state,
        document: previous,
        past: state.past.slice(0, -1),
        future: [state.document, ...state.future],
        selectedId: null,
      }
    }
    case 'REDO': {
      const next = state.future[0]
      if (!next) return state
      return {
        ...state,
        document: next,
        past: [...state.past, state.document],
        future: state.future.slice(1),
        selectedId: null,
      }
    }
  }
}

interface EditorContextValue extends EditorState {
  page: ReturnType<typeof getActivePage>
  selectedElement: EdonElement | null
  setTool: (tool: EditorTool) => void
  select: (id: string | null) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  togglePanel: (panel: 'left' | 'right') => void
  renameDocument: (name: string) => void
  addElement: (element: EdonElement) => void
  updateElement: (id: string, patch: Partial<EdonElement>, live?: boolean) => void
  removeSelected: () => void
  reorderElement: (id: string, direction: 'up' | 'down') => void
  toggleElement: (id: string, property: 'visible' | 'locked') => void
  beginTransaction: () => void
  endTransaction: () => void
  undo: () => void
  redo: () => void
}

const EditorContext = createContext<EditorContextValue | null>(null)

function updatePage(document: EdonDocument, updater: (elements: EdonElement[]) => EdonElement[]): EdonDocument {
  return {
    ...document,
    pages: document.pages.map((page) => page.id === document.activePageId
      ? { ...page, elements: updater(page.elements) }
      : page),
  }
}

export function EditorProvider({ initialDocument, children }: { initialDocument: EdonDocument; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    document: initialDocument,
    selectedId: null,
    tool: 'select' as EditorTool,
    zoom: 0.5,
    pan: { x: 0, y: 0 },
    leftPanelOpen: true,
    rightPanelOpen: true,
    past: [],
    future: [],
    transactionBase: null,
  })

  const page = getActivePage(state.document)
  const selectedElement = page.elements.find((element) => element.id === state.selectedId) ?? null

  const value = useMemo<EditorContextValue>(() => ({
    ...state,
    page,
    selectedElement,
    setTool: (tool) => dispatch({ type: 'SET_TOOL', tool }),
    select: (id) => dispatch({ type: 'SELECT', id }),
    setZoom: (zoom) => dispatch({ type: 'SET_ZOOM', zoom }),
    setPan: (pan) => dispatch({ type: 'SET_PAN', pan }),
    togglePanel: (panel) => dispatch({ type: 'TOGGLE_PANEL', panel }),
    renameDocument: (name) => dispatch({ type: 'COMMIT_DOCUMENT', document: { ...state.document, name } }),
    addElement: (element) => {
      dispatch({ type: 'COMMIT_DOCUMENT', document: updatePage(state.document, (elements) => [...elements, element]) })
      dispatch({ type: 'SELECT', id: element.id })
    },
    updateElement: (id, patch, live = false) => dispatch({
      type: live ? 'LIVE_DOCUMENT' : 'COMMIT_DOCUMENT',
      document: updatePage(state.document, (elements) => elements.map((element) => element.id === id ? { ...element, ...patch } : element)),
    }),
    removeSelected: () => {
      if (!state.selectedId) return
      dispatch({ type: 'COMMIT_DOCUMENT', document: updatePage(state.document, (elements) => elements.filter((element) => element.id !== state.selectedId)) })
      dispatch({ type: 'SELECT', id: null })
    },
    reorderElement: (id, direction) => {
      const index = page.elements.findIndex((element) => element.id === id)
      const target = direction === 'up' ? index + 1 : index - 1
      if (index < 0 || target < 0 || target >= page.elements.length) return
      dispatch({ type: 'COMMIT_DOCUMENT', document: updatePage(state.document, (elements) => {
        const next = [...elements]
        ;[next[index], next[target]] = [next[target], next[index]]
        return next
      }) })
    },
    toggleElement: (id, property) => {
      const element = page.elements.find((item) => item.id === id)
      if (element) dispatch({ type: 'COMMIT_DOCUMENT', document: updatePage(state.document, (elements) => elements.map((item) => item.id === id ? { ...item, [property]: !item[property] } : item)) })
    },
    beginTransaction: () => dispatch({ type: 'BEGIN_TRANSACTION' }),
    endTransaction: () => dispatch({ type: 'END_TRANSACTION' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
  }), [page, selectedElement, state])

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext)
  if (!context) throw new Error('useEditor must be used inside EditorProvider')
  return context
}

export const TOOL_LABELS: Record<EditorTool, string> = {
  select: 'Select',
  frame: 'Frame',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  text: 'Text',
  image: 'Image',
  hand: 'Hand',
}

export const DRAWABLE_TOOLS: ElementType[] = ['frame', 'rectangle', 'ellipse', 'text']
