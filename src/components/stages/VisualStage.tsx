import { useState, useRef } from 'react'
import { Image, Sparkles, Loader2, Download, Wand2 } from 'lucide-react'
import { useBookStore } from '@/stores/bookStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { streamCompletion, generateImage } from '@/services/ai/gateway'
import { SYSTEM_BOOK_AUTHOR, promptGenerateCoverPrompt } from '@/services/ai/prompts'

export function VisualStage() {
  const { book, updateVisuals } = useBookStore()
  const { aiConfig } = useSettingsStore()
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [coverPromptText, setCoverPromptText] = useState(book.visuals.coverPrompt ?? '')
  const [illusPrompt, setIllusPrompt] = useState('')
  const [illusCaption, setIllusCaption] = useState('')
  const abortRef = useRef<AbortController | undefined>(undefined)

  const hasImageProvider = !!aiConfig.imageApiKey || (aiConfig.provider === 'openai' && !!aiConfig.apiKey)

  const handleGenerateCoverPrompt = async () => {
    setIsGeneratingPrompt(true)
    let full = ''
    abortRef.current = new AbortController()
    try {
      await streamCompletion(
        aiConfig,
        SYSTEM_BOOK_AUTHOR,
        promptGenerateCoverPrompt(book.idea),
        ({ text, done }) => { if (!done) full += text },
        abortRef.current.signal
      )
      const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const data = JSON.parse(cleaned)
      setCoverPromptText(data.imagePrompt)
      updateVisuals({ coverPrompt: data.imagePrompt })
    } catch (e) {
      console.error(e)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleGenerateCoverImage = async () => {
    if (!coverPromptText) return
    setIsGeneratingImage(true)
    try {
      const image = await generateImage(aiConfig, coverPromptText)
      updateVisuals({ coverImage: image })
    } catch (e) {
      console.error(e)
      alert('图片生成失败。请确保已配置图片 API Key（OpenAI gpt-image-1）')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleGenerateIllustration = async () => {
    if (!illusPrompt) return
    setIsGeneratingImage(true)
    try {
      const image = await generateImage(aiConfig, illusPrompt)
      const illustration = {
        id: crypto.randomUUID(),
        prompt: illusPrompt,
        image,
        caption: illusCaption,
      }
      updateVisuals({
        illustrations: [...book.visuals.illustrations, illustration],
      })
      setIllusPrompt('')
      setIllusCaption('')
    } catch (e) {
      console.error(e)
      alert('配图生成失败')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const downloadImage = (dataUrl: string, name: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = name
    a.click()
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Cover */}
        <section className="card">
          <h2 className="section-title">
            <Image size={16} className="text-brand-500" />
            书籍封面
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Cover preview */}
            <div className="aspect-[3/4] bg-surface-800 rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
              {book.visuals.coverImage ? (
                <img src={book.visuals.coverImage} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-white/20 space-y-2">
                  <Image size={48} className="mx-auto" />
                  <p className="text-xs">封面预览</p>
                </div>
              )}
            </div>

            {/* Cover controls */}
            <div className="space-y-4">
              <div>
                <label className="form-label">封面提示词</label>
                <textarea
                  value={coverPromptText}
                  onChange={(e) => setCoverPromptText(e.target.value)}
                  placeholder="描述封面设计..."
                  className="input-field h-32 resize-none"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleGenerateCoverPrompt}
                  disabled={isGeneratingPrompt}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  {isGeneratingPrompt ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI 生成提示词
                </button>
                <button
                  onClick={handleGenerateCoverImage}
                  disabled={isGeneratingImage || !coverPromptText || !hasImageProvider}
                  className="btn-primary text-xs flex items-center gap-1.5"
                  title={!hasImageProvider ? '需要配置图片 API Key' : ''}
                >
                  {isGeneratingImage ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  生成封面图
                </button>
                {book.visuals.coverImage && (
                  <button
                    onClick={() => downloadImage(book.visuals.coverImage!, 'cover.png')}
                    className="btn-ghost text-xs flex items-center gap-1.5"
                  >
                    <Download size={12} />下载
                  </button>
                )}
              </div>
              {!hasImageProvider && (
                <p className="text-xs text-amber-400/70">
                  提示：图片生成需要配置 OpenAI API Key（用于 gpt-image-1）
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Illustrations */}
        <section className="card">
          <h2 className="section-title">
            <Wand2 size={16} className="text-brand-500" />
            内页配图
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">配图提示词</label>
                <textarea
                  value={illusPrompt}
                  onChange={(e) => setIllusPrompt(e.target.value)}
                  placeholder="描述你想要的配图内容..."
                  className="input-field h-24 resize-none"
                />
              </div>
              <div>
                <label className="form-label">图片说明文字</label>
                <input
                  value={illusCaption}
                  onChange={(e) => setIllusCaption(e.target.value)}
                  placeholder="图片说明（可选）"
                  className="input-field"
                />
                <button
                  onClick={handleGenerateIllustration}
                  disabled={isGeneratingImage || !illusPrompt || !hasImageProvider}
                  className="btn-primary text-xs mt-3 flex items-center gap-1.5"
                >
                  {isGeneratingImage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  生成配图
                </button>
              </div>
            </div>

            {/* Gallery */}
            {book.visuals.illustrations.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {book.visuals.illustrations.map((illus) => (
                  <div key={illus.id} className="group relative">
                    <div className="aspect-square bg-surface-800 rounded-lg overflow-hidden">
                      <img src={illus.image} alt={illus.caption} className="w-full h-full object-cover" />
                    </div>
                    {illus.caption && (
                      <p className="text-xs text-white/50 mt-1 text-center">{illus.caption}</p>
                    )}
                    <button
                      onClick={() => downloadImage(illus.image, `illustration-${illus.id}.png`)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 p-1 rounded transition-opacity"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
