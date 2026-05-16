import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL  as string
const key  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})

export type DbBook = {
  id: string
  user_id: string
  title: string
  genre: string
  cover_image: string | null
  word_count: number
  chapter_count: number
  data: unknown
  created_at: string
  updated_at: string
}
