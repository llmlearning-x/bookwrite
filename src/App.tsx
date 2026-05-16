import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useLibraryStore } from '@/stores/libraryStore'
import { useBookStore } from '@/stores/bookStore'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { BookLibrary } from '@/components/library/BookLibrary'
import { StudioShell } from '@/components/studio/StudioShell'

export function App() {
  const { user, loading, init } = useAuthStore()
  const { activeBookId } = useLibraryStore()
  const { book } = useBookStore()

  useEffect(() => { init() }, [])

  if (loading) return <Splash />

  if (!user) return <LoginScreen />

  // Show studio if a book is actively open
  if (activeBookId && book.id === activeBookId) return <StudioShell />

  return <BookLibrary />
}

function Splash() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f7f6f3',
    }}>
      <div style={{
        width: 6, height: 6, background: '#37352f',
        animation: 'blink 0.8s infinite',
      }} />
    </div>
  )
}
