const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('edonDesktop', {
  onMcpRequest: handler => { const listener=async (_event,id,request)=>{try {ipcRenderer.send('mcp:response',id,{result:await handler(request)});} catch(error) {ipcRenderer.send('mcp:response',id,{error:{message:error.message,code:error.code??'INVALID_REQUEST',details:error.details??{}}});}}; ipcRenderer.on('mcp:request',listener); ipcRenderer.send('mcp:ready'); return ()=>ipcRenderer.removeListener('mcp:request',listener); },
 openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (name, json) => ipcRenderer.invoke('project:save', name, json),
  showStorage: () => ipcRenderer.invoke('storage:show'),
});
