import type { EdonDocument } from '../model/document'

const STORAGE_KEY = 'edon.documents.v1'

export function loadDocuments(): EdonDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as EdonDocument[] : []
  } catch {
    return []
  }
}

export function saveDocuments(documents: EdonDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents))
  } catch (error) {
    console.warn('Edon could not persist the latest document snapshot.', error)
  }
}
