import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIConfig } from '@/types/ai'
import type { Locale } from '@/i18n'

interface SettingsStore {
  aiConfig: AIConfig
  locale: Locale
  theme: 'dark' | 'light'
  editorFont: 'sans' | 'serif' | 'mono'
  editorFontSize: number
  autoSave: boolean
  recentFiles: string[]

  updateAIConfig: (partial: Partial<AIConfig>) => void
  setLocale: (l: Locale) => void
  setTheme: (t: 'dark' | 'light') => void
  setEditorFont: (f: 'sans' | 'serif' | 'mono') => void
  setEditorFontSize: (s: number) => void
  addRecentFile: (path: string) => void
}

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'custom',
  model: 'moonshot-v1-8k',
  apiKey: import.meta.env.VITE_DEFAULT_AI_KEY ?? '',
  baseUrl: 'https://api.moonshot.cn/v1',
  temperature: 0.7,
  maxTokens: 8096,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      aiConfig: { ...DEFAULT_AI_CONFIG },
      locale: 'zh',
      theme: 'dark',
      editorFont: 'serif',
      editorFontSize: 16,
      autoSave: true,
      recentFiles: [],

      updateAIConfig: (partial) =>
        set((s) => ({ aiConfig: { ...s.aiConfig, ...partial } })),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setEditorFont: (editorFont) => set({ editorFont }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
      addRecentFile: (path) =>
        set((s) => ({
          recentFiles: [path, ...s.recentFiles.filter((f) => f !== path)].slice(0, 10),
        })),
    }),
    {
      name: 'bookwrite-settings',
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsStore>
        return {
          ...currentState,
          ...persisted,
          aiConfig: {
            ...DEFAULT_AI_CONFIG,
            ...currentState.aiConfig,
            ...(persisted.aiConfig || {}),
          },
        } as SettingsStore
      },
    }
  )
)
