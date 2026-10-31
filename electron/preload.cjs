const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getLocalIPs: () => ipcRenderer.invoke('get-local-ips'),
  getDesktopSources: (options) => ipcRenderer.invoke('get-desktop-sources', options),
  broadcastStreamStatus: (status) => ipcRenderer.send('stream-status', status),
  onReceiverConnected: (callback) => {
    const handler = (event, clientInfo) => callback(clientInfo);
    ipcRenderer.on('receiver-connected', handler);
    return () => ipcRenderer.removeListener('receiver-connected', handler);
  },
  onReceiverDisconnected: (callback) => {
    const handler = (event, clientInfo) => callback(clientInfo);
    ipcRenderer.on('receiver-disconnected', handler);
    return () => ipcRenderer.removeListener('receiver-disconnected', handler);
  },
});
