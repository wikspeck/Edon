export type ElementType = 'group' | 'frame' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'polygon' | 'star' | 'path' | 'text' | 'image' | 'raster'
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'

export interface VectorPoint { x: number; y: number }
export interface VectorNode extends VectorPoint { id: string; kind: 'corner' | 'smooth'; in?: VectorPoint; out?: VectorPoint }
export interface PaletteColor { id: string; name: string; color: string }
export type BrushPreset = 'clean' | 'hard' | 'soft' | 'inking' | 'marker' | 'flat'

export interface GradientStop { id: string; offset: number; color: string }
export type FillPaint =
  | { type: 'solid'; color: string }
  | { type: 'linear-gradient'; angle: number; stops: GradientStop[] }
  | { type: 'radial-gradient'; stops: GradientStop[] }

export type ElementEffect =
  | { id: string; type: 'drop-shadow'; enabled: boolean; color: string; opacity: number; offsetX: number; offsetY: number; blur: number; spread: number }
  | { id: string; type: 'outline'; enabled: boolean; color: string; opacity: number; width: number }
  | { id: string; type: 'glow'; enabled: boolean; color: string; opacity: number; blur: number; spread: number; strength: number; shape?: 'contour' | 'circle' | 'rectangle'; falloff?: number; offsetX?: number; offsetY?: number }
  | { id: string; type: 'gaussian-blur'; enabled: boolean; radius: number }
  | { id: string; type: 'stylized-shadow'; enabled: boolean; color: string; opacity: number; angle: number; distance: number }

export interface ImageAdjustments {
  brightness: number; contrast: number; exposure: number; saturation: number; vibrance: number
  temperature: number; tint: number; highlights: number; shadows: number; hue: number
}

export interface ElementMask {
  id: string; type: 'shape'; shape: 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'polygon' | 'star'
  cornerRadius: number; sides: number; inset: number; inverted: boolean; pathData?: string
}

export interface CropRect { x: number; y: number; width: number; height: number }

export interface EdonElement {
  id: string
  type: ElementType
  name: string
  parentId: string | null
  x: number; y: number; width: number; height: number
  rotation: number; scaleX: number; scaleY: number; opacity: number
  blendMode: BlendMode
  fill: string
  fillPaint: FillPaint
  stroke: string
  strokeWidth: number
  strokeDash: number[]
  cornerRadius: number
  cornerRadii: [number, number, number, number]
  visible: boolean
  locked: boolean
  pathData?: string
  vectorNodes?: VectorNode[]
  sourcePoints?: VectorPoint[]
  closed?: boolean
  brushPreset?: BrushPreset
  smoothing?: number
  stabilization?: number
  strokeOpacity?: number
  strokeCap?: 'butt' | 'round' | 'square'
  strokeJoin?: 'miter' | 'round' | 'bevel'
  imperfection?: number
  imperfectionSeed?: number
  reference?: boolean
  includeInExport?: boolean
  points?: number
  innerRadius?: number
  text?: string
  textHtml?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  italic?: boolean
  underline?: boolean
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  lineHeight?: number
  letterSpacing?: number
  imageUrl?: string
  originalImageUrl?: string
  crop?: CropRect
  adjustments?: ImageAdjustments
  mask?: ElementMask
  effects: ElementEffect[]
  ui?: UiProperties
  vectorFill?: { sourceId: string; overlap: number }
}

