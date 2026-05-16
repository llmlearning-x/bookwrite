import { supabase } from './supabase'
import type { Book } from '@/types/book'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

function bookToRow(book: Book, userId: string) {
  const wordCount = book.outline.reduce((s, c) => s + (c.wordCount ?? 0), 0)
  return {
    id: book.id,
    user_id: userId,
    title: book.idea.title || '',
    genre: book.idea.genre || '',
    cover_image: book.visuals.coverImage ?? null,
    word_count: wordCount,
    chapter_count: book.outline.length,
    data: book,
    updated_at: new Date().toISOString(),
  }
}

export async function fetchUserBooks(userId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('user_books')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((row) => row.data as Book)
}

export async function upsertBook(book: Book, userId: string): Promise<void> {
  const row = bookToRow(book, userId)
  const { error } = await supabase.from('user_books').upsert(row, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteBook(bookId: string): Promise<void> {
  const { error } = await supabase.from('user_books').delete().eq('id', bookId)
  if (error) throw error
}

let _debounceTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleSyncBook(book: Book, userId: string, onStatus: (s: SyncStatus) => void) {
  if (_debounceTimer) clearTimeout(_debounceTimer)
  onStatus('idle')
  _debounceTimer = setTimeout(async () => {
    onStatus('syncing')
    try {
      await upsertBook(book, userId)
      onStatus('synced')
    } catch {
      onStatus('error')
    }
  }, 2500)
}
