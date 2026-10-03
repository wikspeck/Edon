import type { EdonElement } from '../model/document'
import { outlineFilterId } from './rendering'

export function ImageOutline({ element }: { element: EdonElement }) {
  return <svg className="effect-definitions" aria-hidden="true"><defs>{element.effects.filter((effect) => effect.type === 'outline' && effect.enabled).map((effect) => effect.type === 'outline' && <filter key={effect.id} id={outlineFilterId(element.id, effect.id)} x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius={effect.width} result="expanded" />
    <feComposite in="expanded" in2="SourceAlpha" operator="out" result="ring" />
    <feFlood floodColor={effect.color} floodOpacity={effect.opacity} result="colour" />
    <feComposite in="colour" in2="ring" operator="in" result="outline" />
    <feMerge><feMergeNode in="outline" /><feMergeNode in="SourceGraphic" /></feMerge>
  </filter>)}</defs></svg>
}
