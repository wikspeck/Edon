import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const spec = JSON.parse(await readFile(new URL('../openapi/edon-public-api.v1.json', import.meta.url), 'utf8'))
assert.equal(spec.openapi, '3.1.0')
assert.ok(spec.components?.schemas?.Error)
assert.ok(spec.components?.securitySchemes?.oauth2)

const operations = new Map()
for (const [path, pathItem] of Object.entries(spec.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const operation = pathItem[method]
    if (!operation) continue
    assert.ok(operation.operationId, `${method.toUpperCase()} ${path} needs operationId`)
    assert.ok(!operations.has(operation.operationId), `duplicate operationId ${operation.operationId}`)
    assert.ok(operation.responses, `${operation.operationId} needs responses`)
    operations.set(operation.operationId, { method, path })
  }
}

const toolSource = await readFile(new URL('../src/integrations/chatgpt/tools.ts', import.meta.url), 'utf8')
for (const operationId of ['listProjects', 'getProject', 'createProject', 'listDocuments', 'getDocument', 'createDocument', 'listSlides', 'createSlide', 'listElements', 'createElement', 'updateElement', 'applyOperations', 'search']) {
  assert.ok(operations.has(operationId), `OpenAPI is missing tool operation ${operationId}`)
  assert.ok(toolSource.includes(`apiOperationId: '${operationId}'`), `ChatGPT tool mapping is missing ${operationId}`)
}

assert.ok(spec.paths['/documents/{documentId}/operations'].post.tags.includes('Destructive'))
assert.equal(spec.components.schemas.ApplyOperations.properties.operations.maxItems, 50)
console.log(`OpenAPI 3.1 contract validated: ${operations.size} unique operations and all ChatGPT mappings are present.`)

