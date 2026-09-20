import { useState } from 'react'
import { ArrowUpRight, FilePlus2, Folder, Grid2X2, List, Search } from 'lucide-react'
import type { EdonDocument } from '../model/document'
import { BrandMark } from '../ui/BrandMark'
import { IconButton } from '../ui/IconButton'
import { NewFileDialog } from './NewFileDialog'

interface HomeViewProps {
  documents: EdonDocument[]
  onCreate: (document: EdonDocument) => void
  onOpen: (document: EdonDocument) => void
}

const formatUpdated = (date: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(date))

export function HomeView({ documents, onCreate, onOpen }: HomeViewProps) {
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [gridView, setGridView] = useState(true)
  const filtered = documents
    .filter((document) => document.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <main className="home-shell">
      <aside className="home-sidebar">
        <div className="home-brand"><BrandMark size={22} /><span>edon</span></div>
        <button className="new-file-button" onClick={() => setCreating(true)}><FilePlus2 size={16} /> New file</button>
        <nav className="home-nav" aria-label="File navigation">
          <button className="is-active"><Grid2X2 size={16} /> Recent</button>
          <button disabled><Folder size={16} /> Projects <span className="coming-soon">Soon</span></button>
        </nav>
        <div className="home-sidebar-footer">
          <div className="account-chip"><span>WK</span><div><strong>Local workspace</strong><small>Saved in this browser</small></div></div>
        </div>
      </aside>

      <section className="files-view">
        <header className="files-header">
          <div><p className="eyebrow">Workspace</p><h1>Recent files</h1></div>
          <div className="files-actions">
            <label className="search-control"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files" /></label>
            <div className="view-switcher">
              <IconButton label="Grid view" active={gridView} onClick={() => setGridView(true)}><Grid2X2 size={15} /></IconButton>
              <IconButton label="List view" active={!gridView} onClick={() => setGridView(false)}><List size={15} /></IconButton>
            </div>
          </div>
        </header>

        {filtered.length > 0 ? (
          <div className={gridView ? 'file-grid' : 'file-list'}>
            {filtered.map((document) => {
              const page = document.pages[0]
              return (
                <article className="file-card" key={document.id} onClick={() => onOpen(document)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen(document)}>
                  <div className="file-preview">
                    <div className="file-artboard" style={{ aspectRatio: `${page.width} / ${page.height}` }}>
                      {page.elements.slice(0, 8).map((element) => <span key={element.id} style={{ left: `${element.x / page.width * 100}%`, top: `${element.y / page.height * 100}%`, width: `${element.width / page.width * 100}%`, height: `${element.height / page.height * 100}%`, background: element.fill, borderRadius: element.type === 'ellipse' ? '50%' : `${Math.min(element.cornerRadius, 6)}px` }} />)}
                    </div>
                    <button className="file-open-action" aria-label={`Open ${document.name}`}><ArrowUpRight size={16} /></button>
                  </div>
                  <div className="file-meta"><div><strong>{document.name}</strong><span>{page.width} × {page.height} · Edited {formatUpdated(document.updatedAt)}</span></div></div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="files-empty">
            <div className="empty-sheet"><span /><span /><span /></div>
            <h2>{query ? 'No matching files' : 'Your first canvas is waiting'}</h2>
            <p>{query ? 'Try a different file name.' : 'Create a precise, focused workspace and start shaping your idea.'}</p>
            {!query && <button className="button-primary" onClick={() => setCreating(true)}><FilePlus2 size={15} /> Create a file</button>}
          </div>
        )}
      </section>

      {creating && <NewFileDialog onClose={() => setCreating(false)} onCreate={(document) => { setCreating(false); onCreate(document) }} />}
    </main>
  )
}
