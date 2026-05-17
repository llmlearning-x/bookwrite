import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export interface AgentSession {
  id: string
  title: string
  createdAt: number
  messages: AgentMessage[]
}

export interface CheckpointState {
  resume: () => void
  autoResend?: string  // if set, auto-send this message after the current turn finishes
}

interface AgentStore {
  messages: AgentMessage[]
  sessions: AgentSession[]
  currentSessionId: string
  isThinking: boolean
  activeSkills: SkillCall[]
  abortController: AbortController | null
  checkpoint: CheckpointState | null

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
  newSession: () => void
  switchSession: (id: string) => void
  createAbortController: () => AbortController
  abort: () => void
  setCheckpoint: (cp: CheckpointState | null) => void
}

function makeSessionId() { return crypto.randomUUID() }

export const useAgentStore = create<AgentStore>()(persist((set, get) => ({
  messages: [],
  sessions: [],
  currentSessionId: makeSessionId(),
  isThinking: false,
  activeSkills: [],
  abortController: null,
  checkpoint: null,

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

  clear: () => {
    const newId = makeSessionId()
    set({ messages: [], sessions: [], currentSessionId: newId, activeSkills: [], isThinking: false, abortController: null })
  },

  newSession: () => {
    const { messages, sessions, currentSessionId } = get()
    const saved = sessions.filter(s => s.id !== currentSessionId)
    const current: AgentSession | undefined = sessions.find(s => s.id === currentSessionId)

    // Archive current session if it has messages
    let newSessions = saved
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user')
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 28) + (firstUserMsg.content.length > 28 ? '…' : '')
        : current?.title ?? '对话'
      newSessions = [
        { id: currentSessionId, title, createdAt: current?.createdAt ?? Date.now(), messages },
        ...saved,
      ].slice(0, 30) // keep max 30 sessions
    }

    set({
      messages: [],
      sessions: newSessions,
      currentSessionId: makeSessionId(),
      activeSkills: [],
      isThinking: false,
      abortController: null,
      checkpoint: null,
    })
  },

  switchSession: (id) => {
    const { messages, sessions, currentSessionId } = get()

    // Archive current session
    let updatedSessions = sessions.filter(s => s.id !== currentSessionId)
    if (messages.length > 0) {
      const firstUserMsg = messages.find(m => m.role === 'user')
      const existing = sessions.find(s => s.id === currentSessionId)
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 28) + (firstUserMsg.content.length > 28 ? '…' : '')
        : existing?.title ?? '对话'
      updatedSessions = [
        { id: currentSessionId, title, createdAt: existing?.createdAt ?? Date.now(), messages },
        ...updatedSessions,
      ]
    }

    const target = updatedSessions.find(s => s.id === id)
    if (!target) return

    set({
      messages: target.messages,
      sessions: updatedSessions,
      currentSessionId: id,
      activeSkills: [],
      isThinking: false,
      abortController: null,
      checkpoint: null,
    })
  },

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

  setCheckpoint: (cp) => set({ checkpoint: cp }),
}), {
  name: 'bookbuddy-agent',
  partialize: (state) => ({
    messages: state.messages,
    sessions: state.sessions,
    currentSessionId: state.currentSessionId,
  }),
  onRehydrateStorage: () => (state) => {
    if (state) {
      // Reset runtime-only fields after hydration
      state.isThinking = false
      state.activeSkills = []
      state.abortController = null
      state.checkpoint = null
    }
  },
}))
