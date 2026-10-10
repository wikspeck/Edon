import type { EdonElement } from '../model/document'
import { serializeOutlineFilters } from './rendering'
export function ImageOutline({ element }: { element: EdonElement }) { return <svg className="effect-definitions" aria-hidden="true"><defs dangerouslySetInnerHTML={{__html:serializeOutlineFilters(element)}} /></svg> }
