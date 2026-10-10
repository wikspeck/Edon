import { VideoEditor } from './video/VideoEditor'
import { MusicEditor } from './music/MusicEditor'
import { useCallback, useState, useEffect, useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { connectedEditor, createMcpHandler } from './integrations/mcp'
import type { WorkspaceSnapshot } from './integrations/public-api/repository'
import { EditorView } from './editor/EditorView'
import { HomeView } from './home/HomeView'
import { documentKind, type EdonDocument } from './model/document'
import { loadDocuments, saveDocuments } from './storage/documents'
import type { EdonProject } from './model/project'
import { loadProjects, saveProjects } from './storage/projects'

export default function Workspace() {
  const [documents, setDocuments] = useState<EdonDocument[]>(loadDocuments)
  const [projects, setProjects] = useState<EdonProject[]>(loadProjects)
  const [activeId, setActiveId] = useState<string | null>(() => /[?&](code|error)=/.test(location.search) ? sessionStorage.getItem('edon.spotify.document') : null)
  const activeDocument = documents.find((document) => document.id === activeId)

  const snapshotRef = useRef({documents, projects})
  useLayoutEffect(() => { snapshotRef.current = { documents, projects } }, [documents, projects])
  useEffect(() => {
    if (!window.edonDesktop?.onMcpRequest) return
    const read = (): WorkspaceSnapshot => {
      const live = connectedEditor?.read()
      const { projects, documents } = snapshotRef.current
      return structuredClone({ projects, documents: documents.map(document => live?.id === document.id ? live : document) })
    }
    return window.edonDesktop.onMcpRequest(createMcpHandler({ read, roleFor: () => 'owner', commit: snapshot => {
      const live = connectedEditor?.read()
      const changed = live && snapshot.documents.find(document => document.id === live.id && document.revision !== live.revision)
      if (changed && connectedEditor?.busy()) throw new Error('Finish the current drag or brush stroke before an AI edit.')
      const previousDocuments = localStorage.getItem('edon.documents.v1')
      const previousProjects = localStorage.getItem('edon.projects.v1')
      try {
        localStorage.setItem('edon.documents.v1', JSON.stringify(snapshot.documents))
        localStorage.setItem('edon.projects.v1', JSON.stringify(snapshot.projects))
      } catch (error) {
        if (previousDocuments !== null) localStorage.setItem('edon.documents.v1', previousDocuments); else localStorage.removeItem('edon.documents.v1')
        if (previousProjects !== null) localStorage.setItem('edon.projects.v1', previousProjects); else localStorage.removeItem('edon.projects.v1')
        throw error
      }
      if (changed) connectedEditor?.commit(changed)
      flushSync(() => { setDocuments(snapshot.documents); setProjects(snapshot.projects) })
    } }, id => flushSync(() => setActiveId(id))))
  }, [])

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
  const trashDocument = (id: string) => persist(documents.map((document) => document.id === id ? { ...document, trashedAt: new Date().toISOString() } : document))
  const restoreDocument = (id: string) => persist(documents.map((document) => document.id === id ? { ...document, trashedAt: undefined } : document))

  const updateDocument = useCallback((updated: EdonDocument) => {
    setDocuments((current) => {
      const next = current.map((document) => document.id === updated.id ? updated : document)
      saveDocuments(next)
      return next
    })
  }, [])

  if (activeDocument) {
    if (documentKind(activeDocument) === 'video') return <VideoEditor key={activeDocument.id} document={activeDocument} onChange={updateDocument} onBack={() => setActiveId(null)} />
    if (documentKind(activeDocument) === 'music') return <MusicEditor key={activeDocument.id} document={activeDocument} onChange={updateDocument} onBack={() => setActiveId(null)} />
    return <EditorView key={activeDocument.id} document={activeDocument} onChange={updateDocument} onBack={() => setActiveId(null)} />
  }

  return <HomeView documents={documents} projects={projects} onProjectsChange={updateProjects} onMoveDocument={moveDocument} onCreate={createDocument} onOpen={(document) => setActiveId(document.id)} onTrash={trashDocument} onRestore={restoreDocument} />
}
