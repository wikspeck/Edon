import { createDocument, createElement as createEdonElement, createId, type EdonDocument, type EdonElement, type EdonPage } from '../../model/document'
import { createProject as createEdonProject } from '../../model/project'
import {
  API_LIMITS, PUBLIC_API_VERSION, type ApiPrincipal, type ApiScope, type ApplyOperationsInput, type BatchOperation,
  type Capabilities, type ChangeSummary, type CreateDocumentInput, type CreateElementInput, type CreateProjectInput,
  type CreateSlideInput, type CursorPage, type DocumentResource, type ElementPatch, type ElementResource,
  type MutationResult, type ProjectResource, type SearchResult, type SlideResource, type UpdateDocumentInput,
  type UpdateElementInput, type UpdateProjectInput, type UpdateSlideInput,
} from './contract'
import { conflict, notFound, PublicApiError } from './errors'
import { roleAllows, type PublicApiRepository, type WorkspaceSnapshot } from './repository'
import { assertColor, assertCursor, assertDimension, assertElementPatch, assertElementType, assertId, assertName, assertPageSize, assertRevision, findElement, findPage } from './validation'

type IdempotentResult = MutationResult<ProjectResource | DocumentResource | SlideResource | ElementResource> | ChangeSummary

export class EdonPublicApiService {
  private readonly idempotency = new Map<string, { fingerprint: string; result: IdempotentResult }>()
  constructor(private readonly repository: PublicApiRepository) {}

  capabilities(): Capabilities {
    return { apiVersion: PUBLIC_API_VERSION, persistence: 'browser-local', authentication: 'host-adapter-required', features: { projects: true, documents: true, slides: true, elements: true, batch: true, search: true, assets: false, asynchronousExports: false }, exportFormats: ['png', 'jpeg', 'webp', 'svg'], limits: API_LIMITS }
  }

  listProjects(principal: ApiPrincipal, options: { cursor?: string; limit?: number } = {}): CursorPage<ProjectResource> {
    this.requireScope(principal, 'projects:read'); const snapshot = this.repository.read()
    return this.paginate(snapshot.projects.filter((project) => this.allowed(principal, 'project', project.id, 'read')), options)
  }

  getProject(principal: ApiPrincipal, projectId: string): ProjectResource {
    this.requireScope(principal, 'projects:read'); assertId(projectId, 'projectId'); const project = this.repository.read().projects.find((item) => item.id === projectId)
    if (!project || !this.allowed(principal, 'project', projectId, 'read')) throw notFound('PROJECT')
    return project
  }

  createProject(principal: ApiPrincipal, input: CreateProjectInput, requestId = createId('req')): MutationResult<ProjectResource> {
    this.requireScope(principal, 'projects:write'); assertName(input.name, 'name', API_LIMITS.projectNameMax)
    if (input.description !== undefined && typeof input.description !== 'string') throw new PublicApiError('VALIDATION_ERROR', 'description must be a string.', 400, { field: 'description' })
    return this.idempotent(principal, 'createProject', input.idempotencyKey, input, () => { const snapshot = this.repository.read(); const project = createEdonProject(input.name); project.metadata.description = input.description?.slice(0, 500); snapshot.projects.unshift(project); this.repository.commit(snapshot); return { resource: project, revision: project.revision, requestId } }) as MutationResult<ProjectResource>
  }

  updateProject(principal: ApiPrincipal, projectId: string, input: UpdateProjectInput, requestId = createId('req')): MutationResult<ProjectResource> {
    this.requireScope(principal, 'projects:write'); assertId(projectId, 'projectId'); assertRevision(input.ifMatchRevision); this.requireAccess(principal, 'project', projectId, 'write')
    if (input.name !== undefined) assertName(input.name, 'name', API_LIMITS.projectNameMax)
    if (input.description !== undefined && typeof input.description !== 'string') throw new PublicApiError('VALIDATION_ERROR', 'description must be a string.', 400, { field: 'description' })
    const snapshot = this.repository.read(); const index = snapshot.projects.findIndex((item) => item.id === projectId); if (index < 0) throw notFound('PROJECT'); const current = snapshot.projects[index]; this.matchRevision(current.revision, input.ifMatchRevision)
    const resource = { ...current, name: input.name?.trim() ?? current.name, metadata: { ...current.metadata, description: input.description ?? current.metadata.description }, revision: current.revision + 1, updatedAt: new Date().toISOString() }
    snapshot.projects[index] = resource; this.repository.commit(snapshot); return { resource, revision: resource.revision, requestId }
  }

