import { normalizeProject, type EdonProject } from '../model/project'

const STORAGE_KEY = 'edon.projects.v1'

export function loadProjects(): EdonProject[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.map(normalizeProject).filter((project): project is EdonProject => project !== null) : []
  } catch { return [] }
}

export function saveProjects(projects: EdonProject[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)) } catch (error) { console.warn('Edon could not persist projects.', error) }
}
