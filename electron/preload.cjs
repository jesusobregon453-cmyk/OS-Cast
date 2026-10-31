const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  getLocalIPs: () => ipcRenderer.invoke('get-local-ips'),
  getDesktopSources: (options) => ipcRenderer.invoke('get-desktop-sources', options),
  checkScreenPermission: () => ipcRenderer.invoke('check-screen-permission'),
  openScreenSettings: () => ipcRenderer.invoke('open-screen-settings'),
  broadcastStreamStatus: (status) => ipcRenderer.send('stream-status', status),
  sendFrame: (buffer) => ipcRenderer.send('send-frame', buffer),
  sendSignal: (signal) => ipcRenderer.send('send-webrtc-signal', signal),
  onSignalFromTV: (callback) => {
    const handler = (event, signal) => callback(signal);
    ipcRenderer.on('webrtc-from-tv', handler);
    return () => ipcRenderer.removeListener('webrtc-from-tv', handler);
  },
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
  onReceiverPong: (callback) => {
    const handler = (event, msg) => callback(msg);
    ipcRenderer.on('receiver-pong', handler);
    return () => ipcRenderer.removeListener('receiver-pong', handler);
  },
  relaunchApp: () => ipcRenderer.send('relaunch-app'),
});
