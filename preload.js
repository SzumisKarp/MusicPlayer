const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getMusicFiles: () => ipcRenderer.invoke('get-music-files')
});
