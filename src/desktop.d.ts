interface Window {
  edonDesktop?: {
    onMcpRequest: (handler: (request: {name: string; arguments?: Record<string, unknown>}) => unknown) => () => void
    openProject: () => Promise<{ json: string; name: string } | null>
    saveProject: (name: string, json: string) => Promise<string | null>
    showStorage: () => Promise<void>
  }
}
