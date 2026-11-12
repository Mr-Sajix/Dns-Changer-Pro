const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Windows Control
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),

  // Get Network Adapters
  getNetworkAdapters: () => ipcRenderer.invoke('network:get-adapters'),
});
