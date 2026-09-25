import { useCallback, useState } from 'react'
import { EditorView } from './editor/EditorView'
import { HomeView } from './home/HomeView'
import type { EdonDocument } from './model/document'
import { loadDocuments, saveDocuments } from './storage/documents'
import type { EdonProject } from './model/project'
import { loadProjects, saveProjects } from './storage/projects'

export default function App() {
  const [documents, setDocuments] = useState<EdonDocument[]>(loadDocuments)
  const [projects, setProjects] = useState<EdonProject[]>(loadProjects)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeDocument = documents.find((document) => document.id === activeId)

  const persist = useCallback((next: EdonDocument[]) => {
    setDocuments(next)
    saveDocuments(next)
  }, [])

  const createDocument = (document: EdonDocument, projectId?: string) => {
    persist([document, ...documents])
    if (projectId) updateProjects(projects.map((project) => project.id === projectId ? { ...project, revision: project.revision + 1, documentIds: [document.id, ...project.documentIds], updatedAt: new Date().toISOString() } : project))
    setActiveId(document.id)
  }

  const updateProjects = (next: EdonProject[]) => { setProjects(next); saveProjects(next) }
  const moveDocument = (documentId: string, projectId: string | null) => updateProjects(projects.map((project) => { const changed = project.documentIds.includes(documentId) || project.id === projectId; return { ...project, revision: changed ? project.revision + 1 : project.revision, documentIds: project.id === projectId ? [...new Set([documentId, ...project.documentIds])] : project.documentIds.filter((id) => id !== documentId), updatedAt: changed ? new Date().toISOString() : project.updatedAt } }))

  const updateDocument = useCallback((updated: EdonDocument) => {
    setDocuments((current) => {
      const next = current.map((document) => document.id === updated.id ? updated : document)
      saveDocuments(next)
      return next
    })
  }, [])

  if (activeDocument) {
    return <EditorView key={activeDocument.id} document={activeDocument} onChange={updateDocument} onBack={() => setActiveId(null)} />
  }

  return <HomeView documents={documents} projects={projects} onProjectsChange={updateProjects} onMoveDocument={moveDocument} onCreate={createDocument} onOpen={(document) => setActiveId(document.id)} />
}
