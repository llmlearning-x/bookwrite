import { create } from 'zustand'

export type SkillStatus = 'pending' | 'running' | 'done' | 'error'

export interface SkillCall {
  id: string
  name: string
  label: string
  status: SkillStatus
  input?: Record<string, unknown>
  summary?: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoningContent?: string
  skillCalls?: SkillCall[]
  ts: number
}

interface AgentStore {
  messages: AgentMessage[]
  isThinking: boolean
  activeSkills: SkillCall[]
  abortController: AbortController | null

  addUserMessage: (content: string) => string
  addAssistantMessage: (content: string, skillCalls?: SkillCall[]) => string
  updateAssistantMessage: (id: string, content: string) => void
  updateAssistantReasoning: (id: string, reasoningContent: string) => void
  setThinking: (v: boolean) => void
  startSkill: (skill: SkillCall) => void
  finishSkill: (id: string, summary?: string) => void
  failSkill: (id: string) => void
  clearActiveSkills: () => void
  clear: () => void
  createAbortController: () => AbortController
  abort: () => void
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  messages: [],
  isThinking: false,
  activeSkills: [],
  abortController: null,

  addUserMessage: (content) => {
    const id = crypto.randomUUID()
    set((s) => ({
      messages: [...s.messages, { id, role: 'user', content, ts: Date.now() }],
    }))
    return id
  },

  addAssistantMessage: (content, skillCalls) => {
    const id = crypto.randomUUID()
    set((s) => ({
      messages: [...s.messages, { id, role: 'assistant', content, skillCalls, ts: Date.now() }],
    }))
    return id
  },

  updateAssistantMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content } : m
      ),
    })),

  updateAssistantReasoning: (id, reasoningContent) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, reasoningContent } : m
      ),
    })),

  setThinking: (isThinking) => set({ isThinking }),

  startSkill: (skill) =>
    set((s) => ({ activeSkills: [...s.activeSkills, skill] })),

  finishSkill: (id, summary) =>
    set((s) => ({
      activeSkills: s.activeSkills.map((sk) =>
        sk.id === id ? { ...sk, status: 'done', summary } : sk
      ),
    })),

  failSkill: (id) =>
    set((s) => ({
      activeSkills: s.activeSkills.map((sk) =>
        sk.id === id ? { ...sk, status: 'error' } : sk
      ),
    })),

  clearActiveSkills: () => set({ activeSkills: [] }),
  clear: () => set({ messages: [], activeSkills: [], isThinking: false, abortController: null }),

  createAbortController: () => {
    const ctrl = new AbortController()
    set({ abortController: ctrl })
    return ctrl
  },

  abort: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ abortController: null, isThinking: false })
    }
  },
}))
