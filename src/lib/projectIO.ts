import type { Book } from '@/types/book'
import { useBookStore } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'

declare global {
  interface Window {
    electronAPI?: {
      fs: {
        saveProject: (path: string, data: string) => Promise<{ ok: boolean }>
        loadProject: (path: string) => Promise<string>
        showSaveDialog: (opts: object) => Promise<string | null>
        showOpenDialog: (opts: object) => Promise<string | null>
        writeFile: (path: string, buffer: unknown) => Promise<{ ok: boolean }>
      }
      shell: { openPath: (path: string) => Promise<void> }
      app: { getVersion: () => Promise<string> }
      pdf?: {
        export: (buffer: ArrayBuffer, savePath: string) => Promise<{ ok: boolean }>
        print: (html: string) => Promise<Buffer>
      }
    }
  }
}

const isElectron = () => !!window.electronAPI

export async function saveProject(book: Book): Promise<boolean> {
  try {
    const data = JSON.stringify(book, null, 2)
    if (isElectron()) {
      let path: string | undefined | null = book.filePath
      if (!path) {
        path = await window.electronAPI!.fs.showSaveDialog({
          title: '保存书籍',
          defaultPath: `${book.idea.title || 'untitled'}.bwk`,
          filters: [{ name: 'BookWrite 文件', extensions: ['bwk'] }],
        })
        if (!path) return false
      }
      await window.electronAPI!.fs.saveProject(path, data)
      useBookStore.getState().setBook({ ...book, filePath: path ?? undefined })
      useSettingsStore.getState().addRecentFile(path)
    } else {
      // Web fallback: download
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${book.idea.title || 'untitled'}.bwk`
      a.click()
      URL.revokeObjectURL(url)
    }
    useBookStore.getState().markSaved()
    return true
  } catch (e) {
    console.error('Save failed:', e)
    return false
  }
}

export async function openProject(): Promise<boolean> {
  try {
    let data: string
    if (isElectron()) {
      const path = await window.electronAPI!.fs.showOpenDialog({
        title: '打开书籍',
        filters: [{ name: 'BookWrite 文件', extensions: ['bwk', 'json'] }],
        properties: ['openFile'],
      })
      if (!path) return false
      data = await window.electronAPI!.fs.loadProject(path)
    } else {
      data = await new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.bwk,.json'
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) resolve('')
          else file.text().then(resolve)
        }
        input.click()
      })
      if (!data) return false
    }
    const book: Book = JSON.parse(data)
    useBookStore.getState().setBook({ ...book, knowledge: book.knowledge ?? { characters: [], worldNotes: [] } })
    return true
  } catch (e) {
    console.error('Open failed:', e)
    return false
  }
}
