import { createId } from './document'

export interface EdonProject {
  version: 1
  id: string
  name: string
  createdAt: string
  updatedAt: string
  documentIds: string[]
  metadata: { description?: string; thumbnailDocumentId?: string; sort?: 'updated' | 'name' }
}

export function createProject(name: string): EdonProject {
  const timestamp = new Date().toISOString()
  return { version: 1, id: createId('project'), name: name.trim() || 'Untitled project', createdAt: timestamp, updatedAt: timestamp, documentIds: [], metadata: { sort: 'updated' } }
}

export function normalizeProject(input: unknown): EdonProject | null {
  if (!input || typeof input !== 'object') return null
  const project = input as Partial<EdonProject>
  if (!project.id || !project.name) return null
  const timestamp = new Date().toISOString()
  return { version: 1, id: project.id, name: project.name, createdAt: project.createdAt ?? timestamp, updatedAt: project.updatedAt ?? timestamp, documentIds: Array.isArray(project.documentIds) ? [...new Set(project.documentIds.filter((id): id is string => typeof id === 'string'))] : [], metadata: project.metadata ?? {} }
}
