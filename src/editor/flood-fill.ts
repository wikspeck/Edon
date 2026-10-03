/** Match the clicked RGBA colour, then visit four-connected pixels (or all matches). */
export function snapRasterAlpha(data: Uint8ClampedArray) {
  let maximum = 0
  for (let offset = 3; offset < data.length; offset += 4) maximum = Math.max(maximum, data[offset])
  for (let offset = 3; offset < data.length; offset += 4) data[offset] = data[offset] >= maximum / 2 ? maximum : 0
}

export function floodRegion(data: Uint8ClampedArray, width: number, height: number, x: number, y: number, tolerance: number, contiguous: boolean): Uint8Array {
  const count = width * height
  const region = new Uint8Array(count)
  if (x < 0 || y < 0 || x >= width || y >= height) return region
  const seed = Math.floor(y) * width + Math.floor(x)
  const offset = seed * 4
  const matches = (index: number) => {
    const next = index * 4
    // Ignore RGB in transparent pixels; invisible colour is not a boundary.
    if (data[offset + 3] === 0 && data[next + 3] === 0) return true
    for (let channel = 0; channel < 4; channel++) if (Math.abs(data[offset + channel] - data[next + channel]) > tolerance) return false
    return true
  }
  if (!contiguous) { for (let index = 0; index < count; index++) if (matches(index)) region[index] = 1; return region }
  const queue = new Int32Array(count)
  let head = 0; let tail = 1
  queue[0] = seed; region[seed] = 1
  const visit = (index: number) => { if (!region[index] && matches(index)) { region[index] = 1; queue[tail++] = index } }
  while (head < tail) {
    const index = queue[head++]; const column = index % width
    if (column > 0) visit(index - 1)
    if (column < width - 1) visit(index + 1)
    if (index >= width) visit(index - width)
    if (index + width < count) visit(index + width)
  }
  return region
}
