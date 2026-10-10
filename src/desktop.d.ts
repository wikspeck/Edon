interface Window {
  edonDesktop?: {
    openProject: () => Promise<{ json: string; name: string } | null>
    saveProject: (name: string, json: string) => Promise<string | null>
    showStorage: () => Promise<void>
  }
}
