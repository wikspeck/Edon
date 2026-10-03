import { useLayoutEffect, useRef } from 'react'
import { cleanDocHtml, exportDocumentHtml } from './doc-format'
import { useEditor } from './editor-state'

export function DocEditor() {
  const editor = useEditor()
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const html = cleanDocHtml(editor.page.docHtml ?? '')
    if (ref.current && cleanDocHtml(ref.current.innerHTML) !== html) ref.current.innerHTML = html
  }, [editor.page.docHtml, editor.page.id])
  const save = () => {
    if (!ref.current) return
    const html = cleanDocHtml(ref.current.innerHTML)
    if (html !== (editor.page.docHtml ?? '')) editor.updateDoc(html)
  }
  const command = (name: string, value?: string) => { ref.current?.focus(); document.execCommand(name, false, value); save() }
  return <section className="doc-workspace">
    <div className="doc-toolbar" aria-label="Document formatting">
      <select aria-label="Paragraph style" defaultValue="p" onChange={(event) => command('formatBlock', event.target.value)}><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select>
      <select aria-label="Font size" defaultValue="3" onChange={(event) => command('fontSize', event.target.value)}>{['Small', 'Body', 'Medium', 'Large', 'Title'].map((label, index) => <option key={label} value={index + 2}>{label}</option>)}</select>
      {([['bold', 'Bold'], ['italic', 'Italic'], ['underline', 'Underline'], ['insertUnorderedList', 'Bullets'], ['insertOrderedList', 'Numbered'], ['justifyLeft', 'Left'], ['justifyCenter', 'Center'], ['justifyRight', 'Right']] as const).map(([name, label]) => <button key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => command(name)}>{label}</button>)}
      <button onClick={() => exportDocumentHtml(editor.document)}>Export HTML</button><button onClick={() => window.print()}>Print / PDF</button>
    </div>
    <div className="doc-scroll"><div className="doc-paper" ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label={`${editor.page.name} document text`} aria-multiline="true" data-placeholder="Start writing your document…" onInput={save} onPaste={(event) => { event.preventDefault(); document.execCommand('insertHTML', false, cleanDocHtml(event.clipboardData.getData('text/html') || event.clipboardData.getData('text/plain').split('\n').map((line) => `<p>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join(''))); save() }} /></div>
    <div className="doc-print-pages">{editor.document.pages.map((page) => <article key={page.id} dangerouslySetInnerHTML={{ __html: cleanDocHtml(page.docHtml ?? '') }} />)}</div>
    <footer className="doc-status">{editor.page.name} · {(editor.page.docHtml ?? '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length} words · Canvas artwork is kept on this page</footer>
  </section>
}

