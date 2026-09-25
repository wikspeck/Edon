import type { BlendMode, EdonDocument, EdonElement, EdonPage, ElementType, FillPaint } from '../../model/document'
import type { EdonProject } from '../../model/project'

export const PUBLIC_API_VERSION = 'v1' as const

export const API_LIMITS = {
  pageSizeDefault: 25,
  pageSizeMax: 100,
  projectNameMax: 80,
  documentNameMax: 120,
  pageNameMax: 120,
  elementNameMax: 120,
  textMax: 50_000,
  searchQueryMax: 200,
  batchOperationsMax: 50,
  pagesPerDocumentMax: 200,
  elementsPerPageMax: 5_000,
  canvasDimensionMin: 16,
  canvasDimensionMax: 8_192,
} as const

export type ApiScope = 'projects:read' | 'projects:write' | 'documents:read' | 'documents:write' | 'assets:read' | 'assets:write' | 'exports:create'
export type AccessRole = 'owner' | 'editor' | 'viewer'
export type ResourceAction = 'read' | 'write' | 'delete'

export interface ApiPrincipal {
  subject: string
  clientId: string
  scopes: ReadonlySet<ApiScope>
}

export interface CursorPage<T> { items: T[]; nextCursor: string | null }
export interface MutationResult<T> { resource: T; revision: number; requestId: string }
export interface ChangeSummary { changed: number; created: number; updated: number; deleted: number; documentRevision: number; requestId: string }

export type ProjectResource = EdonProject
export type DocumentResource = EdonDocument
export type SlideResource = EdonPage
export type ElementResource = EdonElement

export interface CreateProjectInput { name: string; description?: string; idempotencyKey?: string }
export interface UpdateProjectInput { name?: string; description?: string; ifMatchRevision: number }
export interface CreateDocumentInput { name: string; width: number; height: number; projectId?: string; idempotencyKey?: string }
export interface UpdateDocumentInput { name?: string; ifMatchRevision: number }
export interface CreateSlideInput { name?: string; width?: number; height?: number; background?: string; ifMatchRevision: number; idempotencyKey?: string }
export interface UpdateSlideInput { name?: string; width?: number; height?: number; background?: string; ifMatchRevision: number }

export interface ElementPatch {
  name?: string
  parentId?: string | null
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number
  blendMode?: BlendMode
  fill?: string
  fillPaint?: FillPaint
  stroke?: string
  strokeWidth?: number
  visible?: boolean
  locked?: boolean
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  textAlign?: 'left' | 'center' | 'right'
  imageUrl?: string
}

export interface CreateElementInput extends ElementPatch {
  type: ElementType
  x: number
  y: number
  width?: number
  height?: number
  ifMatchRevision: number
  idempotencyKey?: string
}

export interface UpdateElementInput { patch: ElementPatch; ifMatchRevision: number }

export type BatchOperation =
  | { op: 'create_slide'; clientId?: string; slide: Omit<CreateSlideInput, 'ifMatchRevision' | 'idempotencyKey'> }
  | { op: 'update_slide'; slideId: string; patch: Omit<UpdateSlideInput, 'ifMatchRevision'> }
  | { op: 'delete_slide'; slideId: string }
  | { op: 'create_element'; slideId: string; clientId?: string; element: Omit<CreateElementInput, 'ifMatchRevision' | 'idempotencyKey'> }
  | { op: 'update_element'; slideId: string; elementId: string; patch: ElementPatch }
  | { op: 'delete_element'; slideId: string; elementId: string }

export interface ApplyOperationsInput { ifMatchRevision: number; operations: BatchOperation[]; dryRun?: boolean; idempotencyKey?: string }

export interface SearchResult {
  resourceType: 'project' | 'document' | 'slide' | 'element'
  resourceId: string
  projectId?: string
  documentId?: string
  slideId?: string
  title: string
  snippet?: string
}

export interface Capabilities {
  apiVersion: typeof PUBLIC_API_VERSION
  persistence: 'browser-local'
  authentication: 'host-adapter-required'
  features: { projects: true; documents: true; slides: true; elements: true; batch: true; search: true; assets: false; asynchronousExports: false }
  exportFormats: ['png', 'jpeg', 'webp', 'svg']
  limits: typeof API_LIMITS
}

