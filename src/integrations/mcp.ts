import type { EdonDocument } from '../model/document'
import { EdonPublicApiService } from './public-api/service'
import type { PublicApiRepository } from './public-api/repository'
import type { ApiPrincipal, ApplyOperationsInput, CreateDocumentInput, CreateElementInput, CreateProjectInput, CreateSlideInput, UpdateElementInput } from './public-api/contract'

export let connectedEditor: { read: () => EdonDocument; busy: () => boolean; commit: (document: EdonDocument) => void; undo: () => void; redo: () => void } | null = null
export function connectEditor(editor: NonNullable<typeof connectedEditor>) { connectedEditor = editor; return () => { if (connectedEditor === editor) connectedEditor = null } }

const principal: ApiPrincipal = { subject: 'local-mcp-user', clientId: 'edon-mcp', scopes: new Set(['projects:read', 'projects:write', 'documents:read', 'documents:write']) }
export function createMcpHandler(repository: PublicApiRepository, open: (id: string) => void) {
 const api = new EdonPublicApiService(repository)
 return (request: { name: string; arguments?: Record<string, unknown> }) => {
  const a = request.arguments ?? {}
  const id = (key: string) => { if (typeof a[key] !== 'string') throw new Error(`${key} must be a string`); return a[key] as string }
  const input = a.input as never
  switch (request.name) {
   case 'get_connection': return { connected: true, persistence: 'desktop-local', activeDocumentId: connectedEditor?.read().id ?? null, features: ['projects', 'canvas', 'slides', 'elements', 'atomic-batch', 'undo', 'ui', 'layout', 'animation', 'vector-fill', 'html-export'] }
   case 'list_projects': return api.listProjects(principal, a)
   case 'get_project': return api.getProject(principal, id('projectId'))
   case 'create_project': return api.createProject(principal, input as CreateProjectInput)
   case 'list_documents': return api.listDocuments(principal, a)
   case 'get_document': return api.getDocument(principal, id('documentId'))
   case 'create_document': return api.createDocument(principal, input as CreateDocumentInput)
   case 'list_slides': return api.listSlides(principal, id('documentId'), a)
   case 'create_slide': return api.createSlide(principal, id('documentId'), input as CreateSlideInput)
   case 'list_elements': return api.listElements(principal, id('documentId'), id('slideId'), a)
   case 'create_element': return api.createElement(principal, id('documentId'), id('slideId'), input as CreateElementInput)
   case 'update_element': return api.updateElement(principal, id('documentId'), id('slideId'), id('elementId'), input as UpdateElementInput)
   case 'apply_operations': return api.applyOperations(principal, id('documentId'), input as ApplyOperationsInput)
   case 'search_edon': return api.search(principal, id('query'), a)
   case 'export_ui': return import('../editor/ui-export').then(({ exportUiHtml }) => { const doc=api.getDocument(principal,id('documentId')); if (doc.kind !== 'ui') throw new Error('HTML export requires a UI document.'); return {documentId:doc.id,revision:doc.revision,mimeType:'text/html',source:exportUiHtml(doc,typeof a.slideId === 'string' ? a.slideId : undefined)} })
   case 'get_preview': return import('../editor/artwork-export').then(({ previewArtwork }) => previewArtwork(api.getDocument(principal, id('documentId')), typeof a.slideId === 'string' ? a.slideId : undefined))
   case 'undo_document':
   case 'redo_document': {
    const document = api.getDocument(principal, id('documentId'))
    if (connectedEditor?.read().id !== document.id) throw new Error('Open this document before undo or redo.')
    if (document.revision !== a.ifMatchRevision) throw new Error('Revision conflict. Read the document again.')
    if (connectedEditor.busy()) throw new Error('Finish the current editing gesture first.')
    if (request.name === 'undo_document') connectedEditor.undo(); else connectedEditor.redo()
    return { documentId: document.id, revision: connectedEditor.read().revision }
   }
   case 'open_document': { const document = api.getDocument(principal, id('documentId')); open(document.id); return { documentId: document.id, opened: true } }
   default: throw new Error('Unknown Edon tool')
  }
 }
}