export interface UiAnimation { preset: 'fade' | 'rise' | 'scale' | 'custom'; trigger: 'load' | 'hover' | 'click'; duration: number; delay: number; easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'; repeat: boolean; distance: number; keyframes?: { offset: number; opacity?: number; translateX?: number; translateY?: number; scale?: number; rotate?: number }[] }
export interface UiProperties {
  role: 'container' | 'button' | 'input' | 'checkbox' | 'card' | 'navigation' | 'badge'
  label?: string
  href?: string
  layout?: { direction: 'row' | 'column'; gap: number; padding: number; align: 'start' | 'center' | 'end'; justify: 'start' | 'center' | 'end' | 'space-between' }
  animation?: UiAnimation
  component?: { name: string; sourceId?: string }
}

export interface EdonPage { id: string; name: string; width: number; height: number; background: string; elements: EdonElement[]; docHtml?: string }
export type DocumentKind = 'doc' | 'canvas' | 'music' | 'video' | 'presentation' | 'ui'
export interface AudioTrack { id: string; assetId: string; name: string; duration: number; bpm: number; beatOffset: number; start: number; end: number; volume: number; low: number; mid: number; high: number; deck?: 0 | 1; filter?: number; resonance?: number; echo?: number; reverb?: number; pan?: number; cue?: number; loopBeats?: number; hotCues?: number[]; echoBeats?: number }
export type FadeParameter = 'low' | 'mid' | 'high' | 'filter' | 'volume' | 'echo' | 'reverb' | 'pan'
export interface FadePoint { at: number; value: number }
export interface FadeRoute { id: string; deck: 0 | 1; parameter: FadeParameter; points: FadePoint[]; curve: 'linear' | 'smooth' | 'easeIn' | 'easeOut'; enabled: boolean }
export interface FadePlan { enabled: boolean; from: 0 | 1; routes: FadeRoute[] }
export interface FadePreset { id: string; name: string; plan: FadePlan }
export interface MusicSession { tracks: AudioTrack[]; bpm: number; sync: boolean; crossfade: number; queue?: string[]; auto?: boolean; transition?: number; quantize?: boolean; syncMaster?: 0 | 1; fadePlan?: FadePlan; transitionStyle?: 'smart' | 'blend' | 'bass' | 'filter' | 'echo' }
export interface VideoClip { id: string; name: string; duration: number; start: number; end: number; muted: boolean }
export interface EdonDocument { version: 4; revision: number; id: string; name: string; createdAt: string; updatedAt: string; activePageId: string; pages: EdonPage[]; palette: PaletteColor[]; trashedAt?: string; kind?: DocumentKind; music?: MusicSession; video?: VideoClip[] }

export function documentKind(document: EdonDocument): DocumentKind { return document.kind ?? (document.pages.some((page) => page.elements.length) ? 'canvas' : document.pages.some((page) => page.docHtml?.replace(/<[^>]*>/g, '').trim()) ? 'doc' : 'canvas') }
export interface DocumentPreset { id: string; label: string; detail: string; width: number; height: number; unit?: 'px' | 'mm' }

export const DOCUMENT_PRESETS: DocumentPreset[] = [
  { id: 'desktop-hd', label: 'Desktop HD', detail: 'Presentation & screen', width: 1920, height: 1080 },
  { id: 'square', label: 'Square', detail: 'Social post', width: 1080, height: 1080 },
  { id: 'instagram', label: 'Instagram Post', detail: 'Portrait feed', width: 1080, height: 1350 },
  { id: 'story', label: 'Story', detail: 'Vertical story', width: 1080, height: 1920 },
  { id: 'a4', label: 'A4', detail: 'Print · 210 × 297 mm', width: 794, height: 1123, unit: 'mm' },
  { id: 'a3', label: 'A3', detail: 'Print · 297 × 420 mm', width: 1123, height: 1587, unit: 'mm' },
]

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0, contrast: 0, exposure: 0, saturation: 0, vibrance: 0,
  temperature: 0, tint: 0, highlights: 0, shadows: 0, hue: 0,
}

