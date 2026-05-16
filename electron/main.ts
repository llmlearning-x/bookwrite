import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// File system IPC handlers
ipcMain.handle('fs:save-project', async (_, path: string, data: string) => {
  const dir = join(path, '..')
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  await writeFile(path, data, 'utf-8')
  return { ok: true }
})

ipcMain.handle('fs:load-project', async (_, path: string) => {
  const data = await readFile(path, 'utf-8')
  return data
})

ipcMain.handle('fs:show-save-dialog', async (_, opts: Electron.SaveDialogOptions) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, opts)
  return result.canceled ? null : result.filePath
})

ipcMain.handle('fs:show-open-dialog', async (_, opts: Electron.OpenDialogOptions) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, opts)
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('fs:write-file', async (_, path: string, buffer: Buffer) => {
  await writeFile(path, buffer)
  return { ok: true }
})

ipcMain.handle('shell:open-path', async (_, path: string) => {
  await shell.openPath(path)
})

ipcMain.handle('app:get-version', () => app.getVersion())
