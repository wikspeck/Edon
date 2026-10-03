export const FONT_FAMILIES = [
  { label: 'System', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
] as const

export function validFontFamily(value: string) {
  return value.length < 150 && /^[a-zA-Z0-9 ,"'-]+$/.test(value) ? value : null
}
