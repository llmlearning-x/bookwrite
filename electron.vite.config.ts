import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/main.ts'),
      },
    },
    resolve: {
      alias: { '@': resolve('src') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/preload.ts'),
      },
    },
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: resolve('index.html'),
      },
    },
    resolve: {
      alias: { '@': resolve('src') },
    },
    plugins: [react()],
  },
})
