export type ElementType = 'frame' | 'rectangle' | 'ellipse' | 'text' | 'image'

export interface EdonElement {
  id: string
  type: ElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius: number
  visible: boolean
  locked: boolean
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  letterSpacing?: number
  imageUrl?: string
}

export interface EdonPage {
  id: string
  name: string
  width: number
  height: number
  background: string
  elements: EdonElement[]
}

export interface EdonDocument {
  version: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  activePageId: string
  pages: EdonPage[]
}

export interface DocumentPreset {
  id: string
  label: string
  detail: string
  width: number
  height: number
  unit?: 'px' | 'mm'
}

export const DOCUMENT_PRESETS: DocumentPreset[] = [
  { id: 'desktop-hd', label: 'Desktop HD', detail: 'Presentation & screen', width: 1920, height: 1080 },
  { id: 'square', label: 'Square', detail: 'Social post', width: 1080, height: 1080 },
  { id: 'instagram', label: 'Instagram Post', detail: 'Portrait feed', width: 1080, height: 1350 },
  { id: 'story', label: 'Story', detail: 'Vertical story', width: 1080, height: 1920 },
  { id: 'a4', label: 'A4', detail: 'Print · 210 × 297 mm', width: 794, height: 1123, unit: 'mm' },
  { id: 'a3', label: 'A3', detail: 'Print · 297 × 420 mm', width: 1123, height: 1587, unit: 'mm' },
]

export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

export function createDocument(name: string, width: number, height: number): EdonDocument {
  const timestamp = new Date().toISOString()
  const pageId = createId('page')

  return {
    version: 1,
    id: createId('doc'),
    name: name.trim() || 'Untitled',
    createdAt: timestamp,
    updatedAt: timestamp,
    activePageId: pageId,
    pages: [{
      id: pageId,
      name: 'Page 1',
      width,
      height,
      background: '#ffffff',
      elements: [],
    }],
  }
}

export function createElement(type: ElementType, x: number, y: number, width?: number, height?: number): EdonElement {
  const labels: Record<ElementType, string> = {
    frame: 'Frame',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    text: 'Text',
    image: 'Image',
  }

  return {
    id: createId(type),
    type,
    name: labels[type],
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width ?? (type === 'text' ? 180 : type === 'image' ? 320 : 160)),
    height: Math.round(height ?? (type === 'text' ? 44 : type === 'image' ? 240 : 120)),
    rotation: 0,
    opacity: 1,
    fill: type === 'text' ? '#171719' : type === 'frame' ? '#ffffff' : type === 'ellipse' ? '#7c70ff' : '#2d2d31',
    stroke: type === 'frame' ? '#a0a0a8' : '#00000000',
    strokeWidth: type === 'frame' ? 1 : 0,
    cornerRadius: type === 'rectangle' ? 8 : 0,
    visible: true,
    locked: false,
    ...(type === 'text' ? {
      text: 'Type something',
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      fontSize: 32,
      fontWeight: 500,
      textAlign: 'left' as const,
      lineHeight: 1.2,
      letterSpacing: 0,
    } : {}),
  }
}

export function getActivePage(document: EdonDocument): EdonPage {
  return document.pages.find((page) => page.id === document.activePageId) ?? document.pages[0]
}
