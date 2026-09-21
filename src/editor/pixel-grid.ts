import type { VectorPoint } from '../model/document'

export const PIXEL_MODE_CELL_SIZE = 2

export interface PixelGrid {
  cellSize: number
  columns: number
  rows: number
}

export interface PixelCell { column: number; row: number }

export function createPixelGrid(width: number, height: number, cellSize = PIXEL_MODE_CELL_SIZE): PixelGrid {
  const size = Math.max(1, Math.round(cellSize))
  return { cellSize: size, columns: Math.ceil(width / size), rows: Math.ceil(height / size) }
}

export function pointToPixelCell(point: VectorPoint, grid: PixelGrid): PixelCell {
  return {
    column: clamp(Math.floor(point.x / grid.cellSize), 0, grid.columns - 1),
    row: clamp(Math.floor(point.y / grid.cellSize), 0, grid.rows - 1),
  }
}

export function cellIndex(cell: PixelCell, grid: PixelGrid): number {
  return cell.row * grid.columns + cell.column
}

export function tracePixelCells(points: VectorPoint[], grid: PixelGrid): PixelCell[] {
  if (!points.length) return []
  const result: PixelCell[] = []
  const visited = new Set<number>()
  const add = (cell: PixelCell) => {
    const index = cellIndex(cell, grid)
    if (!visited.has(index)) { visited.add(index); result.push(cell) }
  }
  add(pointToPixelCell(points[0], grid))
  for (let index = 1; index < points.length; index += 1) {
    const start = pointToPixelCell(points[index - 1], grid)
    const end = pointToPixelCell(points[index], grid)
    let x = start.column; let y = start.row
    const dx = Math.abs(end.column - x); const sx = x < end.column ? 1 : -1
    const dy = -Math.abs(end.row - y); const sy = y < end.row ? 1 : -1
    let error = dx + dy
    while (true) {
      add({ column: x, row: y })
      if (x === end.column && y === end.row) break
      const doubled = error * 2
      if (doubled >= dy) { error += dy; x += sx }
      if (doubled <= dx) { error += dx; y += sy }
    }
  }
  return result
}

export function paintPixelCells(context: CanvasRenderingContext2D, points: VectorPoint[], width: number, height: number, brushSize: number) {
  const grid = createPixelGrid(width, height)
  const radius = Math.max(0, Math.ceil(brushSize / grid.cellSize / 2) - 1)
  const painted = new Set<number>()
  for (const center of tracePixelCells(points, grid)) {
    for (let row = center.row - radius; row <= center.row + radius; row += 1) {
      for (let column = center.column - radius; column <= center.column + radius; column += 1) {
        if (column < 0 || row < 0 || column >= grid.columns || row >= grid.rows) continue
        if (radius && (column - center.column) ** 2 + (row - center.row) ** 2 > radius ** 2) continue
        const index = row * grid.columns + column
        if (painted.has(index)) continue
        painted.add(index)
        context.fillRect(column * grid.cellSize, row * grid.cellSize, grid.cellSize, grid.cellSize)
      }
    }
  }
}

export function alignedPixelBounds(left: number, top: number, right: number, bottom: number, cellSize = PIXEL_MODE_CELL_SIZE) {
  return {
    left: Math.floor(left / cellSize) * cellSize,
    top: Math.floor(top / cellSize) * cellSize,
    right: Math.ceil((right + 1) / cellSize) * cellSize - 1,
    bottom: Math.ceil((bottom + 1) / cellSize) * cellSize - 1,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