  deleteProject(principal: ApiPrincipal, projectId: string, ifMatchRevision: number): void {
    this.requireScope(principal, 'projects:write'); assertId(projectId, 'projectId'); assertRevision(ifMatchRevision); this.requireAccess(principal, 'project', projectId, 'delete'); const snapshot = this.repository.read(); const project = snapshot.projects.find((item) => item.id === projectId); if (!project) throw notFound('PROJECT'); this.matchRevision(project.revision, ifMatchRevision); snapshot.projects = snapshot.projects.filter((item) => item.id !== projectId); this.repository.commit(snapshot)
  }

  listDocuments(principal: ApiPrincipal, options: { projectId?: string; cursor?: string; limit?: number } = {}): CursorPage<DocumentResource> {
    this.requireScope(principal, 'documents:read'); const snapshot = this.repository.read(); let ids: Set<string> | null = null
    if (options.projectId) { const project = snapshot.projects.find((item) => item.id === options.projectId); if (!project || !this.allowed(principal, 'project', project.id, 'read')) throw notFound('PROJECT'); ids = new Set(project.documentIds) }
    return this.paginate(snapshot.documents.filter((document) => (!ids || ids.has(document.id)) && this.allowed(principal, 'document', document.id, 'read')), options)
  }

  getDocument(principal: ApiPrincipal, documentId: string): DocumentResource { this.requireScope(principal, 'documents:read'); return this.documentFor(principal, this.repository.read(), documentId, 'read') }

  createDocument(principal: ApiPrincipal, input: CreateDocumentInput, requestId = createId('req')): MutationResult<DocumentResource> {
    this.requireScope(principal, 'documents:write'); assertName(input.name, 'name', API_LIMITS.documentNameMax); assertDimension(input.width, 'width'); assertDimension(input.height, 'height')
    return this.idempotent(principal, 'createDocument', input.idempotencyKey, input, () => { const snapshot = this.repository.read(); if (input.projectId) { assertId(input.projectId, 'projectId'); this.requireAccess(principal, 'project', input.projectId, 'write'); if (!snapshot.projects.some((item) => item.id === input.projectId)) throw notFound('PROJECT') }
      const document = createDocument(input.name, input.width, input.height); snapshot.documents.unshift(document); if (input.projectId) snapshot.projects = snapshot.projects.map((project) => project.id === input.projectId ? { ...project, documentIds: [document.id, ...project.documentIds], revision: project.revision + 1, updatedAt: new Date().toISOString() } : project); this.repository.commit(snapshot); return { resource: document, revision: document.revision, requestId } }) as MutationResult<DocumentResource>
  }

  updateDocument(principal: ApiPrincipal, documentId: string, input: UpdateDocumentInput, requestId = createId('req')): MutationResult<DocumentResource> {
    this.requireScope(principal, 'documents:write'); assertRevision(input.ifMatchRevision); if (input.name !== undefined) assertName(input.name, 'name', API_LIMITS.documentNameMax); const snapshot = this.repository.read(); const document = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(document.revision, input.ifMatchRevision); const resource = this.touch({ ...document, name: input.name?.trim() ?? document.name }); this.replaceDocument(snapshot, resource); this.repository.commit(snapshot); return { resource, revision: resource.revision, requestId }
  }

  listSlides(principal: ApiPrincipal, documentId: string, options: { cursor?: string; limit?: number } = {}): CursorPage<SlideResource> { this.requireScope(principal, 'documents:read'); return this.paginate(this.documentFor(principal, this.repository.read(), documentId, 'read').pages, options) }

