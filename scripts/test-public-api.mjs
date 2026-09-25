import assert from 'node:assert/strict'
import { createServer } from 'vite'

const vite = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
try {
  const { EdonPublicApiService } = await vite.ssrLoadModule('/src/integrations/public-api/service.ts')
  const { MemoryPublicApiRepository } = await vite.ssrLoadModule('/src/integrations/public-api/repository.ts')
  const { PublicApiError } = await vite.ssrLoadModule('/src/integrations/public-api/errors.ts')

  const scopes = new Set(['projects:read', 'projects:write', 'documents:read', 'documents:write'])
  const owner = { subject: 'test-owner', clientId: 'agent-test', scopes }
  const repository = new MemoryPublicApiRepository()
  const api = new EdonPublicApiService(repository)

  assert.equal(api.capabilities().features.batch, true)
  assert.deepEqual(api.listProjects(owner).items, [])

  const project = api.createProject(owner, { name: 'Agent flow', idempotencyKey: 'project-once' }, 'req_project')
  const projectRetry = api.createProject(owner, { name: 'Agent flow', idempotencyKey: 'project-once' }, 'req_retry')
  assert.equal(projectRetry.resource.id, project.resource.id, 'idempotency returns the original resource')
  assert.throws(() => api.createProject(owner, { name: 'Different body', idempotencyKey: 'project-once' }), (error) => error instanceof PublicApiError && error.code === 'CONFLICT')
  assert.equal(api.listProjects(owner).items.length, 1)

  const document = api.createDocument(owner, { name: 'Deck', width: 1920, height: 1080, projectId: project.resource.id, idempotencyKey: 'document-once' }, 'req_document')
  assert.equal(document.resource.revision, 1)
  assert.equal(api.listDocuments(owner, { projectId: project.resource.id }).items.length, 1)

  const slide = api.createSlide(owner, document.resource.id, { name: 'Details', ifMatchRevision: 1, idempotencyKey: 'slide-once' }, 'req_slide')
  assert.equal(slide.revision, 2)

  const text = api.createElement(owner, document.resource.id, slide.resource.id, { type: 'text', x: 120, y: 80, width: 600, height: 100, text: 'Original', ifMatchRevision: 2, idempotencyKey: 'element-once' }, 'req_element')
  assert.equal(text.revision, 3)
  const updated = api.updateElement(owner, document.resource.id, slide.resource.id, text.resource.id, { patch: { text: 'Updated', x: 180 }, ifMatchRevision: 3 }, 'req_update')
  assert.equal(updated.resource.text, 'Updated')
  assert.equal(updated.revision, 4)

  const dryRun = api.applyOperations(owner, document.resource.id, { ifMatchRevision: 4, dryRun: true, operations: [{ op: 'update_element', slideId: slide.resource.id, elementId: text.resource.id, patch: { y: 140 } }] }, 'req_dry')
  assert.equal(dryRun.documentRevision, 5)
  assert.equal(api.getDocument(owner, document.resource.id).revision, 4, 'dry-run does not persist')

  const batch = api.applyOperations(owner, document.resource.id, { ifMatchRevision: 4, idempotencyKey: 'batch-once', operations: [
    { op: 'update_element', slideId: slide.resource.id, elementId: text.resource.id, patch: { y: 140 } },
    { op: 'create_element', slideId: slide.resource.id, element: { type: 'rectangle', x: 100, y: 260, width: 500, height: 240, fill: '#3366ff' } },
  ] }, 'req_batch')
  assert.deepEqual({ changed: batch.changed, created: batch.created, updated: batch.updated }, { changed: 2, created: 1, updated: 1 })
  assert.equal(batch.documentRevision, 5)

  const beforeFailure = structuredClone(repository.read())
  assert.throws(() => api.applyOperations(owner, document.resource.id, { ifMatchRevision: 5, operations: [
    { op: 'update_element', slideId: slide.resource.id, elementId: text.resource.id, patch: { x: 999 } },
    { op: 'delete_element', slideId: slide.resource.id, elementId: 'text_00000000' },
  ] }), (error) => error instanceof PublicApiError && error.code === 'ELEMENT_NOT_FOUND')
  assert.deepEqual(repository.read(), beforeFailure, 'failed batch rolls back every operation')

  assert.throws(() => api.updateDocument(owner, document.resource.id, { name: 'Stale', ifMatchRevision: 4 }), (error) => error instanceof PublicApiError && error.code === 'CONFLICT')
  assert.throws(() => api.createElement(owner, document.resource.id, slide.resource.id, { type: 'image', x: 0, y: 0, imageUrl: 'http://127.0.0.1/metadata', ifMatchRevision: 5 }), (error) => error instanceof PublicApiError && error.code === 'VALIDATION_ERROR')

  const readOnly = { subject: 'test-owner', clientId: 'read-test', scopes: new Set(['projects:read', 'documents:read']) }
  assert.throws(() => api.createProject(readOnly, { name: 'Nope' }), (error) => error instanceof PublicApiError && error.code === 'INSUFFICIENT_SCOPE')
  const foreign = { subject: 'attacker', clientId: 'idor-test', scopes }
  assert.throws(() => api.getDocument(foreign, document.resource.id), (error) => error instanceof PublicApiError && error.code === 'DOCUMENT_NOT_FOUND')

  const results = api.search(owner, 'updated')
  assert.equal(results.items.some((item) => item.resourceId === text.resource.id), true)
  console.log('Public API agent flow, authorization, validation, concurrency, idempotency, and rollback tests passed.')
} finally {
  await vite.close()
}
