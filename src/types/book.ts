export type BookGenre =
  | 'fiction' | 'non-fiction' | 'sci-fi' | 'fantasy' | 'mystery'
  | 'romance' | 'thriller' | 'biography' | 'self-help' | 'technical'
  | 'children' | 'poetry' | 'history' | 'business' | 'other'

export type BookStatus = 'idea' | 'outline' | 'writing' | 'editing' | 'complete'

export interface BookIdea {
  title: string
  synopsis: string
  genre: BookGenre
  targetAudience: string
  keyThemes: string[]
  toneStyle: string
  estimatedLength: number // pages
}

export interface ChapterSection {
  id: string
  title: string
  summary: string
  content: string
  wordCount: number
  status: 'pending' | 'writing' | 'draft' | 'revised'
}

export interface Chapter {
  id: string
  number: number
  title: string
  summary: string
  sections: ChapterSection[]
  content: string
  wordCount: number
  status: 'pending' | 'writing' | 'draft' | 'revised'
  coverImage?: string // base64 or file path
}

export interface BookVisuals {
  coverImage?: string
  coverPrompt?: string
  illustrations: Array<{
    id: string
    chapterId?: string
    prompt: string
    image: string
    caption: string
  }>
}

export interface BookMetadata {
  author: string
  publisher?: string
  year: number
  language: string
  isbn?: string
  dedication?: string
  acknowledgments?: string
  foreword?: string
}

export interface Book {
  id: string
  createdAt: string
  updatedAt: string
  status: BookStatus
  idea: BookIdea
  outline: Chapter[]
  metadata: BookMetadata
  visuals: BookVisuals
  filePath?: string
}
