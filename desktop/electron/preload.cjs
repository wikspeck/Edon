const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('edonDesktop', {
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (name, json) => ipcRenderer.invoke('project:save', name, json),
  showStorage: () => ipcRenderer.invoke('storage:show'),
});
