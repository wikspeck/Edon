import { renderToStaticMarkup } from 'react-dom/server'
import type { EdonDocument, EdonElement } from '../model/document'
import { CanvasElement } from './CanvasElement'
import { MaskDefinition } from './MaskDefinition'
import { ImageOutline } from './ImageOutline'
import { animationFrames } from './ui-design'
import { resolveVectorFills } from './vector-fill'

const escape = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export const safeUiLink = (s?: string) => s && /^(https?:\/\/|mailto:|#|\/[^/])/i.test(s) ? s : undefined
export function exportUiHtml(document: EdonDocument, pageId = document.activePageId): string {
  const page = document.pages.find(p => p.id === pageId)
  if (!page) throw new Error('Page not found')
  const elements = resolveVectorFills(page.elements), noop = () => {}
  const animations: { id: string; frames: Keyframe[]; options: KeyframeAnimationOptions; trigger: string }[] = []
  function node(e: EdonElement, parent?: EdonElement): string {
    if (!e.visible || e.includeInExport === false) return ''
    const inLayout = Boolean(parent?.ui?.layout) && !e.vectorFill
    const l = e.ui?.layout
    const style = `position:${inLayout ? 'relative' : 'absolute'};left:${inLayout ? 0 : e.x - (parent?.x ?? 0)}px;top:${inLayout ? 0 : e.y - (parent?.y ?? 0)}px;width:${e.width}px;height:${e.height}px;flex-shrink:0;${l ? `display:flex;flex-direction:${l.direction};gap:${l.gap}px;padding:${l.padding}px;align-items:${l.align === 'start' ? 'flex-start' : l.align === 'end' ? 'flex-end' : 'center'};justify-content:${l.justify === 'start' ? 'flex-start' : l.justify === 'end' ? 'flex-end' : l.justify};` : ''}`
    const a = e.ui?.animation
    if (a) animations.push({id:e.id,frames:animationFrames(a),options:{duration:a.duration,delay:a.delay,easing:a.easing,iterations:a.repeat?Infinity:1},trigger:a.trigger})
    const body = e.type === 'group' ? elements.filter(c => c.parentId === e.id).map(c => node(c,e)).join('') : renderToStaticMarkup(<><MaskDefinition element={e}/><ImageOutline element={e}/><CanvasElement element={{...e,x:0,y:0}} exportMode selected={false} editingText={false} silhouette={false} onPointerDown={noop} onContextMenu={noop} onTextEdit={noop} onBeginTextEdit={noop} onBeginVectorEdit={noop}/></>)
    const href = safeUiLink(e.ui?.href), label = escape(e.ui?.label ?? e.name)
    if (e.ui?.role === 'input') return `<div id="${e.id}" style="${style}"><input aria-label="${label}" placeholder="${label}" class="edon-input"/></div>`
    if (e.ui?.role === 'checkbox') return `<label id="${e.id}" style="${style}" class="edon-check"><input type="checkbox"/>${label}</label>`
    const tag = href ? 'a' : e.ui?.role === 'button' ? 'button' : e.ui?.role === 'navigation' ? 'nav' : 'div'
    return `<${tag} id="${e.id}" style="${style}"${href ? ` href="${escape(href)}"` : ''}${e.ui ? ` aria-label="${label}"` : ''}${tag === 'button' ? ' type="button"' : ''}>${body}</${tag}>`
  }
  const content = elements.filter(e => e.parentId === null).map(e => node(e)).join('')
  const data = JSON.stringify(animations).replace(/</g,'\\u003c')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(document.name)}</title><style>
*{box-sizing:border-box}body{margin:0;background:${page.background};font-family:Inter,system-ui,sans-serif}button,a{color:inherit;text-decoration:none}button{border:0;padding:0;background:transparent;cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid #3578ff;outline-offset:3px}.canvas-element{position:absolute;transform-origin:center}.canvas-element.type-text{display:flex;white-space:pre-wrap;overflow:hidden}.canvas-text-content{width:100%;overflow-wrap:break-word}.canvas-text-content p{margin:0}.canvas-text-content ul,.canvas-text-content ol{margin:0;padding-left:1.4em}.effect-definitions{position:absolute;width:0;height:0;overflow:hidden}.canvas-element svg{display:block;overflow:visible}.edon-input{width:100%;height:100%;border:0;border-radius:10px;background:#f2f2f0;padding:0 16px;font:15px Inter,system-ui,sans-serif}.edon-check{display:flex;align-items:flex-start;gap:12px;font-size:15px}.edon-check input{width:24px;height:24px;margin:0;accent-color:#20211f}#edon-viewport{width:100%;overflow:hidden}#edon-page{position:relative;width:${page.width}px;height:${page.height}px;transform-origin:top left;isolation:isolate}
</style></head><body><main id="edon-viewport"><div id="edon-page">${content}</div></main><script>
const designs=${data};const reduced=matchMedia('(prefers-reduced-motion: reduce)');for(const a of designs){const el=document.getElementById(a.id);if(!el)continue;let active;const play=()=>{if(reduced.matches)return;active?.cancel();active=el.animate(a.frames,{...a.options,iterations:a.options.iterations===null?Infinity:a.options.iterations});};if(a.trigger==='load')play();else el.addEventListener(a.trigger==='hover'?'pointerenter':'click',play);if(a.trigger==='hover')el.addEventListener('pointerleave',()=>active?.cancel());}const page=document.getElementById('edon-page'),viewport=document.getElementById('edon-viewport');function resize(){const scale=Math.min(1,viewport.clientWidth/${page.width});page.style.transform='scale('+scale+')';viewport.style.height=(${page.height}*scale)+'px';}addEventListener('resize',resize);resize();
</script></body></html>`
}

export function downloadUiHtml(document: EdonDocument) { const url=URL.createObjectURL(new Blob([exportUiHtml(document)],{type:'text/html'}));const a=window.document.createElement('a');a.href=url;a.download=`${document.name.replace(/[^a-z0-9-]/gi,'-')}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000) }