  createSlide(principal: ApiPrincipal, documentId: string, input: CreateSlideInput, requestId = createId('req')): MutationResult<SlideResource> {
    this.requireScope(principal, 'documents:write'); assertRevision(input.ifMatchRevision)
    return this.idempotent(principal, 'createSlide', input.idempotencyKey, input, () => { const snapshot = this.repository.read(); const document = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(document.revision, input.ifMatchRevision); const page = this.buildPage(document, input); const next = this.touch({ ...document, pages: [...document.pages, page], activePageId: page.id }); this.replaceDocument(snapshot, next); this.repository.commit(snapshot); return { resource: page, revision: next.revision, requestId } }) as MutationResult<SlideResource>
  }

  updateSlide(principal: ApiPrincipal, documentId: string, slideId: string, input: UpdateSlideInput, requestId = createId('req')): MutationResult<SlideResource> {
    this.requireScope(principal, 'documents:write'); assertRevision(input.ifMatchRevision); const snapshot = this.repository.read(); const document = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(document.revision, input.ifMatchRevision); const page = findPage(document, slideId); if (!page) throw notFound('SLIDE'); const updated = this.patchPage(page, input); const next = this.touch({ ...document, pages: document.pages.map((item) => item.id === slideId ? updated : item) }); this.replaceDocument(snapshot, next); this.repository.commit(snapshot); return { resource: updated, revision: next.revision, requestId }
  }

  listElements(principal: ApiPrincipal, documentId: string, slideId: string, options: { cursor?: string; limit?: number } = {}): CursorPage<ElementResource> { this.requireScope(principal, 'documents:read'); const page = findPage(this.documentFor(principal, this.repository.read(), documentId, 'read'), slideId); if (!page) throw notFound('SLIDE'); return this.paginate(page.elements, options) }

  createElement(principal: ApiPrincipal, documentId: string, slideId: string, input: CreateElementInput, requestId = createId('req')): MutationResult<ElementResource> {
    this.requireScope(principal, 'documents:write'); assertRevision(input.ifMatchRevision); assertElementType(input.type); assertElementPatch(this.elementPatch(input))
    return this.idempotent(principal, 'createElement', input.idempotencyKey, input, () => { const snapshot = this.repository.read(); const document = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(document.revision, input.ifMatchRevision); const page = findPage(document, slideId); if (!page) throw notFound('SLIDE'); const element = this.buildElement(input, page); const next = this.touch({ ...document, pages: document.pages.map((item) => item.id === slideId ? { ...item, elements: [...item.elements, element] } : item) }); this.replaceDocument(snapshot, next); this.repository.commit(snapshot); return { resource: element, revision: next.revision, requestId } }) as MutationResult<ElementResource>
  }

  updateElement(principal: ApiPrincipal, documentId: string, slideId: string, elementId: string, input: UpdateElementInput, requestId = createId('req')): MutationResult<ElementResource> {
    this.requireScope(principal, 'documents:write'); assertRevision(input.ifMatchRevision); assertElementPatch(input.patch); const snapshot = this.repository.read(); const document = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(document.revision, input.ifMatchRevision); const page = findPage(document, slideId); if (!page) throw notFound('SLIDE'); const current = findElement(page, elementId); if (!current) throw notFound('ELEMENT'); const element = { ...current, ...input.patch }; this.validateParent(page, element); const next = this.touch({ ...document, pages: document.pages.map((item) => item.id === slideId ? { ...item, elements: item.elements.map((candidate) => candidate.id === elementId ? element : candidate) } : item) }); this.replaceDocument(snapshot, next); this.repository.commit(snapshot); return { resource: element, revision: next.revision, requestId }
  }

  deleteElement(principal: ApiPrincipal, documentId: string, slideId: string, elementId: string, ifMatchRevision: number): number {
    this.requireScope(principal, 'documents:write'); assertRevision(ifMatchRevision); const snapshot = this.repository.read(); const document = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(document.revision, ifMatchRevision); const page = findPage(document, slideId); if (!page) throw notFound('SLIDE'); if (!findElement(page, elementId)) throw notFound('ELEMENT'); const descendants = new Set<string>([elementId]); let changed = true; while (changed) { changed = false; for (const item of page.elements) if (item.parentId && descendants.has(item.parentId) && !descendants.has(item.id)) { descendants.add(item.id); changed = true } } const next = this.touch({ ...document, pages: document.pages.map((item) => item.id === slideId ? { ...item, elements: item.elements.filter((element) => !descendants.has(element.id)) } : item) }); this.replaceDocument(snapshot, next); this.repository.commit(snapshot); return next.revision
  }

