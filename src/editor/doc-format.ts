import type { EdonDocument } from '../model/document'

// Only retain document formatting; imported HTML cannot execute code or load assets.
export function cleanDocHtml(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const allowed = new Set(['P', 'DIV', 'BR', 'H1', 'H2', 'H3', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'SPAN', 'FONT', 'BLOCKQUOTE'])
  const clean = (parent: DocumentFragment | Element) => {
    for (const child of [...parent.children]) {
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH'].includes(child.tagName)) { child.remove(); continue }
      clean(child)
      if (!allowed.has(child.tagName)) { child.replaceWith(...child.childNodes); continue }
      const alignment = (child as HTMLElement).style.textAlign
      const size = child.tagName === 'FONT' ? child.getAttribute('size') : null
      for (const attribute of [...child.attributes]) child.removeAttribute(attribute.name)
      if (['left', 'center', 'right', 'justify'].includes(alignment)) (child as HTMLElement).style.textAlign = alignment
      if (size && /^[1-7]$/.test(size)) child.setAttribute('size', size)
    }
  }
  clean(template.content)
  return template.innerHTML
}

export function exportDocumentHtml(edonDocument: EdonDocument) {
    const pages = edonDocument.pages.map((page) => `<article>${cleanDocHtml(page.docHtml ?? '')}</article>`).join('')
    const html = `<!doctype html><html><meta charset="utf-8"><title>Edon document</title><style>body{font:16px/1.6 system-ui;max-width:794px;margin:40px auto}article{padding:48px;min-height:900px;break-after:page}article:last-child{break-after:auto}@media print{body{margin:0}article{min-height:0}}</style><body>${pages}</body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${edonDocument.name.replace(/[^a-z0-9_-]/gi, '-')}.html`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
