import { createElement, type EdonElement, type EdonPage } from '../model/document'

export function imageElementFromFile(file: File, page: Pick<EdonPage, 'width' | 'height'>, point?: { x: number; y: number }): Promise<EdonElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('error', () => reject(reader.error))
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return reject(new Error('Unsupported image data'))
      const imageData = reader.result
      const image = new window.Image()
      image.addEventListener('error', () => reject(new Error('The image could not be decoded')))
      image.addEventListener('load', () => {
        const maxWidth = Math.min(720, page.width * .65)
        const maxHeight = Math.min(720, page.height * .65)
        const ratio = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
        const width = Math.max(1, image.naturalWidth * ratio)
        const height = Math.max(1, image.naturalHeight * ratio)
        const element = createElement('image', point?.x ?? page.width / 2 - width / 2, point?.y ?? page.height / 2 - height / 2, width, height)
        element.name = file.name.replace(/\.[^.]+$/, '') || 'Image'
        element.imageUrl = imageData
        resolve(element)
      })
      image.src = imageData
    })
    reader.readAsDataURL(file)
  })
}
