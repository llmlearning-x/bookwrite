import { useState, useRef } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronRight, GripVertical, Plus, Trash2, ArrowRight } from 'lucide-react'
import { useBookStore } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { streamCompletion } from '@/services/ai/gateway'
import { SYSTEM_BOOK_AUTHOR, promptGenerateOutline } from '@/services/ai/prompts'
import type { Chapter } from '@/types/book'

interface Props {
  onGoToWriting: () => void
}

export function OutlineStage({ onGoToWriting }: Props) {
  const { book, setOutline, updateChapter, setActiveChapter } = useBookStore()
  const { aiConfig } = useSettingsStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const abortRef = useRef<AbortController | undefined>(undefined)

  const toggleExpand = (id: string) =>
    setExpandedIds((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const handleGenerate = async () => {
    if (!book.idea.title || !book.idea.synopsis) {
      alert('请先在创意阶段填写书名和简介')
      return
    }
    if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
      alert('请先在设置中配置 AI API Key')
      return
    }
    setIsGenerating(true)
    abortRef.current = new AbortController()
    let full = ''
    try {
      await streamCompletion(
        aiConfig,
        SYSTEM_BOOK_AUTHOR,
        promptGenerateOutline(book.idea),
        ({ text, done }) => { if (!done) full += text },
        abortRef.current.signal
      )
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const rawChapters = JSON.parse(cleaned)
      const chapters: Chapter[] = rawChapters.map((c: Chapter & { sections?: Array<{ title: string; summary: string }> }) => ({
        id: crypto.randomUUID(),
        number: c.number,
        title: c.title,
        summary: c.summary,
        sections: (c.sections ?? []).map((s) => ({
          id: crypto.randomUUID(),
          title: s.title,
          summary: s.summary,
          content: '',
          wordCount: 0,
          status: 'pending' as const,
        })),
        content: '',
        wordCount: 0,
        status: 'pending' as const,
      }))
      setOutline(chapters)
    } catch (e) {
      console.error('Outline generation failed:', e)
      alert('大纲生成失败，请检查 API 配置')
    } finally {
      setIsGenerating(false)
    }
  }

  const addChapter = () => {
    const num = book.outline.length + 1
    const chapter: Chapter = {
      id: crypto.randomUUID(),
      number: num,
      title: `第${num}章`,
      summary: '',
      sections: [],
      content: '',
      wordCount: 0,
      status: 'pending',
    }
    setOutline([...book.outline, chapter])
  }

  const removeChapter = (id: string) => {
    setOutline(book.outline.filter((c) => c.id !== id))
  }

  const handleStartWriting = (chapterId: string) => {
    setActiveChapter(chapterId)
    onGoToWriting()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="btn-primary flex items-center gap-2"
        >
          {isGenerating ? (
            <><Loader2 size={14} className="animate-spin" />生成大纲中...</>
          ) : (
            <><Sparkles size={14} />AI 生成大纲</>
          )}
        </button>
        <button onClick={addChapter} className="btn-secondary flex items-center gap-2">
          <Plus size={14} />添加章节
        </button>
        <div className="flex-1" />
        <span className="text-xs text-white/40">{book.outline.length} 章</span>
      </div>

      {/* Outline list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {book.outline.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-white/30 gap-3">
            <Sparkles size={40} className="opacity-30" />
            <p className="text-sm">还没有大纲，点击「AI 生成大纲」自动创建</p>
          </div>
        )}
        {book.outline.map((chapter) => (
          <div key={chapter.id} className="card group">
            <div className="flex items-start gap-2">
              <GripVertical size={16} className="text-white/20 mt-1 cursor-grab flex-shrink-0" />
              <button
                onClick={() => toggleExpand(chapter.id)}
                className="mt-1 text-white/40 flex-shrink-0"
              >
                {expandedIds.has(chapter.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/30 flex-shrink-0">第 {chapter.number} 章</span>
                  <input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-medium text-white outline-none border-b border-transparent hover:border-white/20 focus:border-brand-500 transition-colors"
                  />
                  <StatusChip status={chapter.status} />
                </div>
                {expandedIds.has(chapter.id) && (
                  <div className="mt-3 space-y-3 pl-2">
                    <textarea
                      value={chapter.summary}
                      onChange={(e) => updateChapter(chapter.id, { summary: e.target.value })}
                      placeholder="章节摘要..."
                      className="input-field text-xs h-16 resize-none"
                    />
                    {chapter.sections.length > 0 && (
                      <div className="space-y-1 pl-2 border-l border-white/10">
                        {chapter.sections.map((sec) => (
                          <div key={sec.id} className="text-xs text-white/50">
                            <span className="text-white/70">{sec.title}</span>
                            {sec.summary && <span className="ml-2">— {sec.summary}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleStartWriting(chapter.id)}
                      className="btn-ghost text-xs flex items-center gap-1"
                    >
                      <ArrowRight size={12} />开始写作这章
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeChapter(chapter.id)}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: Chapter['status'] }) {
  const map: Record<string, string> = {
    pending: 'text-white/30',
    writing: 'text-blue-400',
    draft: 'text-amber-400',
    revised: 'text-green-400',
  }
  const labels: Record<string, string> = {
    pending: '待写', writing: '写作中', draft: '草稿', revised: '已修订',
  }
  return (
    <span className={`text-[10px] ${map[status] ?? ''}`}>{labels[status] ?? status}</span>
  )
}