export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`
const solidPaint = (color: string): FillPaint => ({ type: 'solid', color })
export const DEFAULT_PALETTE: PaletteColor[] = [
  { id: 'ink', name: 'Ink', color: '#171719' },
  { id: 'paper', name: 'Paper', color: '#F7F5EF' },
  { id: 'fortario-red', name: 'Fortario Red', color: '#E84A3C' },
  { id: 'sun-gold', name: 'Sun Gold', color: '#F3B33D' },
  { id: 'field-green', name: 'Field Green', color: '#397A59' },
]

export function createDocument(name: string, width: number, height: number, kind: DocumentKind = 'canvas'): EdonDocument {
  const timestamp = new Date().toISOString()
  const pageId = createId('page')
  return { version: 4, revision: 1, kind, id: createId('doc'), name: name.trim() || 'Untitled', createdAt: timestamp, updatedAt: timestamp, activePageId: pageId, pages: [{ id: pageId, name: 'Page 1', width, height, background: '#ffffff', elements: [] }], palette: DEFAULT_PALETTE.map((color) => ({ ...color })), ...(kind === 'music' ? { music: { tracks: [], bpm: 120, sync: false, crossfade: -1 } } : {}) }
}

export function createElement(type: ElementType, x: number, y: number, width?: number, height?: number): EdonElement {
  const labels: Record<ElementType, string> = { group: 'Group', frame: 'Frame', rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Line', arrow: 'Arrow', polygon: 'Polygon', star: 'Star', path: 'Path', text: 'Text', image: 'Image', raster: 'Raster layer' }
  const isLine = type === 'line' || type === 'arrow'
  const fill = type === 'text' ? '#171719' : type === 'frame' ? '#ffffff' : type === 'ellipse' ? '#b0b0b0' : isLine || type === 'image' || type === 'raster' ? '#00000000' : '#2d2d31'
  const radius = type === 'rectangle' ? 8 : 0
  const resolvedWidth = width ?? (type === 'text' ? 180 : type === 'image' || type === 'raster' ? 320 : isLine ? 180 : 160)
  const resolvedHeight = height ?? (type === 'text' ? 44 : type === 'image' || type === 'raster' ? 240 : isLine ? 24 : 120)
  return {
    id: createId(type), type, name: labels[type], parentId: null,
    x: Math.round(x), y: Math.round(y), width: Math.round(resolvedWidth), height: Math.round(resolvedHeight),
    rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, blendMode: 'normal',
    fill, fillPaint: solidPaint(fill),
    stroke: type === 'frame' ? '#a0a0a8' : isLine ? '#2d2d31' : '#00000000', strokeWidth: type === 'frame' ? 1 : isLine ? 3 : 0, strokeDash: [], strokeOpacity: 1, strokeCap: 'round', strokeJoin: 'round',
    cornerRadius: radius, cornerRadii: [radius, radius, radius, radius], visible: true, locked: false, effects: [],
    imperfection: 0, imperfectionSeed: Math.floor(Math.random() * 100000), reference: false, includeInExport: true,
    ...(type === 'polygon' || type === 'star' ? { points: type === 'star' ? 5 : 6, innerRadius: .48 } : {}),
    ...(type === 'text' ? { text: 'Type something', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize: 32, fontWeight: 500, italic: false, underline: false, textAlign: 'left' as const, verticalAlign: 'top' as const, lineHeight: 1.2, letterSpacing: 0 } : {}),
    ...(type === 'image' ? { adjustments: { ...DEFAULT_ADJUSTMENTS }, crop: { x: 0, y: 0, width: 1, height: 1 } } : {}),
  }
}

export function getActivePage(document: EdonDocument): EdonPage { return document.pages.find((page) => page.id === document.activePageId) ?? document.pages[0] }

export function normalizeElement(element: Partial<EdonElement> & Pick<EdonElement, 'id' | 'type' | 'name' | 'x' | 'y' | 'width' | 'height'>): EdonElement {
  const base = createElement(element.type, element.x, element.y, element.width, element.height)
  const radius = element.cornerRadius ?? base.cornerRadius
  return { ...base, ...element, parentId: element.parentId ?? null, scaleX: element.scaleX ?? 1, scaleY: element.scaleY ?? 1, blendMode: element.blendMode ?? 'normal', fillPaint: element.fillPaint ?? solidPaint(element.fill ?? base.fill), strokeDash: element.strokeDash ?? [], strokeOpacity: element.strokeOpacity ?? 1, strokeCap: element.strokeCap ?? 'round', strokeJoin: element.strokeJoin ?? 'round', cornerRadii: element.cornerRadii ?? [radius, radius, radius, radius], effects: (element.effects ?? []).map(normalizeEffect), imperfection: element.imperfection ?? 0, imperfectionSeed: element.imperfectionSeed ?? 1, reference: element.reference ?? false, includeInExport: element.includeInExport ?? true, adjustments: element.type === 'image' ? { ...DEFAULT_ADJUSTMENTS, ...element.adjustments } : element.adjustments, crop: element.type === 'image' ? element.crop ?? { x: 0, y: 0, width: 1, height: 1 } : element.crop }
}

function normalizeEffect(effect: ElementEffect): ElementEffect {
  if (effect.type === 'drop-shadow') return { ...effect, spread: effect.spread ?? 0 }
  if (effect.type === 'glow') return { ...effect, spread: effect.spread ?? 0, strength: effect.strength ?? 1 }
  return effect
}

export function migrateDocument(input: unknown): EdonDocument | null {
  if (!input || typeof input !== 'object') return null
  const document = input as Partial<EdonDocument> & { version?: number; pages?: EdonPage[] }
  if (!document.id || !document.pages?.length || !document.activePageId) return null
  return { ...(document as Omit<EdonDocument, 'version' | 'revision' | 'pages' | 'palette'>), version: 4, revision: Number.isSafeInteger(document.revision) && Number(document.revision) > 0 ? Number(document.revision) : 1, pages: document.pages.map((page) => ({ ...page, elements: page.elements.map(normalizeElement) })), palette: Array.isArray(document.palette) ? document.palette : DEFAULT_PALETTE.map((color) => ({ ...color })) }
}
