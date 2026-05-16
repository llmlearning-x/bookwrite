import { useState, useRef, useCallback } from 'react'
import { Sparkles, Loader2, Wand2, ChevronDown } from 'lucide-react'
import { useBookStore, useActiveChapter } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { streamCompletion } from '@/services/ai/gateway'
import {
  SYSTEM_BOOK_AUTHOR,
  SYSTEM_BOOK_EDITOR,
  promptWriteChapter,
  promptEditContent,
  buildBookContext,
} from '@/services/ai/prompts'
import type { EditMode } from '@/types/ai'
import { RichEditor } from '@/components/editor/RichEditor'

const EDIT_MODES: { value: EditMode; label: string; desc: string }[] = [
  { value: 'polish', label: '润色', desc: '提升语言质量' },
  { value: 'expand', label: '扩写', desc: '增加细节和描述' },
  { value: 'condense', label: '缩写', desc: '精简内容' },
  { value: 'rewrite', label: '重写', desc: '改写段落' },
  { value: 'tone-formal', label: '正式', desc: '正式书面风格' },
  { value: 'tone-casual', label: '轻松', desc: '口语化风格' },
  { value: 'proofread', label: '校对', desc: '纠错修正' },
]

export function WritingStage() {
  const { book, updateChapter, setActiveChapter } = useBookStore()
  const activeChapter = useActiveChapter()
  const { aiConfig } = useSettingsStore()

  const [isWriting, setIsWriting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedMode, setSelectedMode] = useState<EditMode>('polish')
  const [showEditPanel, setShowEditPanel] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const abortRef = useRef<AbortController | undefined>(undefined)

  const handleWriteChapter = async () => {
    if (!activeChapter) return
    if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
      alert('请先配置 AI API Key')
      return
    }
    setIsWriting(true)
    setStreamBuffer('')
    abortRef.current = new AbortController()
    const chapterIndex = book.outline.findIndex((c) => c.id === activeChapter.id)
    const prevChapter = chapterIndex > 0 ? book.outline[chapterIndex - 1] : undefined
    updateChapter(activeChapter.id, { status: 'writing' })
    let full = ''
    try {
      await streamCompletion(
        aiConfig,
        SYSTEM_BOOK_AUTHOR,
        promptWriteChapter(book, activeChapter, prevChapter?.summary),
        ({ text, done }) => {
          if (!done) {
            full += text
            setStreamBuffer(full)
          }
        },
        abortRef.current.signal
      )
      const wordCount = full.replace(/\s/g, '').length
      updateChapter(activeChapter.id, { content: full, wordCount, status: 'draft' })
      setStreamBuffer('')
    } catch (e) {
      console.error('Writing failed:', e)
      alert('章节写作失败')
    } finally {
      setIsWriting(false)
    }
  }

  const handleEditContent = async () => {
    if (!activeChapter?.content) return
    setIsEditing(true)
    abortRef.current = new AbortController()
    let full = ''
    const bookCtx = buildBookContext(book)
    try {
      await streamCompletion(
        aiConfig,
        SYSTEM_BOOK_EDITOR,
        promptEditContent(activeChapter.content, selectedMode, bookCtx),
        ({ text, done }) => { if (!done) full += text },
        abortRef.current.signal
      )
      updateChapter(activeChapter.id, {
        content: full,
        wordCount: full.replace(/\s/g, '').length,
        status: 'revised',
      })
    } catch (e) {
      console.error('Edit failed:', e)
    } finally {
      setIsEditing(false)
    }
  }

  const handleContentChange = useCallback((content: string) => {
    if (!activeChapter) return
    updateChapter(activeChapter.id, {
      content,
      wordCount: content.replace(/\s/g, '').length,
    })
  }, [activeChapter, updateChapter])

  return (
    <div className="h-full flex">
      {/* Chapter List sidebar */}
      <div className="w-56 bg-surface-900 border-r border-white/5 flex flex-col">
        <div className="px-3 py-3 text-xs text-white/40 font-medium uppercase tracking-wider border-b border-white/5">
          章节
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {book.outline.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapter(chapter.id)}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                activeChapter?.id === chapter.id
                  ? 'bg-brand-500/10 text-brand-400 border-r-2 border-brand-500'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="text-xs text-white/30 mb-0.5">第 {chapter.number} 章</div>
              <div className="truncate">{chapter.title}</div>
              {chapter.wordCount > 0 && (
                <div className="text-[10px] text-white/30 mt-0.5">{chapter.wordCount} 字</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeChapter ? (
          <div className="flex-1 flex items-center justify-center text-white/30">
            <div className="text-center space-y-2">
              <Sparkles size={48} className="mx-auto opacity-20" />
              <p>从左侧选择章节开始写作</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chapter toolbar */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
              <div className="flex-1">
                <input
                  value={activeChapter.title}
                  onChange={(e) => updateChapter(activeChapter.id, { title: e.target.value })}
                  className="text-lg font-semibold bg-transparent outline-none w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWriteChapter}
                  disabled={isWriting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {isWriting ? (
                    <><Loader2 size={12} className="animate-spin" />写作中...</>
                  ) : (
                    <><Sparkles size={12} />AI 写章节</>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowEditPanel((s) => !s)}
                    disabled={!activeChapter.content || isEditing}
                    className="btn-secondary text-xs flex items-center gap-1.5"
                  >
                    <Wand2 size={12} />AI 编辑
                    <ChevronDown size={10} />
                  </button>
                  {showEditPanel && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-surface-800 border border-white/10 rounded-lg shadow-xl z-20 p-2 space-y-1 animate-fade-in">
                      {EDIT_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => { setSelectedMode(mode.value); setShowEditPanel(false); handleEditContent() }}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-white/5 text-sm transition-colors"
                        >
                          <span className="font-medium">{mode.label}</span>
                          <span className="text-white/40 ml-2 text-xs">{mode.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {activeChapter.wordCount > 0 && (
                  <span className="text-xs text-white/30">{activeChapter.wordCount} 字</span>
                )}
              </div>
            </div>

            {/* Editor / Stream view */}
            {isWriting && streamBuffer ? (
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="max-w-3xl mx-auto prose prose-invert text-white/80 text-base leading-8 whitespace-pre-wrap font-serif">
                  {streamBuffer}
                  <span className="animate-pulse">▋</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <RichEditor
                  content={activeChapter.content}
                  onChange={handleContentChange}
                  placeholder={`第 ${activeChapter.number} 章：${activeChapter.title}\n\n点击「AI 写章节」自动生成，或直接手动写作...`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