  applyOperations(principal: ApiPrincipal, documentId: string, input: ApplyOperationsInput, requestId = createId('req')): ChangeSummary {
    this.requireScope(principal, 'documents:write'); assertRevision(input.ifMatchRevision); if (!Array.isArray(input.operations) || !input.operations.length) throw new PublicApiError('VALIDATION_ERROR', 'At least one operation is required.', 400, { field: 'operations' }); if (input.operations.length > API_LIMITS.batchOperationsMax) throw new PublicApiError('PAYLOAD_TOO_LARGE', `A batch may contain at most ${API_LIMITS.batchOperationsMax} operations.`, 413)
    return this.idempotent(principal, 'applyOperations', input.idempotencyKey, input, () => { const snapshot = this.repository.read(); const original = this.documentFor(principal, snapshot, documentId, 'write'); this.matchRevision(original.revision, input.ifMatchRevision); let document = structuredClone(original); const counts = { created: 0, updated: 0, deleted: 0 }; for (const operation of input.operations) { document = this.applyOne(document, operation, counts) } document = this.touch(document); if (!input.dryRun) { this.replaceDocument(snapshot, document); this.repository.commit(snapshot) } return { changed: counts.created + counts.updated + counts.deleted, ...counts, documentRevision: document.revision, requestId } }) as ChangeSummary
  }

  search(principal: ApiPrincipal, query: string, options: { cursor?: string; limit?: number } = {}): CursorPage<SearchResult> {
    this.requireScope(principal, 'projects:read'); this.requireScope(principal, 'documents:read'); const q = query.trim().toLocaleLowerCase(); if (!q || q.length > API_LIMITS.searchQueryMax) throw new PublicApiError('VALIDATION_ERROR', `Query must contain 1 to ${API_LIMITS.searchQueryMax} characters.`, 400, { field: 'q' }); const snapshot = this.repository.read(); const results: SearchResult[] = []
    for (const project of snapshot.projects) if (this.allowed(principal, 'project', project.id, 'read') && `${project.name} ${project.metadata.description ?? ''}`.toLocaleLowerCase().includes(q)) results.push({ resourceType: 'project', resourceId: project.id, projectId: project.id, title: project.name, snippet: project.metadata.description })
    for (const document of snapshot.documents) { if (!this.allowed(principal, 'document', document.id, 'read')) continue; const projectId = snapshot.projects.find((project) => project.documentIds.includes(document.id))?.id; if (document.name.toLocaleLowerCase().includes(q)) results.push({ resourceType: 'document', resourceId: document.id, documentId: document.id, projectId, title: document.name }); for (const page of document.pages) { if (page.name.toLocaleLowerCase().includes(q)) results.push({ resourceType: 'slide', resourceId: page.id, documentId: document.id, projectId, slideId: page.id, title: page.name }); for (const element of page.elements) { const haystack = `${element.name} ${element.text ?? ''}`.toLocaleLowerCase(); if (haystack.includes(q)) results.push({ resourceType: 'element', resourceId: element.id, documentId: document.id, projectId, slideId: page.id, title: element.name, snippet: element.text?.slice(0, 240) }) } } }
    return this.paginate(results, options)
  }

