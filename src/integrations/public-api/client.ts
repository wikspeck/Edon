import type { ApplyOperationsInput, ChangeSummary, CreateDocumentInput, CreateElementInput, CreateProjectInput, CursorPage, DocumentResource, ElementResource, MutationResult, ProjectResource, SearchResult, SlideResource } from './contract'
import type { ErrorEnvelope } from './errors'

export class EdonApiClientError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string, public readonly requestId?: string, public readonly details: Record<string, unknown> = {}) { super(message); this.name = 'EdonApiClientError' }
}

export interface EdonApiClientOptions { baseUrl: string; accessToken: () => string | Promise<string>; fetch?: typeof globalThis.fetch }

export class EdonApiClient {
  private readonly fetcher: typeof globalThis.fetch
  constructor(private readonly options: EdonApiClientOptions) { this.fetcher = options.fetch ?? globalThis.fetch }

  listProjects(cursor?: string): Promise<CursorPage<ProjectResource>> { return this.request('GET', '/api/v1/projects', undefined, { cursor }) }
  createProject(input: CreateProjectInput): Promise<MutationResult<ProjectResource>> { return this.request('POST', '/api/v1/projects', input, undefined, input.idempotencyKey) }
  listDocuments(projectId?: string, cursor?: string): Promise<CursorPage<DocumentResource>> { return this.request('GET', '/api/v1/documents', undefined, { projectId, cursor }) }
  getDocument(id: string): Promise<DocumentResource> { return this.request('GET', `/api/v1/documents/${encodeURIComponent(id)}`) }
  createDocument(input: CreateDocumentInput): Promise<MutationResult<DocumentResource>> { return this.request('POST', '/api/v1/documents', input, undefined, input.idempotencyKey) }
  listSlides(documentId: string, cursor?: string): Promise<CursorPage<SlideResource>> { return this.request('GET', `/api/v1/documents/${encodeURIComponent(documentId)}/slides`, undefined, { cursor }) }
  listElements(documentId: string, slideId: string, cursor?: string): Promise<CursorPage<ElementResource>> { return this.request('GET', `/api/v1/documents/${encodeURIComponent(documentId)}/slides/${encodeURIComponent(slideId)}/elements`, undefined, { cursor }) }
  createElement(documentId: string, slideId: string, input: CreateElementInput): Promise<MutationResult<ElementResource>> { return this.request('POST', `/api/v1/documents/${encodeURIComponent(documentId)}/slides/${encodeURIComponent(slideId)}/elements`, input, undefined, input.idempotencyKey) }
  applyOperations(documentId: string, input: ApplyOperationsInput): Promise<ChangeSummary> { return this.request('POST', `/api/v1/documents/${encodeURIComponent(documentId)}/operations`, input, undefined, input.idempotencyKey) }
  search(query: string, cursor?: string): Promise<CursorPage<SearchResult>> { return this.request('GET', '/api/v1/search', undefined, { q: query, cursor }) }

  private async request<T>(method: string, path: string, body?: unknown, query?: Record<string, string | undefined>, idempotencyKey?: string): Promise<T> {
    const url = new URL(path, this.options.baseUrl); for (const [key, value] of Object.entries(query ?? {})) if (value) url.searchParams.set(key, value)
    const token = await this.options.accessToken(); const response = await this.fetcher(url, { method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) }, body: body ? JSON.stringify(body) : undefined })
    const requestId = response.headers.get('x-request-id') ?? undefined; const payload: unknown = response.status === 204 ? undefined : await response.json()
    if (!response.ok) { const envelope = payload as Partial<ErrorEnvelope>; throw new EdonApiClientError(response.status, envelope.error?.code ?? 'HTTP_ERROR', envelope.error?.message ?? `Request failed with status ${response.status}.`, envelope.error?.requestId ?? requestId, envelope.error?.details) }
    return payload as T
  }
}

