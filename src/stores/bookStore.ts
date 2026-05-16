import { create } from 'zustand'
import type { Book, Chapter, ChapterSection } from '@/types/book'

function newBook(): Book {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'idea',
    idea: {
      title: '',
      synopsis: '',
      genre: 'fiction',
      targetAudience: '',
      keyThemes: [],
      toneStyle: '',
      estimatedLength: 200,
    },
    outline: [],
    metadata: {
      author: '',
      year: new Date().getFullYear(),
      language: 'zh',
    },
    visuals: { illustrations: [] },
  }
}

interface BookStore {
  book: Book
  activeChapterId: string | null
  activeSectionId: string | null
  isDirty: boolean

  setBook: (book: Book) => void
  newBook: () => void
  updateIdea: (partial: Partial<Book['idea']>) => void
  updateMetadata: (partial: Partial<Book['metadata']>) => void
  setOutline: (chapters: Chapter[]) => void
  updateChapter: (chapterId: string, partial: Partial<Chapter>) => void
  updateSection: (chapterId: string, sectionId: string, partial: Partial<ChapterSection>) => void
  updateVisuals: (partial: Partial<Book['visuals']>) => void
  setActiveChapter: (id: string | null) => void
  setActiveSection: (id: string | null) => void
  markSaved: () => void
}

export const useBookStore = create<BookStore>((set, get) => ({
  book: newBook(),
  activeChapterId: null,
  activeSectionId: null,
  isDirty: false,

  setBook: (book) => set({ book, isDirty: false }),
  newBook: () => set({ book: newBook(), activeChapterId: null, activeSectionId: null, isDirty: false }),

  updateIdea: (partial) => set((s) => ({
    book: { ...s.book, idea: { ...s.book.idea, ...partial }, updatedAt: new Date().toISOString() },
    isDirty: true,
  })),

  updateMetadata: (partial) => set((s) => ({
    book: { ...s.book, metadata: { ...s.book.metadata, ...partial }, updatedAt: new Date().toISOString() },
    isDirty: true,
  })),

  setOutline: (chapters) => set((s) => ({
    book: { ...s.book, outline: chapters, status: 'outline', updatedAt: new Date().toISOString() },
    isDirty: true,
  })),

  updateChapter: (chapterId, partial) => set((s) => ({
    book: {
      ...s.book,
      outline: s.book.outline.map((c) =>
        c.id === chapterId ? { ...c, ...partial } : c
      ),
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  updateSection: (chapterId, sectionId, partial) => set((s) => ({
    book: {
      ...s.book,
      outline: s.book.outline.map((c) =>
        c.id === chapterId
          ? {
              ...c,
              sections: c.sections.map((sec) =>
                sec.id === sectionId ? { ...sec, ...partial } : sec
              ),
            }
          : c
      ),
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  updateVisuals: (partial) => set((s) => ({
    book: {
      ...s.book,
      visuals: { ...s.book.visuals, ...partial },
      updatedAt: new Date().toISOString(),
    },
    isDirty: true,
  })),

  setActiveChapter: (id) => set({ activeChapterId: id }),
  setActiveSection: (id) => set({ activeSectionId: id }),
  markSaved: () => set({ isDirty: false }),
}))

export const useActiveChapter = () => {
  const { book, activeChapterId } = useBookStore()
  return book.outline.find((c) => c.id === activeChapterId) ?? null
}