  private applyOne(document: EdonDocument, operation: BatchOperation, counts: { created: number; updated: number; deleted: number }): EdonDocument {
    if (!operation || typeof operation !== 'object' || !['create_slide', 'update_slide', 'delete_slide', 'create_element', 'update_element', 'delete_element'].includes(operation.op)) throw new PublicApiError('VALIDATION_ERROR', 'Batch operation is not supported.', 400, { field: 'operations.op' })
    if (operation.op === 'create_slide') { if (!operation.slide || typeof operation.slide !== 'object') throw new PublicApiError('VALIDATION_ERROR', 'create_slide requires a slide object.', 400, { field: 'operations.slide' }); const page = this.buildPage(document, operation.slide); counts.created++; return { ...document, pages: [...document.pages, page], activePageId: page.id } }
    assertId(operation.slideId, 'operations.slideId')
    const page = findPage(document, operation.slideId); if (!page) throw notFound('SLIDE')
    if (operation.op === 'update_slide') { counts.updated++; return { ...document, pages: document.pages.map((item) => item.id === page.id ? this.patchPage(item, operation.patch) : item) } }
    if (operation.op === 'delete_slide') { if (document.pages.length === 1) throw new PublicApiError('CONFLICT', 'A document must keep at least one slide.', 409); counts.deleted++; const pages = document.pages.filter((item) => item.id !== page.id); return { ...document, pages, activePageId: document.activePageId === page.id ? pages[0].id : document.activePageId } }
    if (operation.op === 'create_element') { assertElementType(operation.element.type); assertElementPatch(this.elementPatch(operation.element)); const element = this.buildElement(operation.element, page); counts.created++; return { ...document, pages: document.pages.map((item) => item.id === page.id ? { ...item, elements: [...item.elements, element] } : item) } }
    const element = findElement(page, operation.elementId); if (!element) throw notFound('ELEMENT')
    if (operation.op === 'update_element') { assertElementPatch(operation.patch); const updated = { ...element, ...operation.patch }; this.validateParent(page, updated); counts.updated++; return { ...document, pages: document.pages.map((item) => item.id === page.id ? { ...item, elements: item.elements.map((candidate) => candidate.id === element.id ? updated : candidate) } : item) } }
    const deletedIds = this.descendantIds(page, element.id); counts.deleted += deletedIds.size; return { ...document, pages: document.pages.map((item) => item.id === page.id ? { ...item, elements: item.elements.filter((candidate) => !deletedIds.has(candidate.id)) } : item) }
  }

