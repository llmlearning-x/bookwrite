import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null

  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  init: async () => {
    const { data } = await supabase.auth.getSession()
    set({ session: data.session, user: data.session?.user ?? null, loading: false })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message, loading: false })
    else set({ loading: false })
  },

  signUp: async (email, password) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) set({ error: error.message, loading: false })
    else set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },

  clearError: () => set({ error: null }),
}))
