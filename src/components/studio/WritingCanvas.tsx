import { useState, useEffect } from 'react'
import { useBookStore, useActiveChapter } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useAgentStore } from '@/stores/agentStore'
import { RichEditor } from '@/components/editor/RichEditor'
import { PixelWriterScene, PixelBook } from './PixelArt'
import { getT } from '@/i18n'

let _push: ((id: string, text: string) => void) | null = null
export function setCanvasStream(id: string, text: string) { _push?.(id, text) }

const FONTS: Record<string, string> = {
  sans:  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'Georgia, "Noto Serif SC", "Songti SC", "SimSun", serif',
  mono:  '"JetBrains Mono", "Fira Code", monospace',
}

export function WritingCanvas() {
  const { book, updateChapter } = useBookStore()
  const activeChapter = useActiveChapter()
  const { editorFont, editorFontSize, locale } = useSettingsStore()
  const { activeSkills } = useAgentStore()
  const [stream, setStream] = useState<{ id: string; text: string } | null>(null)

  useEffect(() => {
    _push = (id, text) => setStream({ id, text })
    return () => { _push = null }
  }, [])

  const t = getT(locale)
  const isStreaming = !!(stream && activeChapter && stream.id === activeChapter.id)
  const font = FONTS[editorFont] ?? FONTS.serif
  const running = activeSkills.find(s => s.status === 'running')

  const STATUS_LABEL: Record<string, { text: string; color: string }> = {
    pending: { text: t.statusPending, color: '#b5b4b0' },
    writing: { text: t.statusWriting, color: '#37352f' },
    draft:   { text: t.statusDraft,   color: '#37352f' },
    revised: { text: t.statusRevised, color: '#37352f' },
  }
  const st = activeChapter ? (STATUS_LABEL[activeChapter.status] ?? STATUS_LABEL.pending) : null

  /* ── Welcome / empty ── */
  if (!book.idea.title && book.outline.length === 0) {
    return (
      <div className="canvas-empty">
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <PixelWriterScene />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#191919', marginBottom: 8, letterSpacing: '-0.01em' }}>
            {t.startWriting}
          </h2>
          <p style={{ fontSize: 14, color: '#9b9a97', lineHeight: 1.8, marginBottom: 24, whiteSpace: 'pre-line' }}>
            {t.startWritingDesc}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {t.examplePrompts.map((s: string) => (
              <span key={s} style={{ fontSize: 12.5, padding: '5px 14px', background: '#f7f7f5', border: '1px solid rgba(55,53,47,0.12)', color: '#787672' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ── Cover / overview ── */
  if (!activeChapter) {
    return (
      <div className="canvas-editor" style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 600, width: '100%', padding: '60px 56px 80px', fontFamily: font }}>

          {/* Cover art */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
            {book.visuals.coverImage ? (
              <img src={book.visuals.coverImage} alt="cover"
                style={{ width: 160, border: '1px solid rgba(55,53,47,0.12)' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <PixelBook size={100} />
                <span style={{ fontSize: 10.5, color: '#c7c6c2', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {t.noCoverYet}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 30, fontWeight: 800, textAlign: 'center', color: '#191919', marginBottom: 4, letterSpacing: '-0.025em', lineHeight: 1.25 }}>
            {book.idea.title || t.untitledBook}
          </h1>
          {book.metadata.author && (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#9b9a97', marginBottom: 4 }}>
              {book.metadata.author}
            </p>
          )}
          {book.idea.genre && (
            <p style={{ textAlign: 'center', fontSize: 11.5, color: '#b5b4b0', marginBottom: 36, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {book.idea.genre}
            </p>
          )}

          {/* Synopsis */}
          {book.idea.synopsis && (
            <p style={{ fontSize: 14, lineHeight: 1.85, color: '#6f6e69', borderLeft: '2px solid #e9e9e7', paddingLeft: 16, marginBottom: 40, fontStyle: 'italic' }}>
              {book.idea.synopsis}
            </p>
          )}

          {/* Table of contents */}
          {book.outline.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#b5b4b0', marginBottom: 12 }}>
                {t.contents}
              </div>
              {book.outline.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'baseline', gap: 0, padding: '7px 0', borderBottom: '1px solid rgba(55,53,47,0.05)' }}>
                  <span style={{ fontSize: 11.5, color: '#c7c6c2', width: 28, flexShrink: 0 }}>{c.number}</span>
                  <span style={{ fontSize: 13.5, color: c.content ? '#37352f' : '#9b9a97', flex: 1 }}>{c.title}</span>
                  <span style={{ fontSize: 11, color: '#c7c6c2', flexShrink: 0 }}>
                    {c.wordCount > 0 ? t.wordCountInline(c.wordCount) : t.wordCountDash}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  /* ── Chapter writing ── */
  return (
    <div className="canvas-content">
      {/* Chapter header bar */}
      <div className="canvas-chapter-header">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#c7c6c2', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {t.chapterPrefix(activeChapter.number)}
          </span>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#37352f', margin: 0 }}>
            {activeChapter.title}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {isStreaming && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: '#37352f', fontWeight: 500 }}>
              <span style={{ width: 5, height: 5, background: '#37352f', animation: 'blink 0.8s infinite' }} />
              {t.writing}
            </span>
          )}
          {!isStreaming && running && (
            <span style={{ fontSize: 11.5, color: '#9b9a97' }}>{running.label}</span>
          )}
          {activeChapter.wordCount > 0 && (
            <span style={{ fontSize: 12, color: '#b5b4b0' }}>
              {t.wordCount(activeChapter.wordCount)}
            </span>
          )}
          {st && (
            <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', background: '#f7f7f5', border: '1px solid rgba(55,53,47,0.1)', color: st.color }}>
              {st.text}
            </span>
          )}
        </div>
      </div>

      {/* Writing area */}
      <div className="canvas-editor">
        {isStreaming ? (
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 56px 100px', fontFamily: font, fontSize: editorFontSize, lineHeight: 1.85, color: '#37352f', whiteSpace: 'pre-wrap' }}>
            {stream!.text}
            <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#37352f', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 0.9s infinite' }} />
          </div>
        ) : (
          <RichEditor
            content={activeChapter.content}
            onChange={text => updateChapter(activeChapter.id, { content: text, wordCount: text.replace(/\s/g, '').length })}
            placeholder={t.chapterPlaceholder(activeChapter.number, activeChapter.title)}
          />
        )}
      </div>
    </div>
  )
}