  private buildPage(document: EdonDocument, input: Omit<CreateSlideInput, 'ifMatchRevision' | 'idempotencyKey'>): EdonPage { if (document.pages.length >= API_LIMITS.pagesPerDocumentMax) throw new PublicApiError('CONFLICT', 'Document slide limit reached.', 409); const source = document.pages.at(-1)!; const width = input.width ?? source.width; const height = input.height ?? source.height; assertDimension(width, 'width'); assertDimension(height, 'height'); if (input.name !== undefined) assertName(input.name, 'name', API_LIMITS.pageNameMax); if (input.background !== undefined) assertColor(input.background, 'background'); return { id: createId('page'), name: input.name?.trim() || `Page ${document.pages.length + 1}`, width, height, background: input.background ?? '#ffffff', elements: [] } }
  private patchPage(page: EdonPage, patch: Omit<UpdateSlideInput, 'ifMatchRevision'>): EdonPage { if (patch.name !== undefined) assertName(patch.name, 'name', API_LIMITS.pageNameMax); if (patch.width !== undefined) assertDimension(patch.width, 'width'); if (patch.height !== undefined) assertDimension(patch.height, 'height'); if (patch.background !== undefined) assertColor(patch.background, 'background'); return { ...page, name: patch.name?.trim() ?? page.name, width: patch.width ?? page.width, height: patch.height ?? page.height, background: patch.background ?? page.background } }
  private buildElement(input: Omit<CreateElementInput, 'ifMatchRevision' | 'idempotencyKey'>, page: EdonPage): EdonElement { if (page.elements.length >= API_LIMITS.elementsPerPageMax) throw new PublicApiError('CONFLICT', 'Slide element limit reached.', 409); const base = createEdonElement(input.type, input.x, input.y, input.width, input.height); const element = { ...base, ...this.elementPatch(input) }; this.validateParent(page, element); return element }
  private elementPatch(input: Partial<CreateElementInput>): ElementPatch { const keys: (keyof ElementPatch)[] = ['name', 'parentId', 'x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY', 'opacity', 'blendMode', 'fill', 'fillPaint', 'stroke', 'strokeWidth', 'visible', 'locked', 'text', 'fontFamily', 'fontSize', 'fontWeight', 'textAlign', 'imageUrl']; const patch: ElementPatch = {}; for (const key of keys) if (input[key] !== undefined) Object.assign(patch, { [key]: input[key] }); return patch }
  private validateParent(page: EdonPage, element: EdonElement): void { if (element.parentId === element.id) throw new PublicApiError('VALIDATION_ERROR', 'An element cannot be its own parent.', 400, { field: 'parentId' }); if (element.parentId && !page.elements.some((item) => item.id === element.parentId && item.type === 'group')) throw new PublicApiError('VALIDATION_ERROR', 'parentId must identify a group on the same slide.', 400, { field: 'parentId' }); let parentId = element.parentId; const visited = new Set([element.id]); while (parentId) { if (visited.has(parentId)) throw new PublicApiError('VALIDATION_ERROR', 'Element parenting cannot contain a cycle.', 400, { field: 'parentId' }); visited.add(parentId); parentId = page.elements.find((item) => item.id === parentId)?.parentId ?? null } }
  private descendantIds(page: EdonPage, rootId: string): Set<string> { const ids = new Set([rootId]); let changed = true; while (changed) { changed = false; for (const element of page.elements) if (element.parentId && ids.has(element.parentId) && !ids.has(element.id)) { ids.add(element.id); changed = true } } return ids }
  private touch(document: EdonDocument): EdonDocument { return { ...document, revision: document.revision + 1, updatedAt: new Date().toISOString() } }
  private replaceDocument(snapshot: WorkspaceSnapshot, document: EdonDocument): void { snapshot.documents = snapshot.documents.map((item) => item.id === document.id ? document : item) }
  private documentFor(principal: ApiPrincipal, snapshot: WorkspaceSnapshot, documentId: string, action: 'read' | 'write' | 'delete'): EdonDocument { assertId(documentId, 'documentId'); const document = snapshot.documents.find((item) => item.id === documentId); if (!document || !this.allowed(principal, 'document', documentId, action)) throw notFound('DOCUMENT'); return document }
  private requireScope(principal: ApiPrincipal | null, scope: ApiScope): asserts principal is ApiPrincipal { if (!principal) throw new PublicApiError('UNAUTHORIZED', 'Authentication is required.', 401); if (!principal.scopes.has(scope)) throw new PublicApiError('INSUFFICIENT_SCOPE', `The ${scope} scope is required.`, 403, { requiredScope: scope }) }
  private allowed(principal: ApiPrincipal, type: 'project' | 'document', id: string, action: 'read' | 'write' | 'delete'): boolean { return roleAllows(this.repository.roleFor(principal, type, id), action) }
  private requireAccess(principal: ApiPrincipal, type: 'project' | 'document', id: string, action: 'read' | 'write' | 'delete'): void { if (!this.allowed(principal, type, id, action)) throw notFound(type === 'project' ? 'PROJECT' : 'DOCUMENT') }
  private matchRevision(actual: number, expected: number): void { if (actual !== expected) throw conflict(expected, actual) }
  private paginate<T>(items: T[], options: { cursor?: string; limit?: number }): CursorPage<T> { const offset = assertCursor(options.cursor); const limit = assertPageSize(options.limit); const page = items.slice(offset, offset + limit); return { items: page, nextCursor: offset + limit < items.length ? `c_${offset + limit}` : null } }
  private idempotent<T extends IdempotentResult>(principal: ApiPrincipal, operation: string, key: string | undefined, payload: unknown, run: () => T): T { if (!key) return run(); if (key.length < 8 || key.length > 128) throw new PublicApiError('VALIDATION_ERROR', 'Idempotency-Key must contain 8 to 128 characters.', 400, { field: 'Idempotency-Key' }); const cacheKey = `${principal.subject}:${operation}:${key}`; const fingerprint = JSON.stringify(payload, (name, value) => name === 'idempotencyKey' ? undefined : value); const existing = this.idempotency.get(cacheKey); if (existing) { if (existing.fingerprint !== fingerprint) throw new PublicApiError('CONFLICT', 'The idempotency key was already used with a different request.', 409); return structuredClone(existing.result) as T } const result = run(); this.idempotency.set(cacheKey, { fingerprint, result: structuredClone(result) }); return result }
}
