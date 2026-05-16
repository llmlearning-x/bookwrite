import { useBookStore, useActiveChapter } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { PixelChapter } from './PixelArt'
import { getT } from '@/i18n'

const STATUS_DOT: Record<string, string> = {
  pending: 'rgba(55,53,47,0.18)',
  writing: '#37352f',
  draft:   'rgba(55,53,47,0.5)',
  revised: 'rgba(55,53,47,0.3)',
}

export function ChapterSidebar() {
  const { book, setActiveChapter } = useBookStore()
  const active = useActiveChapter()
  const { locale } = useSettingsStore()
  const t = getT(locale)
  const totalWords = book.outline.reduce((s, c) => s + (c.wordCount ?? 0), 0)
  const written    = book.outline.filter(c => c.content).length
  const pct        = book.outline.length ? (written / book.outline.length) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingTop: 44 }}>

      {/* Book info */}
      <div style={{ padding: '14px 16px 14px', borderBottom: '1px solid rgba(55,53,47,0.07)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4, color: book.idea.title ? '#37352f' : '#c7c6c2', fontStyle: book.idea.title ? 'normal' : 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {book.idea.title || t.untitledBook}
        </div>
        {book.idea.genre && (
          <div style={{ fontSize: 11, color: '#9b9a97', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {book.idea.genre}{book.metadata.author ? `  /  ${book.metadata.author}` : ''}
          </div>
        )}
        {book.outline.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#b5b4b0', marginBottom: 6 }}>
              <span>{t.chapterCount(written, book.outline.length)}</span>
              <span>{totalWords > 0 ? t.wordCount(totalWords) : t.wordCountDash}</span>
            </div>
            <div style={{ height: 2, background: 'rgba(55,53,47,0.07)' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#37352f', transition: 'width 0.5s ease' }} />
            </div>
          </>
        )}
      </div>

      {/* Overview link */}
      <SidebarRow
        label={t.overview}
        icon={<PixelChapter size={13} filled={!active} />}
        active={!active}
        onClick={() => setActiveChapter(null)}
      />
      <div style={{ height: 1, background: 'rgba(55,53,47,0.06)', margin: '2px 0' }} />

      {/* Chapter list */}
      {book.outline.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <PixelChapter size={28} />
          </div>
          <div style={{ fontSize: 12, color: '#c7c6c2', lineHeight: 1.8 }}>
            {t.noChaptersYet}<br />
            <span style={{ color: '#9b9a97' }}>{t.askAIOutline}</span>
          </div>
        </div>
      ) : (
        book.outline.map(ch => (
          <SidebarRow
            key={ch.id}
            label={`${ch.number}. ${ch.title}`}
            sub={ch.wordCount > 0 ? t.wordCount(ch.wordCount) : undefined}
            dot={STATUS_DOT[ch.status] ?? STATUS_DOT.pending}
            dotBlink={ch.status === 'writing'}
            active={active?.id === ch.id}
            onClick={() => setActiveChapter(ch.id)}
          />
        ))
      )}
    </div>
  )
}

interface RowProps {
  label: string
  sub?: string
  icon?: React.ReactNode
  dot?: string
  dotBlink?: boolean
  active: boolean
  onClick: () => void
}

function SidebarRow({ label, sub, icon, dot, dotBlink, active, onClick }: RowProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '7px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 9,
        background: active ? '#e9e8e4' : 'transparent',
        borderRight: `2px solid ${active ? '#37352f' : 'transparent'}`,
        cursor: 'pointer', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#efefed' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {icon && <span style={{ marginTop: 2, flexShrink: 0 }}>{icon}</span>}
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%', marginTop: 5, flexShrink: 0,
          background: dot,
          ...(dotBlink ? { animation: 'blink 1s infinite' } : {}),
        }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: active ? 500 : 400, color: active ? '#37352f' : '#9b9a97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.1s' }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 10.5, color: '#c7c6c2', marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  )
}
