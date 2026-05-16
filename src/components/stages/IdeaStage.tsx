import { useState, useRef } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { useBookStore } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { streamCompletion } from '@/services/ai/gateway'
import { SYSTEM_BOOK_AUTHOR, promptExpandIdea } from '@/services/ai/prompts'
import type { BookIdea, BookGenre } from '@/types/book'

const GENRES: { value: BookGenre; label: string }[] = [
  { value: 'fiction', label: '小说' },
  { value: 'non-fiction', label: '非虚构' },
  { value: 'sci-fi', label: '科幻' },
  { value: 'fantasy', label: '奇幻' },
  { value: 'mystery', label: '悬疑' },
  { value: 'romance', label: '言情' },
  { value: 'thriller', label: '惊悚' },
  { value: 'biography', label: '传记' },
  { value: 'self-help', label: '自助' },
  { value: 'technical', label: '技术' },
  { value: 'children', label: '儿童' },
  { value: 'history', label: '历史' },
  { value: 'business', label: '商业' },
  { value: 'other', label: '其他' },
]

export function IdeaStage() {
  const { book, updateIdea, updateMetadata, setOutline } = useBookStore()
  const { aiConfig } = useSettingsStore()
  const [rawIdea, setRawIdea] = useState('')
  const [isExpanding, setIsExpanding] = useState(false)
  const [streamText, setStreamText] = useState('')
  const abortRef = useRef<AbortController | undefined>(undefined)

  const handleExpandIdea = async () => {
    if (!rawIdea.trim()) return
    if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
      alert('请先在设置中配置 AI API Key')
      return
    }
    setIsExpanding(true)
    setStreamText('')
    abortRef.current = new AbortController()
    let full = ''
    try {
      await streamCompletion(
        aiConfig,
        SYSTEM_BOOK_AUTHOR,
        promptExpandIdea(rawIdea),
        ({ text, done }) => {
          if (!done) {
            full += text
            setStreamText(full)
          }
        },
        abortRef.current.signal
      )
      // Parse JSON from response
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const idea: BookIdea = JSON.parse(cleaned)
      updateIdea(idea)
      setStreamText('')
    } catch (e) {
      console.error('Idea expansion failed:', e)
      setStreamText('AI 扩展失败，请检查 API Key 配置后重试。')
    } finally {
      setIsExpanding(false)
    }
  }

  const { idea, metadata } = book

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* AI Idea Expander */}
        <section className="card">
          <h2 className="section-title">
            <Sparkles size={16} className="text-brand-500" />
            AI 创意扩展
          </h2>
          <p className="text-sm text-white/50 mb-4">
            输入你的书籍想法，AI 将帮你完善标题、简介、受众等核心信息
          </p>
          <textarea
            value={rawIdea}
            onChange={(e) => setRawIdea(e.target.value)}
            placeholder="例如：一个关于人工智能觉醒后与人类共存的近未来科幻故事，探讨意识与自由意志..."
            className="input-field h-28 resize-none"
          />
          {streamText && (
            <div className="mt-3 p-3 bg-white/5 rounded-lg text-sm text-white/70 font-mono max-h-32 overflow-y-auto">
              {streamText}
            </div>
          )}
          <button
            onClick={handleExpandIdea}
            disabled={isExpanding || !rawIdea.trim()}
            className="btn-primary mt-3 flex items-center gap-2"
          >
            {isExpanding ? (
              <><Loader2 size={15} className="animate-spin" />AI 扩展中...</>
            ) : (
              <><Sparkles size={15} />AI 扩展创意</>
            )}
          </button>
        </section>

        {/* Book Info Form */}
        <section className="card space-y-5">
          <h2 className="section-title">
            <RefreshCw size={16} className="text-brand-500" />
            书籍基本信息
          </h2>

          <div>
            <label className="form-label">书名</label>
            <input
              value={idea.title}
              onChange={(e) => updateIdea({ title: e.target.value })}
              placeholder="书籍标题"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">类型</label>
              <select
                value={idea.genre}
                onChange={(e) => updateIdea({ genre: e.target.value as BookGenre })}
                className="input-field"
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">预计页数</label>
              <input
                type="number"
                value={idea.estimatedLength}
                onChange={(e) => updateIdea({ estimatedLength: Number(e.target.value) })}
                className="input-field"
                min={10}
                max={1000}
              />
            </div>
          </div>

          <div>
            <label className="form-label">目标读者</label>
            <input
              value={idea.targetAudience}
              onChange={(e) => updateIdea({ targetAudience: e.target.value })}
              placeholder="例如：18-35岁科技爱好者，有一定哲学思考兴趣"
              className="input-field"
            />
          </div>

          <div>
            <label className="form-label">简介</label>
            <textarea
              value={idea.synopsis}
              onChange={(e) => updateIdea({ synopsis: e.target.value })}
              placeholder="书籍简介..."
              className="input-field h-28 resize-none"
            />
          </div>

          <div>
            <label className="form-label">核心主题（逗号分隔）</label>
            <input
              value={idea.keyThemes.join(', ')}
              onChange={(e) => updateIdea({ keyThemes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              placeholder="例如：自由意志, 人机关系, 未来社会"
              className="input-field"
            />
          </div>

          <div>
            <label className="form-label">写作风格/基调</label>
            <input
              value={idea.toneStyle}
              onChange={(e) => updateIdea({ toneStyle: e.target.value })}
              placeholder="例如：深沉哲理，偶有幽默，科技感强"
              className="input-field"
            />
          </div>
        </section>

        {/* Metadata */}
        <section className="card space-y-4">
          <h2 className="section-title">作者信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">作者</label>
              <input
                value={metadata.author}
                onChange={(e) => updateMetadata({ author: e.target.value })}
                placeholder="作者姓名"
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">语言</label>
              <select
                value={metadata.language}
                onChange={(e) => updateMetadata({ language: e.target.value })}
                className="input-field"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">献词</label>
            <input
              value={metadata.dedication ?? ''}
              onChange={(e) => updateMetadata({ dedication: e.target.value })}
              placeholder="献给..."
              className="input-field"
            />
          </div>
        </section>
      </div>
    </div>
  )
}
