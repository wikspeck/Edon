export interface ChatGptToolDefinition {
  name: string
  title: string
  description: string
  apiOperationId: string
  scopes: string[]
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; openWorldHint: boolean }
}

export const EDON_CHATGPT_TOOLS: ChatGptToolDefinition[] = [
  { name: 'list_projects', title: 'List Edon projects', description: 'Find project containers visible to the connected user. Returns metadata only, not document contents.', apiOperationId: 'listProjects', scopes: ['projects:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_project', title: 'Get an Edon project', description: 'Read one project by stable ID before changing its documents.', apiOperationId: 'getProject', scopes: ['projects:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'create_project', title: 'Create an Edon project', description: 'Create a project container. Use an idempotency key when retrying.', apiOperationId: 'createProject', scopes: ['projects:write'], annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'list_documents', title: 'List Edon documents', description: 'List design documents, optionally within one project. Does not return slides or elements.', apiOperationId: 'listDocuments', scopes: ['documents:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'get_document', title: 'Get an Edon document', description: 'Inspect a document and its current revision before a write.', apiOperationId: 'getDocument', scopes: ['documents:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'create_document', title: 'Create an Edon document', description: 'Create a canvas document, optionally inside a project.', apiOperationId: 'createDocument', scopes: ['documents:write'], annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'list_slides', title: 'List document slides', description: 'Read paginated slides for a document.', apiOperationId: 'listSlides', scopes: ['documents:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'create_slide', title: 'Create a slide', description: 'Append one slide using the current document revision.', apiOperationId: 'createSlide', scopes: ['documents:write'], annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'list_elements', title: 'List slide elements', description: 'Read stable element IDs and structured properties from one slide.', apiOperationId: 'listElements', scopes: ['documents:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
  { name: 'create_element', title: 'Create an element', description: 'Create one structured element on a slide and return only that element plus the new revision.', apiOperationId: 'createElement', scopes: ['documents:write'], annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'update_element', title: 'Update an element', description: 'Change explicitly supplied properties on an element addressed by stable ID.', apiOperationId: 'updateElement', scopes: ['documents:write'], annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
  { name: 'apply_operations', title: 'Apply document operations', description: 'Validate and atomically apply up to 50 related slide or element changes. Use dryRun first for complex edits.', apiOperationId: 'applyOperations', scopes: ['documents:write'], annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false } },
  { name: 'search_edon', title: 'Search Edon', description: 'Search accessible project, document, slide, element-name, and text metadata without loading full documents.', apiOperationId: 'search', scopes: ['projects:read', 'documents:read'], annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } },
]

