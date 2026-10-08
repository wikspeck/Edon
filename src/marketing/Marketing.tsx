import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ArrowDown, MoveUpRight, Play, Pause } from 'lucide-react'
import { BrandMark } from '../ui/BrandMark'
import './marketing.css'

const disciplines = [
  ['01', 'Images', 'A sharper point of view.', 'Pixels and vectors on one canvas. Shape, fill, mask and refine without leaving your work.'],
  ['02', 'Documents', 'Give your thoughts a little room.', 'Real typography, considered layouts and pages that feel like yours.'],
  ['03', 'Presentations', 'Make every page count.', 'Compose a story across your canvas pages. Export your work when it is ready.'],
  ['04', 'Video', 'Find the shape of your story.', 'An early workspace for your footage. Import, preview and set your clip in and out points.'],
] as const

export function Marketing() {
  const root = useRef<HTMLElement>(null)
  const [playing, setPlaying] = useState(true)
  const [step, setStep] = useState(0)
  const captures = ['/media/edon-step-1.png', '/media/edon-step-2.png', '/media/edon-canvas.png']
  useEffect(() => {
    if (!playing || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setStep((current) => (current + 1) % 3), 2400)
    return () => clearInterval(timer)
  }, [playing])
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: .12 })
    root.current?.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])
  return <main className="edon-site" ref={root} onScroll={(event) => {
    const page = event.currentTarget
    page.style.setProperty('--reading', String(page.scrollTop / Math.max(1, page.scrollHeight - page.clientHeight)))
  }}>
    <nav className="site-nav" aria-label="Main navigation"><a className="site-brand" href="/" aria-label="Edon home"><BrandMark size={28} />edon<span>CREATIVE SYSTEM / 01</span></a><div><a href="#work">The suite</a><a href="#film">In motion</a><a className="site-launch" href="/app">Open Edon <ArrowUpRight size={16} /></a></div></nav>
    <section className="site-hero" onPointerMove={(event) => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const bounds = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty('--drift-x', `${(event.clientX - bounds.left - bounds.width / 2) * .02}px`)
      event.currentTarget.style.setProperty('--drift-y', `${(event.clientY - bounds.top - bounds.height / 2) * .02}px`)
    }} onPointerLeave={(event) => { event.currentTarget.style.setProperty('--drift-x', '0px'); event.currentTarget.style.setProperty('--drift-y', '0px') }}><div className="site-status"><i /> A little less friction. A lot more possibility.</div><h1>Ideas don't<br />stay in <em>one box.</em></h1><div className="hero-bottom"><p>One quiet space for the things you make.<br />Images. Words. Stories. And everything between.</p><a href="/app" className="site-pill">Find your flow <MoveUpRight size={20} /></a></div><a className="scroll-note" href="#work">SCROLL TO EXPLORE <ArrowDown size={14} /></a><div className={`kinetic-mark ${playing ? '' : 'is-paused'}`} aria-hidden="true"><div /><div /><div /><span>e.</span></div></section>
    <section id="film" className="site-film" data-reveal><div className="section-caption"><span>LESS INTERFACE. MORE POSSIBILITY.</span><button aria-pressed={!playing} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? 'Pause motion' : 'Resume motion'}</button></div><div className="product-frame"><div className="frame-title"><span /><span /><span /><p>edon / canvas</p><small>Actual editor capture</small></div><img src={captures[step]} alt="An Edon canvas with a geometric logo, its layers and editing controls" loading="lazy" /></div><div className="capture-controls"><span>{['01 / Shape', '02 / Negative space', '03 / Identity'][step]}</span><input aria-label="Logo creation step" type="range" min="0" max="2" step="1" value={step} onChange={(event) => { setPlaying(false); setStep(Number(event.target.value)) }} /><span>Recorded in Edon · drag to explore</span></div><div className="film-caption"><h2>Space to make<br />something <em>yours.</em></h2><p>A canvas with room to think. Tools where you expect them. Your work takes the spotlight.</p></div></section>
    <section id="work" className="site-work"><div className="section-caption" data-reveal><span>ONE SUITE. DIFFERENT WAYS TO THINK.</span><span>01 — 04</span></div>{disciplines.map(([number, name, title, description]) => <article className="discipline" key={name} data-reveal><span>{number} / {name}</span><h2>{title}</h2><p>{description}</p><a href="/app" aria-label={`Explore ${name}`}><ArrowUpRight size={26} /></a></article>)}</section>
    <section className="site-manifesto" data-reveal><span className="section-caption">DESIGNED TO GET OUT OF YOUR WAY.</span><h2>Not louder.<br /><em>Just better.</em></h2><div><p>Precise tools. Soft edges. Feedback you can feel. A creative environment that respects your attention.</p><p>Audio stays simple. Video is taking shape. The web workspace is available now; the desktop edition is in development.</p></div></section>
    <footer className="site-footer"><a className="site-pill" href="/app">Make room for your next idea <ArrowUpRight size={20} /></a><div><span><BrandMark size={20} /> edon</span><span>Independent by design.</span><a href="/app">Open workspace ↗</a></div></footer>
  </main>
}
