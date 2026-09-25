import type { EdonDocument } from '../../model/document'
import type { EdonProject } from '../../model/project'
import { loadDocuments, saveDocuments } from '../../storage/documents'
import { loadProjects, saveProjects } from '../../storage/projects'
import type { AccessRole, ApiPrincipal, ResourceAction } from './contract'

export interface WorkspaceSnapshot { projects: EdonProject[]; documents: EdonDocument[] }

export interface PublicApiRepository {
  read(): WorkspaceSnapshot
  commit(snapshot: WorkspaceSnapshot): void
  roleFor(principal: ApiPrincipal, resourceType: 'project' | 'document', resourceId: string): AccessRole | null
}

export class BrowserLocalRepository implements PublicApiRepository {
  static readonly localSubject = 'local-browser-user'
  read(): WorkspaceSnapshot { return { projects: loadProjects(), documents: loadDocuments() } }
  commit(snapshot: WorkspaceSnapshot): void { saveProjects(snapshot.projects); saveDocuments(snapshot.documents) }
  roleFor(principal: ApiPrincipal): AccessRole | null { return principal.subject === BrowserLocalRepository.localSubject ? 'owner' : null }
}

export class MemoryPublicApiRepository implements PublicApiRepository {
  private snapshot: WorkspaceSnapshot
  private readonly grants = new Map<string, AccessRole>()

  constructor(seed: WorkspaceSnapshot = { projects: [], documents: [] }, private readonly ownerSubject = 'test-owner') { this.snapshot = structuredClone(seed) }
  read(): WorkspaceSnapshot { return structuredClone(this.snapshot) }
  commit(snapshot: WorkspaceSnapshot): void { this.snapshot = structuredClone(snapshot) }
  grant(subject: string, resourceType: 'project' | 'document', resourceId: string, role: AccessRole): void { this.grants.set(`${subject}:${resourceType}:${resourceId}`, role) }
  roleFor(principal: ApiPrincipal, resourceType: 'project' | 'document', resourceId: string): AccessRole | null { return this.grants.get(`${principal.subject}:${resourceType}:${resourceId}`) ?? (principal.subject === this.ownerSubject ? 'owner' : null) }
}

export function roleAllows(role: AccessRole | null, action: ResourceAction): boolean {
  if (role === 'owner') return true
  if (role === 'editor') return action !== 'delete'
  return role === 'viewer' && action === 'read'
}
