import { useCallback, useState } from 'react'
import { EditorView } from './editor/EditorView'
import { HomeView } from './home/HomeView'
import type { EdonDocument } from './model/document'
import { loadDocuments, saveDocuments } from './storage/documents'

export default function App() {
  const [documents, setDocuments] = useState<EdonDocument[]>(loadDocuments)
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeDocument = documents.find((document) => document.id === activeId)

  const persist = useCallback((next: EdonDocument[]) => {
    setDocuments(next)
    saveDocuments(next)
  }, [])

  const createDocument = (document: EdonDocument) => {
    persist([document, ...documents])
    setActiveId(document.id)
  }

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

  return <HomeView documents={documents} onCreate={createDocument} onOpen={(document) => setActiveId(document.id)} />
}
