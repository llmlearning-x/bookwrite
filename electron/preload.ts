import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  fs: {
    saveProject: (path: string, data: string) =>
      ipcRenderer.invoke('fs:save-project', path, data),
    loadProject: (path: string) =>
      ipcRenderer.invoke('fs:load-project', path),
    showSaveDialog: (opts: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke('fs:show-save-dialog', opts),
    showOpenDialog: (opts: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke('fs:show-open-dialog', opts),
    writeFile: (path: string, buffer: Buffer) =>
      ipcRenderer.invoke('fs:write-file', path, buffer),
  },
  shell: {
    openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
  },
  pdf: {
    export: (buffer: ArrayBuffer, savePath: string) =>
      ipcRenderer.invoke('pdf:export', buffer, savePath),
    print: (html: string) =>
      ipcRenderer.invoke('pdf:print', html),
  },
})
