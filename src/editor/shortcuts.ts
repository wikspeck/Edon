import type { EditorTool } from './editor-state'

export const TOOL_SHORTCUTS: Partial<Record<EditorTool, string>> = {
  select: 'V', pen: 'P', brush: 'B', pencil: 'N', eraser: 'E', fill: 'G', eyedropper: 'I', text: 'T', rectangle: 'R', ellipse: 'O', hand: 'H', line: 'L',
}

export const TOOL_BY_KEY = Object.fromEntries(Object.entries(TOOL_SHORTCUTS).map(([tool, key]) => [key.toLowerCase(), tool])) as Record<string, EditorTool>

export const COMMAND_SHORTCUTS = {
  copy: 'Ctrl C', cut: 'Ctrl X', paste: 'Ctrl V', duplicate: 'Ctrl D', undo: 'Ctrl Z', redo: 'Ctrl Shift Z', group: 'Ctrl G', ungroup: 'Ctrl Shift G', selectAll: 'Ctrl A', delete: 'Delete', actualSize: '1', fitCanvas: '2', bringForward: 'Ctrl ]', sendBackward: 'Ctrl [', lock: 'Ctrl Shift L', hide: 'Ctrl Shift H',
} as const

export const isTypingTarget = (target: EventTarget | null) => target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"], [role="textbox"]')
