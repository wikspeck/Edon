import type { EdonElement, VectorPoint } from '../model/document'

interface AlphaMap { width: number; height: number; alpha: Uint8ClampedArray }
const alphaMaps = new Map<string, AlphaMap>()

export function registerAlphaImage(source: string, image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight || alphaMaps.has(source)) return
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return
  try {
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data; const alpha = new Uint8ClampedArray(canvas.width * canvas.height)
    for (let sourceIndex = 3, targetIndex = 0; sourceIndex < pixels.length; sourceIndex += 4, targetIndex += 1) alpha[targetIndex] = pixels[sourceIndex]
    alphaMaps.set(source, { width: canvas.width, height: canvas.height, alpha })
  } catch { /* Cross-origin images fall back to their geometric bounds. */ }
}

export function alphaHitTest(element: EdonElement, point: VectorPoint): boolean {
  if ((element.type !== 'image' && element.type !== 'raster') || !element.imageUrl) return true
  const map = alphaMaps.get(element.imageUrl); if (!map) return true
  const centerX = element.x + element.width / 2; const centerY = element.y + element.height / 2; const radians = -element.rotation * Math.PI / 180
  const rotatedX = centerX + (point.x - centerX) * Math.cos(radians) - (point.y - centerY) * Math.sin(radians)
  const rotatedY = centerY + (point.x - centerX) * Math.sin(radians) + (point.y - centerY) * Math.cos(radians)
  const localX = (rotatedX - element.x) / element.scaleX; const localY = (rotatedY - element.y) / element.scaleY
  if (localX < 0 || localY < 0 || localX >= element.width || localY >= element.height) return false
  const crop = element.crop ?? { x: 0, y: 0, width: 1, height: 1 }
  const sourceX = Math.min(map.width - 1, Math.max(0, Math.floor((crop.x + localX / element.width * crop.width) * map.width)))
  const sourceY = Math.min(map.height - 1, Math.max(0, Math.floor((crop.y + localY / element.height * crop.height) * map.height)))
  return map.alpha[sourceY * map.width + sourceX] > 12
}
