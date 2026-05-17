import { useEffect, useState } from 'react'
import { Plus, Search, LogOut, Cloud, CloudOff, Loader2, Trash2, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLibraryStore } from '@/stores/libraryStore'
import { useBookStore } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { getT } from '@/i18n'
import { PixelBook, BookBuddyLogo } from '@/components/studio/PixelArt'
import type { Book } from '@/types/book'

const APP_VERSION = '0.1.0'

function newEmptyBook(): Book {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'idea',
    idea: { title: '', synopsis: '', genre: 'fiction', targetAudience: '', keyThemes: [], toneStyle: '', estimatedLength: 200 },
    outline: [],
    metadata: { author: '', year: new Date().getFullYear(), language: 'zh' },
    visuals: { illustrations: [] },
    knowledge: { characters: [], worldNotes: [] },
  }
}

export function BookLibrary() {
  const [query, setQuery] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { user, signOut } = useAuthStore()
  const { books, activeBookId, loading, syncStatus, loadBooks, openBook, createBook, removeBook } = useLibraryStore()
  const { setBook } = useBookStore()
  const { locale } = useSettingsStore()
  const t = getT(locale)

  useEffect(() => {
    if (user) loadBooks(user.id)
  }, [user])

  const filtered = books.filter(b =>
    !query || b.idea.title.toLowerCase().includes(query.toLowerCase())
  )

  const handleNew = async () => {
    if (!user) return
    const book = newEmptyBook()
    setBook(book)
    await createBook(book, user.id)
  }

  const handleOpen = (book: Book) => {
    setBook({ ...book, knowledge: book.knowledge ?? { characters: [], worldNotes: [] } })
    openBook(book.id)
  }

  const handleDelete = async (id: string) => {
    await removeBook(id)
    setConfirmDeleteId(null)
  }

  const initials = user?.email ? user.email[0].toUpperCase() : '?'

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#f7f6f3', overflow: 'hidden' }}>
      {/* macOS traffic-light region */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 44, WebkitAppRegion: 'drag', zIndex: 50 } as React.CSSProperties} />

      {/* Left sidebar */}
      <div style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(55,53,47,0.08)',
        paddingTop: 44, background: '#f7f6f3',
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookBuddyLogo size={22} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#37352f', letterSpacing: '-0.01em' }}>
            BookBuddy
          </span>
          <span style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '1px 4px', border: '1px solid rgba(55,53,47,0.22)', color: '#b5b4b0',
          }}>
            BETA
          </span>
        </div>

        <div style={{ height: 1, background: 'rgba(55,53,47,0.06)', margin: '0 0 8px' }} />

        {/* Nav */}
        <NavItem label={t.libraryAll} active />

        <div style={{ flex: 1 }} />

        {/* Sync status */}
        <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          {syncStatus === 'syncing' && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', color: '#9b9a97' }} />}
          {syncStatus === 'synced'  && <Cloud size={11} style={{ color: '#9b9a97' }} />}
          {syncStatus === 'error'   && <CloudOff size={11} style={{ color: '#c03030' }} />}
          {syncStatus === 'idle'    && <Cloud size={11} style={{ color: '#c7c6c2' }} />}
          <span style={{ fontSize: 11, color: syncStatus === 'error' ? '#c03030' : '#b5b4b0' }}>
            {syncStatus === 'syncing' ? t.syncSyncing
             : syncStatus === 'synced' ? t.syncSynced
             : syncStatus === 'error' ? t.syncError
             : t.syncIdle}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#c7c6c2' }}>v{APP_VERSION}</span>
        </div>

        {/* User */}
        <div style={{ padding: '10px 18px 18px', borderTop: '1px solid rgba(55,53,47,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 2, background: '#37352f',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: '#37352f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
          <button onClick={signOut} title={t.logout} style={{ color: '#b5b4b0', cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#37352f')}
            onMouseLeave={e => (e.currentTarget.style.color = '#b5b4b0')}>
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          height: 100, flexShrink: 0,
          display: 'flex', alignItems: 'flex-end', gap: 12,
          padding: '0 32px 10px',
          borderBottom: '1px solid rgba(55,53,47,0.07)',
          background: '#ffffff',
        }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#37352f', margin: 0, flex: 1 }}>
            {t.libraryTitle}
          </h1>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', background: '#f7f6f3',
            border: '1px solid rgba(55,53,47,0.1)', width: 200,
          }}>
            <Search size={12} style={{ color: '#b5b4b0', flexShrink: 0 }} />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder={t.searchBooks}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12.5, color: '#37352f', width: '100%' }}
            />
          </div>
          <button onClick={handleNew} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12 }}>
            <Plus size={13} />
            {t.newBook}
          </button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', background: '#ffffff' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#c7c6c2' }} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onNew={handleNew} t={t} hasQuery={!!query} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
              {filtered.map(book => (
                <BookCard
                  key={book.id}
                  book={book}
                  onOpen={() => handleOpen(book)}
                  onDelete={() => setConfirmDeleteId(book.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDeleteId && (
        <DeleteConfirm
          t={t}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}

function NavItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{
      padding: '6px 18px', fontSize: 12.5, fontWeight: active ? 500 : 400,
      color: active ? '#37352f' : '#9b9a97',
      background: active ? '#e9e8e4' : 'transparent',
      borderRight: `2px solid ${active ? '#37352f' : 'transparent'}`,
      cursor: 'pointer',
    }}>
      {label}
    </div>
  )
}

function BookCard({ book, onOpen, onDelete }: { book: Book; onOpen: () => void; onDelete: () => void }) {
  const [hover, setHover] = useState(false)
  const wordCount = book.outline.reduce((s, c) => s + (c.wordCount ?? 0), 0)
  const date = new Date(book.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      {/* Cover */}
      <div onClick={onOpen} style={{
        height: 210, background: '#f7f6f3',
        border: `1px solid ${hover ? 'rgba(55,53,47,0.2)' : 'rgba(55,53,47,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
      }}>
        {book.visuals.coverImage ? (
          <img src={book.visuals.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <PixelBook size={56} />
            <span style={{ fontSize: 10, color: '#c7c6c2', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {book.idea.genre}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        {hover && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <button onClick={onOpen} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', background: '#37352f', color: '#fff',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
              <BookOpen size={12} />
              打开
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '8px 2px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#37352f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.35 }}>
          {book.idea.title || '未命名'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 11, color: '#b5b4b0' }}>
            {wordCount > 0 ? `${wordCount.toLocaleString()} 字` : '—'}
          </span>
          <span style={{ fontSize: 11, color: '#c7c6c2' }}>{date}</span>
        </div>
      </div>

      {/* Delete btn */}
      {hover && (
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{
          position: 'absolute', top: 6, right: 6,
          width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(55,53,47,0.15)',
          color: '#9b9a97', cursor: 'pointer',
        }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c03030')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9b9a97')}>
          <Trash2 size={11} />
        </button>
      )}
    </div>
  )
}

function EmptyState({ onNew, t, hasQuery }: { onNew: () => void; t: ReturnType<typeof getT>; hasQuery: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80, gap: 16 }}>
      <PixelBook size={72} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#37352f', marginBottom: 6 }}>
          {hasQuery ? t.noBooksSearch : t.noBooksYet}
        </div>
        <div style={{ fontSize: 13, color: '#9b9a97' }}>
          {hasQuery ? t.noBooksSearchHint : t.noBooksHint}
        </div>
      </div>
      {!hasQuery && (
        <button onClick={onNew} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Plus size={13} />
          {t.newBook}
        </button>
      )}
    </div>
  )
}

function DeleteConfirm({ t, onConfirm, onCancel }: { t: ReturnType<typeof getT>; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 320, background: '#ffffff', border: '1px solid rgba(55,53,47,0.12)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)', padding: '24px',
        zIndex: 70,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#191919', marginBottom: 8 }}>{t.deleteConfirmTitle}</div>
        <div style={{ fontSize: 13, color: '#9b9a97', marginBottom: 20, lineHeight: 1.6 }}>{t.deleteConfirmBody}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary">{t.cancel}</button>
          <button onClick={onConfirm} style={{
            padding: '6px 14px', background: '#c03030', color: '#fff',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>{t.deleteConfirmOk}</button>
        </div>
      </div>
    </>
  )
}
