import type { EdonElement } from '../model/document'
import { maskId, maskPath } from './masks'
export function MaskDefinition({ element }: { element: EdonElement }) { return element.mask ? <svg className="image-outline-definitions" aria-hidden="true"><defs><clipPath id={maskId(element)} clipPathUnits="objectBoundingBox"><path d={maskPath(element)} clipRule="evenodd" /></clipPath></defs></svg> : null }
