import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ArrowDown, MoveUpRight, Download, Monitor, MousePointer2, Layers, Type, Film, Music2, Check } from 'lucide-react'
import { BrandMark } from '../ui/BrandMark'
import './marketing.css'

const disciplines = [
  { name: 'Canvas', icon: Layers, title: 'Pixels. Vectors. Your point of view.', description: 'Build with shapes, paint in pixels, place images and compose with type. Keep everything together on one canvas.', features: ['Pixel and vector tools', 'Independent brush layers', 'Masks and Boolean operations', 'Multiple pages and exports'], image: '/media/edon-canvas.png' },
  { name: 'Documents', icon: Type, title: 'A good idea deserves good typography.', description: 'Write, format and give your thoughts room. Choose fonts and real text sizes, with clear formatting controls.', features: ['Font families and sizes', 'Bold, italic and alignment', 'Rich text editing', 'Local autosave'], image: '/media/edon-document.png' },
  { name: 'Presentations', icon: Monitor, title: 'Make every page count.', description: 'Compose a story across pages with the same canvas tools. Arrange images, shapes and text, then export your work.', features: ['Canvas-based slides', 'Images and text together', 'Page management', 'PDF export'], image: '/media/edon-canvas.png' },
  { name: 'Video', icon: Film, title: 'Find the shape of your story.', description: 'An early workspace for your footage. Bring in clips, preview them and define what stays. Rendered video export is still to come.', features: ['Local clip import', 'Individual clip previews', 'In / out trim points', 'Saved edit lists'], image: '/media/edon-video.png' },
  { name: 'Audio', icon: Music2, title: 'Keep the sound. Lose the friction.', description: 'A focused place for your local tracks. Build a library, organize playlists and make simple transitions.', features: ['Persistent local library', 'Playlists and notes', 'Independent decks and EQ', 'Crossfading and WAV export'], image: '/media/edon-audio.png' },
]
type Release = { version: string; url: string; bytes: number; sha256: string }
export function Marketing() {
  const root = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const [release, setRelease] = useState<Release | null>(null)
  const [video, setVideo] = useState(false)
  const current = disciplines[active]
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth < 900)
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/downloads/release.json', { cache:'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok || !response.headers.get('content-type')?.includes('json')) return
      const data = await response.json() as Release
      if (/^\/download\/Edon-[\d.]+-win-x64\.exe$/.test(data.url) && Number.isFinite(data.bytes) && data.bytes > 0) {
        setRelease(data)
      }
    }).catch(() => {})
    void fetch('/media/edon-demo.mp4', { method: 'HEAD', signal: controller.signal }).then(response => {
      if (response.ok && response.headers.get('content-type')?.startsWith('video/')) setVideo(true)
    }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: .08 })
    root.current?.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])
  return <main className={`edon-site ${mobile ? 'is-mobile-device' : ''}`} ref={root} onScroll={event => {
    const page = event.currentTarget
    page.style.setProperty('--reading', String(page.scrollTop / Math.max(1, page.scrollHeight - page.clientHeight)))
  }}>
    <nav className="site-nav" aria-label="Main navigation"><a className="site-brand" href="/" aria-label="Edon home"><img src="/brand/edon-logo.svg" width="140" height="30" alt="edon" /></a><div><a href="#work">The suite</a><a href="#film">In motion</a><a href="#desktop">Windows</a><a className="site-launch" href="/app">Open Edon <ArrowUpRight size={16} /></a></div></nav>
    <section className="site-hero" onPointerMove={event => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const bounds = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty('--drift-x', `${(event.clientX - bounds.left - bounds.width / 2) * .02}px`)
      event.currentTarget.style.setProperty('--drift-y', `${(event.clientY - bounds.top - bounds.height / 2) * .02}px`)
    }} onPointerLeave={event => { event.currentTarget.style.setProperty('--drift-x', '0px'); event.currentTarget.style.setProperty('--drift-y', '0px') }}>
      <div className="site-status"><i /> An independent space to make things.</div><h1>Ideas don't<br />stay in <em>one box.</em></h1><div className="hero-bottom"><p>Images, documents, presentations and moving stories.<br />One considered suite. A little more room to create.</p><a href="/app" className="site-pill">Open the workspace <MoveUpRight size={20} /></a><a className="hero-download" href="#desktop">Get Edon for Windows <ArrowDown size={14} /></a></div><a className="scroll-note" href="#work">SCROLL TO EXPLORE <ArrowDown size={14} /></a><div className="kinetic-mark" aria-hidden="true"><div /><div /><div /><span><BrandMark size={230} /></span></div>
    </section>
    <section className="site-principles" aria-label="Product principles"><span><MousePointer2 size={16} /> Made for your flow</span><span><Layers size={16} /> Different tools. One place.</span><span><Monitor size={16} /> Web + Windows</span><span>Independent by design.</span></section>
    <section id="work" className="suite-explorer" data-reveal><div className="section-caption"><span>FIVE WAYS TO MAKE SOMETHING YOURS.</span><span>THE WEB WORKSPACE</span></div><div className="suite-heading"><h2>Follow the idea.<br /><em>Choose the tool.</em></h2><p>A canvas for visual thinking. A document for words. A page for the next part of the story.</p></div><div className="suite-tabs" role="tablist" aria-label="Explore editors">{disciplines.map((item, index) => <button key={item.name} role="tab" aria-selected={active === index} aria-controls="suite-panel" id={`suite-tab-${index}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + disciplines.length) % disciplines.length; setActive(next); document.getElementById(`suite-tab-${next}`)?.focus() } }}><item.icon size={17} />{item.name}</button>)}</div><div className="suite-panel" id="suite-panel" role="tabpanel" aria-labelledby={`suite-tab-${active}`} key={active}><div><span className="suite-number">0{active + 1} / {current.name}</span><h3>{current.title}</h3><p>{current.description}</p><ul>{current.features.map(feature => <li key={feature}><Check size={13} />{feature}</li>)}</ul><a href="/app">Try {current.name.toLowerCase()} <ArrowUpRight size={18} /></a></div><div className="suite-visual"><img src={current.image} alt={`Actual Edon ${current.name.toLowerCase()} workspace`} loading="lazy" /></div></div></section>
    <section id="film" className="site-film" data-reveal><div className="section-caption"><span>LESS INTERFACE. MORE POSSIBILITY.</span><span>{video ? 'EDON IN MOTION' : 'A CLOSER LOOK'}</span></div><div className="product-frame"><div className="frame-title"><BrandMark size={15} /><p>edon / canvas</p><small>{video ? 'Product walkthrough' : 'Actual editor capture'}</small></div>{video ? <video controls playsInline preload="metadata" poster="/media/edon-canvas.png" src="/media/edon-demo.mp4" aria-label="Edon product walkthrough" /> : <img src="/media/edon-canvas.png" alt="Edon canvas with layers and editing controls" loading="lazy" />}</div><div className="film-caption"><h2>Space to make<br />something <em>yours.</em></h2><p>A canvas with room to think. Tools where you expect them. Your work takes the spotlight.{!video && <span className="film-note">The product film is coming. This is a still capture of the editor.</span>}</p></div></section>
    <section className="site-workflow" data-reveal><div className="section-caption"><span>FROM FIRST THOUGHT TO FINISHED WORK.</span></div><div className="workflow-steps"><article><span>01 / START</span><h3>A blank page.<br />Your direction.</h3><p>Choose a canvas, UI design, document, presentation, video or audio project. Each workspace keeps its own tools in reach.</p></article><article><span>02 / MAKE</span><h3>Small details.<br />Big difference.</h3><p>Arrange layers. Refine type. Adjust a color. Clear controls and a quiet interface keep the focus on what you are making.</p></article><article><span>03 / KEEP</span><h3>Pick up where<br />you left off.</h3><p>The web workspace saves locally in your browser. The desktop workspace saves locally on your computer. Export project files to move work between the two. Back up important work; cloud sync is not available.</p></article></div></section>
    <section id="desktop" className="site-desktop" data-reveal><div className="desktop-symbol" aria-hidden="true"><BrandMark size={100} /></div><div><span className="section-caption">EDON FOR WINDOWS</span><h2>A space on<br /><em>your desktop.</em></h2><p>The complete Edon workspace, on your desktop. All canvas, UI design, document, presentation, audio and video tools, plus native project files, backup copies and direct access to local storage. Download one EXE and work offline.</p><div className="desktop-actions">{mobile ? <a className="site-pill" href="/app">Open Edon in your browser <ArrowUpRight size={18} /></a> : release ? <a className="site-pill" href={release.url} download>Download for Windows <Download size={18} /></a> : <span className="download-pending">Windows release is being prepared</span>}<a href="/app">Or open in your browser <ArrowUpRight size={16} /></a></div><small>{release ? `Windows 10 / 11 · x64 · v${release.version} · ${(release.bytes / 1024 / 1024).toFixed(1)} MB · Portable EXE` : 'Windows 10 / 11 · x64 · Portable EXE'}</small><details><summary>About the Windows app</summary><p>All web-editor tools are bundled into the Windows app. Projects and media are saved on this computer; no internet connection is needed for local editing.</p><p>Browser and desktop libraries are separate. Export and import .edon project files to move artwork between them. Audio and video media stay in their local library. Cloud sync and Android downloads are not available. This release is unsigned.</p>{release && <p className="release-hash">SHA-256: {release.sha256}</p>}</details></div></section>
    <section className="site-manifesto" data-reveal><span className="section-caption">DESIGNED TO GET OUT OF YOUR WAY.</span><h2>Not louder.<br /><em>Just better.</em></h2><div><p>Precise spacing. Thoughtful feedback. Motion with a purpose. A creative environment that respects your attention.</p><p>Edon is growing through real use. Images, words and presentations take the lead. Video is taking shape. Audio stays focused.</p></div></section>
    <footer className="site-footer"><a className="site-pill" href="/app">Make room for your next idea <ArrowUpRight size={20} /></a><div><img src="/brand/edon-logo.svg" width="110" height="24" alt="edon" /><span>Independent by design.</span><a href="#desktop">Windows download ↗</a><a href="/app">Open workspace ↗</a></div></footer>
  </main>
}
