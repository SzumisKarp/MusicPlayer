const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getMusicFiles: () => ipcRenderer.invoke('get-music-files'),
    addMusicFiles: () => ipcRenderer.invoke('add-music-files') // <-- NOWA FUNKCJA
});
