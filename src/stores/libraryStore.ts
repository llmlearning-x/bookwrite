import { create } from 'zustand'
import type { Book } from '@/types/book'
import type { SyncStatus } from '@/services/cloudSync'
import { fetchUserBooks, upsertBook, deleteBook, scheduleSyncBook } from '@/services/cloudSync'

interface LibraryStore {
  books: Book[]
  activeBookId: string | null
  syncStatus: SyncStatus
  loading: boolean

  loadBooks: (userId: string) => Promise<void>
  openBook: (id: string) => void
  closeBook: () => void
  saveBook: (book: Book, userId: string) => void
  createBook: (book: Book, userId: string) => Promise<void>
  removeBook: (id: string) => Promise<void>
  updateBookInList: (book: Book, userId: string) => void
  setSyncStatus: (s: SyncStatus) => void
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  books: [],
  activeBookId: null,
  syncStatus: 'idle',
  loading: false,

  loadBooks: async (userId) => {
    set({ loading: true })
    try {
      const books = await fetchUserBooks(userId)
      set({ books, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  openBook: (id) => set({ activeBookId: id }),
  closeBook: () => set({ activeBookId: null }),

  createBook: async (book, userId) => {
    await upsertBook(book, userId)
    set((s) => ({ books: [book, ...s.books], activeBookId: book.id }))
  },

  removeBook: async (id) => {
    await deleteBook(id)
    set((s) => ({ books: s.books.filter((b) => b.id !== id) }))
  },

  saveBook: (book, userId) => {
    get().updateBookInList(book, userId)
  },

  updateBookInList: (book, userId) => {
    set((s) => ({
      books: s.books.map((b) => (b.id === book.id ? book : b)),
    }))
    scheduleSyncBook(book, userId, (status) => set({ syncStatus: status }))
  },

  setSyncStatus: (syncStatus) => set({ syncStatus }),
}))
